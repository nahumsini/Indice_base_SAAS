package com.indice.erp.workspace;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.tenant.*;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

class WorkbarPreferencesControllerTest {
    @Test void sessionAuthorityAndCsrfProtectEveryNavigationPreferenceOperation() {
        var tenants = mock(TenantContextResolver.class);
        var states = mock(UserWorkspaceStateService.class);
        var csrf = new SessionCsrfService();
        var controller = new UserWorkspaceStateApiController(tenants, csrf, states);
        var session = new MockHttpSession();
        var token = csrf.ensureCsrf(session);
        var request = new UserWorkspaceStateApiController.WorkspaceStateRequest(
            new ObjectMapper().createObjectNode().put("position", "left").put("dualScreenEnabled", true), 1);
        when(tenants.resolve(session)).thenReturn(Optional.empty());
        assertThat(controller.get(session, "system", "workbar-layout", null, "22:11").getStatusCode().value()).isEqualTo(401);
        when(tenants.resolve(session)).thenReturn(Optional.of(new TenantContext(11, 22, 33L, "user", new TenantScope("all", null, null))));
        for (String actor : new String[]{"999:11", "22:999", "", "22:11:999"}) {
            assertThat(controller.get(session, "system", "workbar-layout", null, actor).getStatusCode().value()).isEqualTo(409);
            assertThat(controller.save(session, token, "system", "workbar-layout", null, actor, request).getStatusCode().value()).isEqualTo(409);
            assertThat(controller.delete(session, token, "system", "workbar-layout", null, actor).getStatusCode().value()).isEqualTo(409);
        }
        assertThat(controller.get(session, "system", "workbar-layout", null, null).getStatusCode().value()).isEqualTo(409);
        assertThat(controller.get(session, "SYSTEM", "WORKBAR-LAYOUT", null, "999:11").getStatusCode().value()).isEqualTo(409);
        assertThat(controller.save(session, null, "system", "workbar-layout", null, "22:11", request).getStatusCode().value()).isEqualTo(403);
        assertThat(controller.delete(session, null, "system", "workbar-layout", null, "22:11").getStatusCode().value()).isEqualTo(403);
        verifyNoInteractions(states);
        assertThat(controller.get(session, "system", "workbar-layout", null, "22:11").getStatusCode().value()).isEqualTo(200);
        assertThat(controller.save(session, token, "system", "workbar-layout", null, "22:11", request).getStatusCode().value()).isEqualTo(200);
        assertThat(controller.delete(session, token, "system", "workbar-layout", null, "22:11").getStatusCode().value()).isEqualTo(200);
        verify(states).get(22, 11, "system", "workbar-layout");
        verify(states).save(22, 11, "system", "workbar-layout", request.state(), 1);
        verify(states).delete(22, 11, "system", "workbar-layout");
    }
}
