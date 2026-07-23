package com.indice.erp.auth;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockingDetails;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.billing.subscription.CompanyModuleEntitlementService;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class SignupAccountProvisionerTest {

    @Test
    void provisionDoesNotCreateDefaultUnitsOrBusinesses() {
        var jdbcTemplate = mock(JdbcTemplate.class);
        var provisioner = new SignupAccountProvisioner(
            jdbcTemplate,
            new ObjectMapper(),
            mock(SignupBillingSubscriptionWriter.class),
            mock(CompanyModuleEntitlementService.class)
        );

        provisioner.provision(20L, 10L, 30L, profile(), billing());

        var sqlStatements = mockingDetails(jdbcTemplate).getInvocations().stream()
            .map(invocation -> invocation.getArgument(0, String.class))
            .toList();

        assertTrue(sqlStatements.stream().noneMatch(sql -> sql.contains("INSERT INTO units")));
        assertTrue(sqlStatements.stream().noneMatch(sql -> sql.contains("INSERT INTO businesses")));
        assertTrue(sqlStatements.stream().anyMatch(sql -> sql.contains("NULL, NULL, 'active'")));
    }

    private SignupProfile profile() {
        return new SignupProfile(
            "Ada Owner",
            "ada@example.com",
            "hash",
            "Ada Studio",
            "retail",
            "1-5",
            "US",
            "+15555550123"
        );
    }

    private SignupBillingInfo billing() {
        var now = Instant.parse("2026-07-04T00:00:00Z");
        return new SignupBillingInfo(
            new SignupPlanSelection("one-module", 1, 5, 0, 5_900, "usd", List.of("human_resources")),
            "cus_test",
            "sub_test",
            "trialing",
            now,
            now.plusSeconds(SignupTrialTerms.TRIAL_DAYS * 86_400L),
            now,
            now.plusSeconds(SignupTrialTerms.TRIAL_DAYS * 86_400L),
            false,
            null,
            "stripe"
        );
    }
}
