package com.indice.erp.processTasks.kiosk;

import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskExecutionChannels;
import com.indice.erp.kiosk.engine.KioskEmployeeToolCatalogService;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskOperationPolicy;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.kiosk.engine.KioskSessionPrincipal;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

@ExtendWith(MockitoExtension.class)
class ProcessTaskKioskAdapterTest {

    @Mock
    private ProcessTaskKioskService kioskService;

    private ProcessTaskKioskAdapter adapter;
    private KioskExecutionContext context;

    @BeforeEach
    void setUp() {
        adapter = new ProcessTaskKioskAdapter(kioskService);
        context = KioskExecutionContext.publicLink(ProcessTaskKioskCapabilities.OWNER_MODULE, "device-token");
    }

    @Test
    void publishesVersionedControlledCapabilities() {
        assertThat(adapter.ownerModule()).isEqualTo("PROCESS_TASKS");
        assertThat(adapter.capabilities())
            .hasSize(7)
            .allSatisfy(capability -> {
                assertThat(capability.version()).isEqualTo(1);
                assertThat(capability.ownerModule()).isEqualTo("PROCESS_TASKS");
                assertThat(capability.accessLevel()).isEqualTo(KioskAccessLevel.CONTROLLED);
                assertThat(capability.versionedKey()).endsWith("@1");
            });
        assertThat(ProcessTaskKioskCapabilities.require(ProcessTaskKioskCapabilities.TASKS_READ).operationPolicy())
            .isEqualTo(KioskOperationPolicy.INFORMATION_ONLY);
    }

    @Test
    void declaresTheEmployeeTabScopeAndExcludesPublicIdentityFromEmployeeCapabilities() {
        var definition = employeeDefinition();
        var identity = ProcessTaskKioskCapabilities.require(
            ProcessTaskKioskCapabilities.IDENTITY_VERIFY);
        var tasksRead = ProcessTaskKioskCapabilities.require(
            ProcessTaskKioskCapabilities.TASKS_READ);

        assertThat(adapter.employeeCenterTabPermissionKeys(definition))
            .containsExactly("processes.calendar");
        assertThat(adapter.employeeCapabilityTabPermissionKeys(definition, identity)).isEmpty();
        assertThat(adapter.employeeCapabilityTabPermissionKeys(definition, tasksRead))
            .containsExactly("processes.calendar");
    }

    @Test
    void nativeTaskToolIsSignedAndLimitedToReadAndComplete() {
        var nativeTool = nativeToolDefinition();
        var unsignedDefinition = new KioskResolvedDefinition(
            18L, 7L, ProcessTaskKioskCapabilities.OWNER_MODULE,
            KioskEmployeeToolCatalogService.MY_TASKS_KIOSK_TYPE, null,
            "USER-CREATED", "Unsafe", KioskDefinitionStatus.ACTIVE,
            null, null, null, KioskAccessLevel.CONTROLLED,
            null, "hint", false, 1, 1);

        assertThat(adapter.supportsEmployeeCenter(nativeTool)).isTrue();
        assertThat(adapter.supportsEmployeeCenter(unsignedDefinition)).isFalse();
        assertThat(adapter.capabilities(nativeTool))
            .extracting(capability -> capability.key())
            .containsExactlyInAnyOrder(
                ProcessTaskKioskCapabilities.TASKS_READ,
                ProcessTaskKioskCapabilities.TASK_COMPLETE);
    }

    @Test
    void delegatesBootstrapWithoutChangingPayload() {
        var response = Map.<String, Object>of("kiosk", Map.of("name", "Lobby"));
        given(kioskService.publicBootstrap("device-token")).willReturn(response);

        assertThat(adapter.bootstrap(context)).isSameAs(response);
    }

    @Test
    void delegatesIdentityAndTaskCollectionActions() {
        var payload = Map.<String, Object>of("identification_token", "id");
        given(kioskService.publicIdentify("device-token", payload)).willReturn(Map.of("identified", true));
        given(kioskService.publicTasks("device-token", payload)).willReturn(Map.of("items", java.util.List.of()));
        given(kioskService.publicCreateTask("device-token", payload)).willReturn(Map.of("id", 41));

        adapter.execute(context, KioskActionRequest.of(ProcessTaskKioskCapabilities.IDENTITY_VERIFY, payload));
        adapter.execute(context, KioskActionRequest.of(ProcessTaskKioskCapabilities.TASKS_READ, payload));
        adapter.execute(context, KioskActionRequest.of(ProcessTaskKioskCapabilities.TASK_CREATE, payload));

        then(kioskService).should().publicIdentify("device-token", payload);
        then(kioskService).should().publicTasks("device-token", payload);
        then(kioskService).should().publicCreateTask("device-token", payload);
    }

