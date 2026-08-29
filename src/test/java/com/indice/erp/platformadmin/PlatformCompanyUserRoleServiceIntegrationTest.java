package com.indice.erp.platformadmin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(properties = {
    "app.entitlements.enforcement-enabled=false",
    "app.entitlements.projection-enabled=false"
})
class PlatformCompanyUserRoleServiceIntegrationTest {

    private static final String EMAIL_PREFIX = "platform-role-";
    private static final String COMPANY_PREFIX = "Platform role test ";

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private PlatformCompanyUserService service;

    private long actorUserId;
    private long supportUserId;
    private long targetUserId;
    private long companyId;

    @BeforeEach
    void setUp() {
        cleanTestState();
        var token = UUID.randomUUID().toString();
        actorUserId = createUser("root-" + token, "Platform Root");
        supportUserId = createUser("support-" + token, "Platform Support");
        targetUserId = createUser("target-" + token, "Target User");
        companyId = createCompany(token);
        createMembership(actorUserId, "superadmin");
        createMembership(targetUserId, "admin");
        grantPlatformRoot(actorUserId);
        grantPlatformSupportAccountsWrite(supportUserId);
    }

    @AfterEach
    void clean() {
        cleanTestState();
    }

    @Test
    void platformRootCanChangeCompanyRoleAndGrantPlatformRoot() {
        var roleResult = service.updateRole(
            actorUserId,
            companyId,
            targetUserId,
            new PlatformCompanyUserService.MemberRoleRequest("superadmin")
        );

        assertThat(roleResult)
            .containsEntry("user_id", targetUserId)
            .containsEntry("role", "superadmin");
        assertThat(roleFor(targetUserId)).isEqualTo("superadmin");

        var platformResult = service.updatePlatformAccess(
            actorUserId,
            companyId,
            targetUserId,
            new PlatformCompanyUserService.PlatformAccessRequest("PLATFORM_ROOT")
        );

        assertThat(platformResult)
            .containsEntry("platform_role", "PLATFORM_ROOT")
            .containsEntry("platform_status", "ACTIVE");
        assertThat(platformRoleFor(targetUserId)).isEqualTo("PLATFORM_ROOT");
    }

    @Test
    void nonRootPlatformOperatorCannotChangeCompanyRole() {
        assertThatThrownBy(() -> service.updateRole(
            supportUserId,
            companyId,
            targetUserId,
            new PlatformCompanyUserService.MemberRoleRequest("root")
        ))
            .isInstanceOf(PlatformAdminForbiddenException.class)
            .hasMessageContaining("Platform Root");

        assertThat(roleFor(targetUserId)).isEqualTo("admin");
    }

    @Test
    @SuppressWarnings("unchecked")
    void activitySummarizesLifecycleRecentLoginsAndFailures() {
        var now = Instant.now();
        var targetMembershipId = membershipIdFor(targetUserId);
        jdbc.update(
            "UPDATE user_companies SET created_at = ? WHERE id = ?",
            Timestamp.from(now.minus(45, ChronoUnit.DAYS)),
            targetMembershipId
        );
        jdbc.update(
            """
                INSERT INTO user_login_audit (
                    event_type, stage, outcome, email, email_normalized, company_name_normalized,
                    user_id, company_id, user_company_id, role, success,
                    ip_address, user_agent, created_at
                ) VALUES ('LOGIN', 'PASSWORD', 'SUCCESS', ?, ?, ?, ?, ?, ?, 'admin', 1, '127.0.0.1', 'JUnit', ?)
                """,
            EMAIL_PREFIX + "target@example.com",
            EMAIL_PREFIX + "target@example.com",
            COMPANY_PREFIX.toLowerCase(),
            targetUserId,
            companyId,
            targetMembershipId,
            Timestamp.from(now.minus(10, ChronoUnit.MINUTES))
        );
        jdbc.update(
            """
                INSERT INTO user_login_audit (
                    event_type, stage, outcome, email, email_normalized, company_name_normalized,
                    user_id, company_id, user_company_id, role, success,
                    failure_reason, failure_reason_code, failure_message_safe, ip_address, user_agent, created_at
                ) VALUES ('LOGIN', 'PASSWORD', 'FAILURE', ?, ?, ?, ?, ?, ?, 'admin', 0,
                    'Bad password', 'BAD_CREDENTIALS', 'Bad password', '127.0.0.1', 'JUnit', ?)
                """,
            EMAIL_PREFIX + "target@example.com",
            EMAIL_PREFIX + "target@example.com",
            COMPANY_PREFIX.toLowerCase(),
            targetUserId,
            companyId,
            targetMembershipId,
            Timestamp.from(now.minus(1, ChronoUnit.HOURS))
        );

        var result = service.activity(actorUserId, companyId);
        var totals = (Map<String, Object>) result.get("totals");

        assertThat(totals)
            .containsEntry("total_users", 2)
            .containsEntry("active_users", 2)
            .containsEntry("active_now_users", 1)
            .containsEntry("logged_in_users_24h", 1)
            .containsEntry("new_users_30d", 1)
            .containsEntry("old_users", 1)
            .containsEntry("platform_roots", 1)
            .containsEntry("failed_login_events_24h", 1);
        var buckets = (List<Map<String, Object>>) result.get("activity_buckets");
        assertThat(buckets).isNotEmpty();
        assertThat(buckets).anySatisfy(bucket -> assertThat(bucket).containsEntry("unique_active_users", 1));
        assertThat((Iterable<?>) result.get("recent_events")).isNotEmpty();
    }

