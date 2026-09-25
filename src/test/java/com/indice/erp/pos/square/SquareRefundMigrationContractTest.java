package com.indice.erp.pos.square;

import java.nio.file.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class SquareRefundMigrationContractTest {
    @Test void schemaKeepsProviderIntentNamespacesSeparate() throws Exception {
        var sql = Files.readString(Path.of(
            "src/main/resources/db/migration/V281__pos_square_refund_lifecycle.sql"));
        assertThat(sql).contains("CREATE TABLE pos_square_refund_requests",
            "square_intent_id BIGINT NULL", "provider_code='SQUARE' AND intent_id IS NULL",
            "provider_code='MERCADO_PAGO' AND intent_id IS NOT NULL",
            "UNIQUE KEY uk_square_refund_active_intent");
    }
    @Test void unresolvedStatesRemainDurablyReserved() throws Exception {
        var sql = Files.readString(Path.of(
            "src/main/resources/db/migration/V281__pos_square_refund_lifecycle.sql"));
        assertThat(sql).contains("'RECONCILIATION_REQUIRED','DEAD_LETTER'",
            "work_lease_id VARCHAR(36)", "submission_attempts INT", "manual_replay_attempts INT",
            "recovery_attempts INT");
    }
}