    @Test
    void delegatesTaskResourceActions() {
        var payload = Map.<String, Object>of("identification_token", "id");
        given(kioskService.publicCompleteTask("device-token", 41L, payload)).willReturn(Map.of("completed", true));
        given(kioskService.publicAssignTaskResponsible("device-token", 41L, payload)).willReturn(Map.of("assigned", true));
        given(kioskService.publicCreateAttachmentUpload("device-token", 41L, payload)).willReturn(Map.of("upload", true));
        given(kioskService.publicRegisterAttachment("device-token", 41L, payload)).willReturn(Map.of("attachment", true));

        adapter.execute(context, KioskActionRequest.forResource(ProcessTaskKioskCapabilities.TASK_COMPLETE, 41L, payload));
        adapter.execute(context, KioskActionRequest.forResource(ProcessTaskKioskCapabilities.TASK_RESPONSIBLE_ASSIGN, 41L, payload));
        adapter.execute(context, KioskActionRequest.forResource(ProcessTaskKioskCapabilities.TASK_ATTACHMENT_PRESIGN, 41L, payload));
        adapter.execute(context, KioskActionRequest.forResource(ProcessTaskKioskCapabilities.TASK_ATTACHMENT_REGISTER, 41L, payload));

        then(kioskService).should().publicCompleteTask("device-token", 41L, payload);
        then(kioskService).should().publicAssignTaskResponsible("device-token", 41L, payload);
        then(kioskService).should().publicCreateAttachmentUpload("device-token", 41L, payload);
        then(kioskService).should().publicRegisterAttachment("device-token", 41L, payload);
    }

    @Test
    void rejectsUnknownCapabilityAndInvalidContext() {
        assertThatThrownBy(() -> adapter.execute(context, KioskActionRequest.of("unknown", Map.of())))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Unsupported");

        var wrongContext = KioskExecutionContext.publicLink("PETTY_CASH", "device-token");
        assertThatThrownBy(() -> adapter.bootstrap(wrongContext))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("does not belong");
    }

    @Test
    void resourceCapabilitiesRequireAValidResourceId() {
        assertThatThrownBy(() -> adapter.execute(
            context,
            KioskActionRequest.of(ProcessTaskKioskCapabilities.TASK_COMPLETE, Map.of())
        ))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("resourceId");
    }

    @Test
    void acceptsAuthenticatedWebAndMobileMultiKioskEmployeeWorkspaces() {
        var bootstrap = Map.<String, Object>of("tasks", java.util.List.of());
        given(kioskService.employeeBootstrap(employeeDefinition(), 9L)).willReturn(bootstrap);

        assertThat(adapter.employeeBootstrap(employeeContext(
            KioskExecutionChannels.AUTHENTICATED_WEB))).isSameAs(bootstrap);
        assertThat(adapter.employeeBootstrap(employeeContext(
            KioskExecutionChannels.MOBILE_MULTI_KIOSK))).isSameAs(bootstrap);

        then(kioskService).should(org.mockito.Mockito.times(2))
            .employeeBootstrap(employeeDefinition(), 9L);
    }

    @Test
    void mobileMultiKioskActionUsesTheEmployeeServiceAndPublicLinkCannotUseIt() {
        var payload = Map.<String, Object>of("title", "Inspect equipment");
        var response = Map.<String, Object>of("id", 42L);
        given(kioskService.employeeCreateTask(employeeDefinition(), 9L, payload))
            .willReturn(response);

        assertThat(adapter.executeEmployee(
            employeeContext(KioskExecutionChannels.MOBILE_MULTI_KIOSK),
            KioskActionRequest.of(ProcessTaskKioskCapabilities.TASK_CREATE, payload)))
            .isSameAs(response);
        then(kioskService).should().employeeCreateTask(employeeDefinition(), 9L, payload);
        then(kioskService).shouldHaveNoMoreInteractions();

        assertThatThrownBy(() -> adapter.executeEmployee(
            context,
            KioskActionRequest.of(ProcessTaskKioskCapabilities.TASK_CREATE, payload)))
            .isInstanceOf(SecurityException.class)
            .hasMessageContaining("employee kiosk session");
    }

    private KioskResolvedDefinition employeeDefinition() {
        return new KioskResolvedDefinition(
            17L, 7L, ProcessTaskKioskCapabilities.OWNER_MODULE, "task_access", 31L,
            "TASKS", "Tasks", KioskDefinitionStatus.ACTIVE, 2L, 3L, null,
            KioskAccessLevel.CONTROLLED, null, "tokenhint", false, 1, 1);
    }

    private KioskResolvedDefinition nativeToolDefinition() {
        return new KioskResolvedDefinition(
            17L, 7L, ProcessTaskKioskCapabilities.OWNER_MODULE,
            KioskEmployeeToolCatalogService.MY_TASKS_KIOSK_TYPE, null,
            KioskEmployeeToolCatalogService.MY_TASKS_RESERVED_CODE,
            "Mis tareas", KioskDefinitionStatus.ACTIVE,
            null, null, null, KioskAccessLevel.CONTROLLED,
            null, "internal", false, 1, 1);
    }

    private KioskExecutionContext employeeContext(String channel) {
        var definition = employeeDefinition();
        var session = new KioskSessionPrincipal(
            "session-1", definition.id(), definition.companyId(), "USER", 9L,
            Set.of(ProcessTaskKioskCapabilities.TASKS_READ + "@1"),
            Instant.now().plusSeconds(600));
        return new KioskExecutionContext(
            definition.ownerModule(), channel, "definition:" + definition.id(),
            "internal", "employee-browser", definition, session);
    }
}
