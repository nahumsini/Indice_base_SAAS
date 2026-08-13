package com.indice.erp.platformadmin;

import static org.assertj.core.api.Assertions.assertThat;

import com.indice.erp.auth.SessionAuthService;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
    "app.billing.provisioning.enabled=true",
    "app.billing.stripe.enabled=false",
    "app.entitlements.enforcement-enabled=false",
    "app.entitlements.projection-enabled=false"
})
@Transactional
class PlatformAccountLoginIntegrationTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private PlatformAccountProvisioningService provisioning;

    @Autowired
    private SessionAuthService authentication;

    @Test
    void rootCreatedAccountCanLoginWithTheExactDeliveredCredentials() {
        var discriminator = UUID.randomUUID().toString();
        var companyName = "Login continuity " + discriminator;
        var email = "login-continuity-" + discriminator + "@example.com";
        var password = "  Indice-Access-2026!  ";
        var productCode = jdbc.queryForObject(
            """
                SELECT product.product_code
                FROM billing_catalog_products product
                JOIN billing_catalog_versions version ON version.id = product.catalog_version_id
                WHERE version.status = 'ACTIVE'
                  AND product.product_type = 'BASIC'
                  AND product.active = 1
                ORDER BY product.sort_order, product.id
                LIMIT 1
                """,
            String.class
        );

        var created = provisioning.create(
            platformRootUserId(),
            "platform-login-" + discriminator,
            new PlatformAccountProvisioningService.CreateAccountRequest(
                companyName,
                "Login Owner",
                email,
                password,
                "MX",
                "+52 81 0000 0000",
                "professional_services",
                "5",
                5,
                "SUPER_ADMIN",
                List.of(productCode),
                0,
                30,
                false
            )
        );

        var session = new MockHttpSession();
        var login = authentication.loginJson(companyName, email, password, session);

        assertThat(created)
            .containsEntry("company_name", companyName)
            .containsEntry("owner_email", email)
            .containsEntry("user_type", "SUPER_ADMIN");
        assertThat(login.success()).isTrue();

        var current = authentication.currentSession(session).orElseThrow();
        assertThat(current.company().name()).isEqualTo(companyName);
        assertThat(current.user().role()).isEqualTo("superadmin");
        assertThat(current.user().module_slugs()).isNotEmpty();
        assertThat(current.user().tab_permission_keys()).isNotEmpty();
    }

    private long platformRootUserId() {
        var roots = jdbc.query(
            "SELECT user_id FROM platform_administrators WHERE status = 'ACTIVE' ORDER BY id LIMIT 1",
            (rs, rowNum) -> rs.getLong(1)
        );
        if (!roots.isEmpty()) {
            return roots.getFirst();
        }
        var userId = jdbc.queryForObject("SELECT id FROM users ORDER BY id LIMIT 1", Long.class);
        jdbc.update(
            """
                INSERT INTO platform_administrators (
                    user_id, platform_role, status, mfa_required, created_by_user_id
                ) VALUES (?, 'PLATFORM_ROOT', 'ACTIVE', 1, ?)
                """,
            userId,
            userId
        );
        return userId;
    }
}
