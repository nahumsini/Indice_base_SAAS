package com.indice.erp.platformadmin.leads;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.HexFormat;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
    "app.platform-leads.ingest-secret=isolated-test-lead-intake-secret-at-least-32-characters",
    "app.email.enabled=false"
})
class PlatformLeadIntakeIntegrationTest {
    private static final String SECRET = "isolated-test-lead-intake-secret-at-least-32-characters";

    @Autowired private PlatformLeadService leads;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private Clock clock;

    @Test
    @Transactional
    void signedSubmissionIsStoredOnceInPlatformInboxAfterFlywayStartup() throws Exception {
        var submissionId = UUID.randomUUID().toString();
        var timestamp = Long.toString(clock.instant().getEpochSecond());
        var body = """
            {"fullName":"Test Lead","companyName":"Test Company","email":"lead@example.test",
             "challenge":"Automate follow-up","landingPath":"/diagnostico.php",
             "sourceChannel":"SOCIAL","utmSource":"instagram","utmCampaign":"test",
             "planInterest":"ESCALA",
             "contactConsent":true}
            """.getBytes(StandardCharsets.UTF_8);
        var mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        var signature = HexFormat.of().formatHex(mac.doFinal(
            (timestamp + "\n" + submissionId + "\n" + new String(body, StandardCharsets.UTF_8))
                .getBytes(StandardCharsets.UTF_8)));

        var id = leads.ingest(submissionId, timestamp, signature, body);
        assertThat(leads.ingest(submissionId, timestamp, signature, body)).isEqualTo(id);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM platform_leads WHERE id = ?", Integer.class, id))
            .isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT status FROM platform_leads WHERE id = ?", String.class, id))
            .isEqualTo("NEW");
        assertThat(jdbc.queryForObject("SELECT plan_interest FROM platform_leads WHERE id = ?", String.class, id))
            .isEqualTo("ESCALA");
        assertThat(jdbc.queryForObject("SELECT next_action_at IS NOT NULL FROM platform_leads WHERE id = ?", Boolean.class, id))
            .isTrue();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM platform_lead_events WHERE lead_id = ?", Integer.class, id))
            .isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM flyway_schema_history WHERE version = '290' AND success = 1", Integer.class))
            .isEqualTo(1);
    }
}
