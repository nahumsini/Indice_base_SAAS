package com.indice.erp.pos.square;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;
import com.indice.erp.pos.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class SquareWebhookOperationsTest {
    private final JdbcTemplate jdbc=mock(JdbcTemplate.class);
    private final SquareWebhookOperations operations=new SquareWebhookOperations(jdbc);

    @Test void unitAdminCannotListCompanyWideDeadLetters() {
        assertDenied(() -> operations.deadLetters(context(PosScope.unitHeadquarters(4L)),50));
    }

    @Test void businessAdminCannotReplayCompanyWideDeadLetter() {
        assertDenied(() -> operations.replay(context(PosScope.businessOffice(4L,8L)),9L,"approved replay reason"));
    }

    private void assertDenied(Runnable call) {
        assertThatThrownBy(call::run).isInstanceOf(PosApiException.class)
            .hasMessageContaining("Corporate office scope");
        verifyNoInteractions(jdbc);
    }

    private PosContext context(PosScope scope) {
        return new PosContext(11L,7L,"Admin","admin",true,scope);
    }
}