    @Test
    @SuppressWarnings("unchecked")
    void allActivitySummarizesCompaniesAndServerLoad() {
        var now = Instant.now();
        var targetMembershipId = membershipIdFor(targetUserId);
        jdbc.update(
            """
                INSERT INTO user_login_audit (
                    event_type, stage, outcome, email, email_normalized, company_name_normalized,
                    user_id, company_id, user_company_id, role, success,
                    ip_address, user_agent, created_at
                ) VALUES ('LOGIN', 'PASSWORD', 'SUCCESS', ?, ?, ?, ?, ?, ?, 'admin', 1, '127.0.0.1', 'JUnit', ?)
                """,
            EMAIL_PREFIX + "target@example.com",
            EMAIL_PREFIX + "target@example.com",
            COMPANY_PREFIX.toLowerCase(),
            targetUserId,
            companyId,
            targetMembershipId,
            Timestamp.from(now.minus(8, ChronoUnit.MINUTES))
        );
        jdbc.update(
            """
                INSERT INTO user_login_audit (
                    event_type, stage, outcome, email, email_normalized, company_name_normalized,
                    user_id, company_id, user_company_id, role, success,
                    failure_reason, failure_reason_code, failure_message_safe, ip_address, user_agent, created_at
                ) VALUES ('LOGIN', 'PASSWORD', 'FAILURE', ?, ?, ?, ?, ?, ?, 'admin', 0,
                    'Bad password', 'BAD_CREDENTIALS', 'Bad password', '127.0.0.1', 'JUnit', ?)
                """,
            EMAIL_PREFIX + "target@example.com",
            EMAIL_PREFIX + "target@example.com",
            COMPANY_PREFIX.toLowerCase(),
            targetUserId,
            companyId,
            targetMembershipId,
            Timestamp.from(now.minus(7, ChronoUnit.MINUTES))
        );

        var result = service.allActivity(actorUserId, 1);
        var totals = (Map<String, Object>) result.get("totals");
        var server = (Map<String, Object>) result.get("server");
        var companies = (List<Map<String, Object>>) result.get("companies");

        assertThat(((Number) totals.get("companies")).intValue()).isGreaterThanOrEqualTo(1);
        assertThat(((Number) totals.get("active_users")).intValue()).isGreaterThanOrEqualTo(2);
        assertThat(server).containsKeys(
            "available_processors",
            "system_load_average",
            "heap_used_bytes",
            "heap_max_bytes"
        );
        assertThat(companies).anySatisfy(company -> {
            assertThat(company)
                .containsEntry("company_id", companyId)
                .containsEntry("active_users", 2)
                .containsEntry("active_now_users", 1)
                .containsEntry("logged_in_users_24h", 1);
        });
        var buckets = (List<Map<String, Object>>) result.get("activity_buckets");
        assertThat(buckets).isNotEmpty();
        assertThat(buckets).anySatisfy(bucket -> assertThat(bucket).containsEntry("unique_active_users", 1));
        assertThat((List<Map<String, Object>>) result.get("recent_events")).hasSize(1);
        assertThat(result)
            .containsEntry("recent_events_limit", 1)
            .containsEntry("recent_events_has_more", true);
    }

