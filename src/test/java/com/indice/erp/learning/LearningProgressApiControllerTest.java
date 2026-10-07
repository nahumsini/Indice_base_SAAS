package com.indice.erp.learning;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.*;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;
import java.util.Optional;

class LearningProgressApiControllerTest {
    @Test void sessionCsrfAndActorPreconditionGateEveryWrite() {
        var sessions=mock(SessionAuthService.class);var csrf=new SessionCsrfService();
        var learning=mock(LearningProgressService.class);var controller=new LearningProgressApiController(sessions,csrf,learning);
        var session=new MockHttpSession();var actor=new AuthSessionUser(11L,22L,33L,"Synthetic","user");
        var change=new LearningProgressContracts.Change("processes.calendar",2,"understood");
        when(sessions.currentUser(session)).thenReturn(Optional.empty());
        assertThat(controller.update(session,"22:11",null,change,"es-MX").getStatusCode().value()).isEqualTo(401);
        when(sessions.currentUser(session)).thenReturn(Optional.of(actor));
        assertThat(controller.update(session,"999:11",null,change,"es-MX").getStatusCode().value()).isEqualTo(409);
        assertThat(controller.update(session,"22:11",null,change,"es-MX").getStatusCode().value()).isEqualTo(403);
        verifyNoInteractions(learning);
        var token=csrf.ensureCsrf(session);
        assertThat(controller.update(session,"22:11",token,change,"es-MX").getStatusCode().value()).isEqualTo(200);
        verify(learning).update(actor,change,"es-MX");
        when(learning.get(actor,"es-MX")).thenThrow(new SecurityException());
        assertThat(controller.get(session,"22:11","es-MX").getStatusCode().value()).isEqualTo(403);
    }
    @Test void rejectsTenantAuthorityAndCallerDeclaredApplication() {
        var mapper=new ObjectMapper();
        assertThatThrownBy(()->mapper.readValue("{\"chapterId\":\"processes.calendar\",\"version\":2,\"operation\":\"understood\",\"companyId\":999}",LearningProgressContracts.Change.class)).hasMessageContaining("companyId");
        assertThatThrownBy(()->mapper.readValue("{\"confirmationToken\":\"x\",\"idempotencyKey\":\"y\",\"userId\":999}",com.indice.erp.ai.learning.AiLearningProgressActionService.Commit.class)).hasMessageContaining("userId");
    }
}
