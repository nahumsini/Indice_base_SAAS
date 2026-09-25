package com.indice.erp.pos.square;

import static org.assertj.core.api.Assertions.assertThat;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class SquareHardeningMigrationContractTest {
    @Test void migrationAddsConcurrencyOwnershipAndRetryControls() throws Exception {
        var sql = Files.readString(Path.of(
            "src/main/resources/db/migration/V280__pos_square_production_hardening.sql"));
        assertThat(sql).contains(
            "V280 blocked: one Square merchant is owned by multiple companies",
            "uk_pos_square_connections_merchant (environment, merchant_id)",
            "refresh_lease_owner", "token_version", "live_activation_version",
            "provider_verified_at", "submission_started_at", "submission_attempts",
            "attempt_count", "lifetime_attempt_count", "next_attempt_at", "lease_owner", "lease_expires_at",
            "DEAD_LETTER", "pos_square_webhook_rate_limits", "pos_square_webhook_replay_events");
    }
    @Test void oauthRetentionCleanupHasLeadingExpiryIndex() throws Exception {
        var sql = Files.readString(Path.of(
            "src/main/resources/db/migration/V283__square_oauth_state_retention_index.sql"));
        assertThat(sql).contains("pos_square_oauth_states", "(expires_at, id)");
    }
}
