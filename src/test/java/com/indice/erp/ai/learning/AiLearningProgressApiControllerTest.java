package com.indice.erp.ai.learning;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.indice.erp.ai.access.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.learning.*;
import java.util.*;
import org.junit.jupiter.api.Test;

class AiLearningProgressApiControllerTest {
    @Test void readConsentCannotWriteAndPermissionFailuresAreAudited() {
        var tokens=mock(AiAccessTokenService.class);var learning=mock(LearningProgressService.class);
        var actions=mock(AiLearningProgressActionService.class);var audit=mock(AiToolUsageAuditService.class);
        var controller=new AiLearningProgressApiController(tokens,learning,actions,audit);
        var actor=new AuthSessionUser(11L,22L,33L,"Synthetic","user");
        var token=new AiAccessTokenRepository.StoredToken(44,actor,Set.of("learning.read"));
        when(tokens.authenticate("read",AiAccessTokenService.LEARNING_READ)).thenReturn(Optional.of(token));
        when(tokens.authenticate("read",AiAccessTokenService.LEARNING_MANAGE)).thenReturn(Optional.empty());
        var change=new LearningProgressContracts.Change("processes.calendar",2,"understood");
        assertThat(controller.preview("read",change).getStatusCode().value()).isEqualTo(401);
        verifyNoInteractions(actions);
        assertThat(controller.get("read",null).getStatusCode().value()).isEqualTo(200);
        verify(learning).get(actor,"es-MX");verify(audit).recordRead(token,"get_learning_progress","SUCCESS",200);
        when(learning.get(actor,"es-MX")).thenThrow(new SecurityException());
        assertThat(controller.get("read",null).getStatusCode().value()).isEqualTo(403);
        verify(audit).recordRead(token,"get_learning_progress","DENIED",403);
        when(tokens.authenticate("write",AiAccessTokenService.LEARNING_MANAGE)).thenReturn(Optional.of(token));
        when(actions.preview(token,change)).thenThrow(new SecurityException());
        assertThat(controller.preview("write",change).getStatusCode().value()).isEqualTo(403);
        verify(actions).recordFailure(token,"PREVIEW",403);
    }
}
