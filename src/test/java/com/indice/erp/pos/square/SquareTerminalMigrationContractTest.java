package com.indice.erp.pos.square;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class SquareTerminalMigrationContractTest {

    @Test
    void migrationKeepsRecoveryAndIdempotencyConstraints() throws Exception {
        var migration = Files.readString(Path.of(
            "src/main/resources/db/migration/V238__pos_square_terminal_mvp.sql"));

        assertThat(migration).contains(
            "pos_square_terminal_payment_intents",
            "uk_pos_square_intents_idempotency",
            "uk_pos_square_intents_open_shift",
            "fk_pos_square_intents_ticket FOREIGN KEY (pos_ticket_id) REFERENCES pos_tickets(id) ON DELETE RESTRICT",
            "status IN ('WAITING', 'APPROVED', 'UNCERTAIN')",
            "pos_square_audit_events",
            "pos_square_webhook_events"
        );
    }
}
