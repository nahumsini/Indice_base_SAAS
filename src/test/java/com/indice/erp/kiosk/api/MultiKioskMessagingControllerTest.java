package com.indice.erp.kiosk.api;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.kiosk.engine.*;
import com.indice.erp.messaging.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import static com.indice.erp.messaging.MessagingContracts.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class MultiKioskMessagingControllerTest {
    final KioskEngineFeatureFlags flags = mock(KioskEngineFeatureFlags.class);
    final SessionCsrfService csrf = mock(SessionCsrfService.class);
    final MultiKioskService kiosks = mock(MultiKioskService.class);
    final MessagingAccess access = mock(MessagingAccess.class);
    final MessagingService service = mock(MessagingService.class);
    final MessagingAttachmentService photos = mock(MessagingAttachmentService.class);
    final MessagingTaskService tasks = mock(MessagingTaskService.class);
    final KioskMultiDashboardService dashboard = mock(KioskMultiDashboardService.class);
    final AuthSessionUser employee = new AuthSessionUser(12L, 7L, 18L, "Employee", "member");
    final Actor actor = new Actor(12, 7, 18L, "MEMBER");
    final MockHttpSession browser = new MockHttpSession();
    MultiKioskMessagingController controller;

    @BeforeEach void setup() {
        when(flags.registryEnabled()).thenReturn(true); when(flags.sessionsEnabled()).thenReturn(true);
        when(flags.auditEnabled()).thenReturn(true); when(flags.multiDashboardEnabled()).thenReturn(true);
        controller = new MultiKioskMessagingController(flags, csrf, kiosks, access, service, photos, new KioskV2ResponseFactory(), tasks, dashboard);
    }
    MockHttpServletRequest request(String method, String path) {
        var request = new MockHttpServletRequest(method, "/api/v2/multi-kiosks/public/link/messaging" + path);
        request.setSession(browser); request.addHeader("X-Multi-Kiosk-Session-Token", "pin-session");
        request.addHeader("X-CSRF-Token", "csrf"); return request;
    }
    void identity(boolean activity) {
        when(kiosks.requireEmployeeSession("link", "pin-session", browser.getId(), activity)).thenReturn(employee);
        when(access.memberActor(employee)).thenReturn(actor);
    }
    @Test void readsUseThePinActorAndNeverExtendItsIdleWindow() {
        identity(false);
        controller.list(request("GET", "/conversations"), "link", "ALL", "", 0);
        verify(service).list(actor, "ALL", "", 0);
        verify(kiosks).requireEmployeeSession("link", "pin-session", browser.getId(), false);
        verifyNoInteractions(csrf);
    }
    @Test void automaticReadReceiptsRequireCsrfButDoNotKeepSharedDevicesSignedIn() {
        identity(false);
        controller.read(request("POST", "/conversations/3/read"), "link", 3, new Read(22));
        verify(csrf).requireCsrf(browser, "csrf"); verify(service).read(actor, 3, new Read(22));
        verify(kiosks).requireEmployeeSession("link", "pin-session", browser.getId(), false);
    }
    @Test void sendsAreBoundToTheCurrentEmployeeAndOwnerIdempotencyContract() {
        identity(true);
        var body = new Send("hello", "PUBLIC", "same-retry-key");
        controller.send(request("POST", "/conversations/3/messages"), "link", 3, body);
        verify(csrf).requireCsrf(browser, "csrf"); verify(service).send(actor, 3, body);
    }
    @Test void wrongCsrfStopsBeforeIdentityAndDomainMutation() {
        doThrow(new IllegalArgumentException()).when(csrf).requireCsrf(browser, "csrf");
        assertThatThrownBy(() -> controller.send(request("POST", "/conversations/3/messages"), "link", 3,
            new Send("hello", "PUBLIC", "retry"))).isInstanceOf(KioskCsrfException.class);
        verifyNoInteractions(kiosks, access, service);
    }
    @Test void groupsUseTheSamePinBoundaryAndOwnerValidation() {
        identity(true);
        var body=new Create("GROUP",null,"",null,"","es-MX","Hello","key",java.util.List.of(20L,21L),"Team");
        controller.create(request("POST","/conversations"),"link",body);
        verify(csrf).requireCsrf(browser,"csrf");verify(service).create(actor,body);
    }
    @Test void taskShortcutRequiresTheComposedTaskCapabilityAndNeverUsesErpIdentity() {
        identity(false); identity(true);
        when(kiosks.employeeContext("link","pin-session",browser.getId())).thenReturn(new MultiKioskService.EmployeeContext(5,employee));
        var definition=new KioskResolvedDefinition(9,7,"PROCESS_TASKS","EMPLOYEE_TOOL",null,"TASKS","My tasks",KioskDefinitionStatus.ACTIVE,null,null,null,KioskAccessLevel.IDENTIFIED,null,null,false,1,1);
        when(dashboard.personalOverviewDefinition(employee,5,KioskEmployeeToolCatalogService.MY_TASKS_TOOL_KEY,"process-tasks.task.create@1")).thenReturn(definition);
        controller.taskContext(request("GET","/task-context"),"link");
        verify(tasks).context(actor,true,definition);
        var body=new MessagingTaskService.CreateTask("Follow up",null,"key");
        controller.task(request("POST","/conversations/3/tasks"),"link",3,body);
        verify(csrf).requireCsrf(browser,"csrf");verify(tasks).create(actor,3,body,true,definition);
    }
    @Test void photosUseTheSamePinActorAndNeverBypassOwnerVisibility() {
        identity(false); identity(true);
        var upload = new PhotoUpload("sample.png", "image/png", 100, "upload-key");
        controller.upload(request("POST", "/conversations/3/attachments"), "link", 3, upload);
        controller.photo(request("GET", "/conversations/3/attachments/photo"), "link", 3, "photo");
        verify(csrf).requireCsrf(browser, "csrf");
        verify(photos).presign(actor, 3, upload); verify(photos).download(actor, 3, "photo");
    }
    @Test void revokedPinOrProviderCannotFallbackToAnyErpSession() {
        when(kiosks.requireEmployeeSession("link", "pin-session", browser.getId(), false)).thenThrow(new SecurityException());
        assertThatThrownBy(() -> controller.context(request("GET", "/context"), "link")).isInstanceOf(SecurityException.class);
        verifyNoInteractions(access, service);
    }
    @Test void disabledEngineAndMissingBrowserFailClosed() {
        when(flags.auditEnabled()).thenReturn(false);
        assertThatThrownBy(() -> controller.context(request("GET", "/context"), "link")).isInstanceOf(KioskUnavailableException.class);
        when(flags.auditEnabled()).thenReturn(true);
        assertThatThrownBy(() -> controller.context(new MockHttpServletRequest("GET", "/context"), "link")).isInstanceOf(SecurityException.class);
        verifyNoInteractions(kiosks, access, service);
    }
    @Test void ownerDenialsKeepTheirStatusAndDoNotBecomeServerErrors() {
        assertThat(controller.messagingFailure(new ResponseStatusException(HttpStatus.NOT_FOUND)).getStatusCode().value()).isEqualTo(404);
        assertThat(controller.messagingFailure(new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS)).getStatusCode().value()).isEqualTo(429);
    }
}