    private long createUser(String suffix, String name) {
        jdbc.update(
            "INSERT INTO users (email, password_hash, full_name) VALUES (?, '$2a$10$platformroletest', ?)",
            EMAIL_PREFIX + suffix + "@example.com",
            name
        );
        return jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
    }

    private long createCompany(String token) {
        jdbc.update(
            "INSERT INTO companies (name, commercial_account_type, creation_origin) VALUES (?, 'SUPER_ADMIN', 'PLATFORM_ADMIN')",
            COMPANY_PREFIX + token
        );
        return jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
    }

    private void createMembership(long userId, String role) {
        jdbc.update(
            "INSERT INTO user_companies (user_id, company_id, role, status, visibility) VALUES (?, ?, ?, 'active', 'all')",
            userId,
            companyId,
            role
        );
    }

    private void grantPlatformRoot(long userId) {
        jdbc.update(
            "INSERT INTO platform_administrators (user_id, platform_role, status, mfa_required, created_by_user_id) VALUES (?, 'PLATFORM_ROOT', 'ACTIVE', 0, ?)",
            userId,
            userId
        );
    }

    private void grantPlatformSupportAccountsWrite(long userId) {
        jdbc.update(
            "INSERT INTO platform_administrators (user_id, platform_role, status, mfa_required, created_by_user_id) VALUES (?, 'PLATFORM_SUPPORT', 'ACTIVE', 0, ?)",
            userId,
            actorUserId
        );
        var administratorId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update(
            "INSERT INTO platform_administrator_permissions (platform_administrator_id, permission_code) VALUES (?, 'PLATFORM_ACCOUNTS_WRITE')",
            administratorId
        );
    }

    private String roleFor(long userId) {
        return jdbc.queryForObject(
            "SELECT role FROM user_companies WHERE company_id = ? AND user_id = ?",
            String.class,
            companyId,
            userId
        );
    }

    private String platformRoleFor(long userId) {
        return jdbc.queryForObject(
            "SELECT platform_role FROM platform_administrators WHERE user_id = ? AND status = 'ACTIVE'",
            String.class,
            userId
        );
    }

    private long membershipIdFor(long userId) {
        return jdbc.queryForObject(
            "SELECT id FROM user_companies WHERE company_id = ? AND user_id = ?",
            Long.class,
            companyId,
            userId
        );
    }

    private void cleanTestState() {
        jdbc.update(
            "DELETE FROM user_login_audit WHERE email LIKE ? OR company_id IN (SELECT id FROM companies WHERE name LIKE ?)",
            EMAIL_PREFIX + "%",
            COMPANY_PREFIX + "%"
        );
        jdbc.update(
            "DELETE FROM platform_audit_events WHERE actor_user_id IN (SELECT id FROM users WHERE email LIKE ?) OR company_id IN (SELECT id FROM companies WHERE name LIKE ?)",
            EMAIL_PREFIX + "%",
            COMPANY_PREFIX + "%"
        );
        jdbc.update(
            "DELETE permission FROM platform_administrator_permissions permission JOIN platform_administrators administrator ON administrator.id = permission.platform_administrator_id JOIN users user ON user.id = administrator.user_id WHERE user.email LIKE ?",
            EMAIL_PREFIX + "%"
        );
        jdbc.update(
            "DELETE FROM platform_administrators WHERE user_id IN (SELECT id FROM users WHERE email LIKE ?)",
            EMAIL_PREFIX + "%"
        );
        jdbc.update(
            "DELETE FROM user_companies WHERE user_id IN (SELECT id FROM users WHERE email LIKE ?) OR company_id IN (SELECT id FROM companies WHERE name LIKE ?)",
            EMAIL_PREFIX + "%",
            COMPANY_PREFIX + "%"
        );
        jdbc.update("DELETE FROM companies WHERE name LIKE ?", COMPANY_PREFIX + "%");
        jdbc.update("DELETE FROM users WHERE email LIKE ?", EMAIL_PREFIX + "%");
    }
}
