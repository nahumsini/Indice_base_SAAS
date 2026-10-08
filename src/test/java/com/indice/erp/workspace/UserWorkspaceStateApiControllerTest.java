package com.indice.erp.workspace;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.tenant.*;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

class UserWorkspaceStateApiControllerTest {
    @Test void newLearningPreferencesRejectConcurrentActorChangesWithoutChangingOtherWorkspaces() {
        var tenants=mock(TenantContextResolver.class);var states=mock(UserWorkspaceStateService.class);
        var csrf=new SessionCsrfService();var controller=new UserWorkspaceStateApiController(tenants,csrf,states);
        var session=new MockHttpSession();var token=csrf.ensureCsrf(session);
        when(tenants.resolve(session)).thenReturn(Optional.of(new TenantContext(11,22,33L,"user",new TenantScope("all",null,null))));
        var request=new UserWorkspaceStateApiController.WorkspaceStateRequest(new ObjectMapper().createObjectNode(),1);
        assertThat(controller.get(session,"system","learning-view-character","999:11").getStatusCode().value()).isEqualTo(409);
        assertThat(controller.save(session,token,"system","learning-view-character","999:11",request).getStatusCode().value()).isEqualTo(409);
        assertThat(controller.delete(session,token,"system","learning-view-character","999:11").getStatusCode().value()).isEqualTo(409);
        verifyNoInteractions(states);
        assertThat(controller.save(session,null,"system","learning-view-character","22:11",request).getStatusCode().value()).isEqualTo(403);
        assertThat(controller.save(session,null,"expenses","expenses-table",null,request).getStatusCode().value()).isEqualTo(400);
        assertThat(controller.get(session,"system","learning-view-character","22:11").getStatusCode().value()).isEqualTo(200);
        verify(states).get(22,11,"system","learning-view-character");
        assertThat(controller.get(session,"expenses","expenses-table",null).getStatusCode().value()).isEqualTo(200);
        verify(states).get(22,11,"expenses","expenses-table");
    }
}
