package com.indice.erp.hr.announcements;

import com.indice.erp.auth.SessionAuthService;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;

class HrAnnouncementTestFixtures {

    private final JdbcTemplate jdbcTemplate;
    private final List<Long> announcementIds = new ArrayList<>();
    private final List<Long> userCompanyIds = new ArrayList<>();
    private final List<Long> userIds = new ArrayList<>();

    HrAnnouncementTestFixtures(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    void tearDown() {
        announcementIds.forEach(id -> jdbcTemplate.update("DELETE FROM hr_announcements WHERE id = ?", id));
        userCompanyIds.forEach(id -> jdbcTemplate.update("DELETE FROM user_companies WHERE id = ?", id));
        userIds.forEach(id -> jdbcTemplate.update("DELETE FROM users WHERE id = ?", id));
    }

    TestUser createNormalUser(long suffix, Long unitId) {
        var user = createUser(suffix, "announcement.user.", "user", unitId);
        grantHrAnnouncementAccess(user.userCompanyId(), "user");
        return user;
    }

    TestUser createManagerUser(long suffix, Long unitId) {
        var user = createUser(suffix, "announcement.manager.", "admin", unitId);
        grantHrAnnouncementAccess(user.userCompanyId(), "admin");
        return user;
    }

    private TestUser createUser(long suffix, String emailPrefix, String role, Long unitId) {
        var email = emailPrefix + suffix + "@example.com";
        jdbcTemplate.update(
            "INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)",
            email,
            "$2a$10$placeholderplaceholderplaceholderplaceholderplaceholder12",
            "Announcement User " + suffix
        );
        var userId = jdbcTemplate.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, email);
        userIds.add(userId);
        jdbcTemplate.update(
            "INSERT INTO user_companies (user_id, company_id, role, status, visibility) VALUES (?, 1, ?, 'active', 'all')",
            userId,
            role
        );
        var userCompanyId = jdbcTemplate.queryForObject("SELECT id FROM user_companies WHERE user_id = ?", Long.class, userId);
        userCompanyIds.add(userCompanyId);
        var department = "Announcement Dept " + suffix;
        jdbcTemplate.update(
            """
                INSERT INTO user_work_profiles
                (company_id, user_company_id, user_id, user_code, position, department, unit_id, status)
                VALUES (1, ?, ?, ?, 'Coordinator', ?, ?, 'active')
                """,
            userCompanyId,
            userId,
            "ANN-" + suffix,
            department,
            unitId
        );
        return new TestUser(userId, userCompanyId, department);
    }

    long createAnnouncement(String title, String audienceType, String status) {
        jdbcTemplate.update(
            """
                INSERT INTO hr_announcements
                (company_id, title, announcement_type, content, audience_type, status, published_at, created_by)
                VALUES (1, ?, 'general', ?, ?, ?, ?, 1)
                """,
            title,
            "Body " + title,
            audienceType,
            status,
            "published".equals(status) ? Timestamp.valueOf(LocalDateTime.now()) : null
        );
        var id = jdbcTemplate.queryForObject("SELECT id FROM hr_announcements WHERE title = ?", Long.class, title);
        announcementIds.add(id);
        return id;
    }

    void addTarget(long announcementId, String targetType, String targetValue) {
        jdbcTemplate.update(
            "INSERT INTO hr_announcement_targets (announcement_id, target_type, target_value) VALUES (?, ?, ?)",
            announcementId,
            targetType,
            targetValue
        );
    }

    String csrf(MockHttpSession session) {
        var token = "announcement-csrf";
        session.setAttribute(SessionAuthService.SESSION_LOGIN_CSRF, token);
        return token;
    }

    MockHttpSession adminSession() {
        var admin = createUser(System.nanoTime(), "announcement.admin.", "superadmin", null);
        grantHrAnnouncementAccess(admin.userCompanyId(), "superadmin");
        return session(admin.userId(), "Announcement Super Admin", "superadmin");
    }

    MockHttpSession userSession(TestUser user) {
        return session(user.userId(), "Announcement User", "user");
    }

    MockHttpSession managerSession(TestUser user) {
        return session(user.userId(), "Announcement Manager", "admin");
    }

    private MockHttpSession session(long userId, String name, String role) {
        var session = new MockHttpSession();
        session.setAttribute(SessionAuthService.SESSION_USER_ID, userId);
        session.setAttribute(SessionAuthService.SESSION_COMPANY_ID, 1L);
        session.setAttribute(SessionAuthService.SESSION_USER_NAME, name);
        session.setAttribute(SessionAuthService.SESSION_ROLE, role);
        return session;
    }

    private void grantHrAnnouncementAccess(long userCompanyId, String role) {
        jdbcTemplate.update(
            """
                UPDATE user_company_module_roles
                SET role = ?
                WHERE user_company_id = ?
                  AND module_slug = 'human_resources'
                """,
            role,
            userCompanyId
        );
        jdbcTemplate.update(
            """
                INSERT INTO user_company_module_roles (user_company_id, module_slug, role, skill_level)
                SELECT ?, 'human_resources', ?, 0
                WHERE NOT EXISTS (
                  SELECT 1
                  FROM user_company_module_roles
                  WHERE user_company_id = ?
                    AND module_slug = 'human_resources'
                )
                """,
            userCompanyId,
            role,
            userCompanyId
        );
        jdbcTemplate.update(
            """
                UPDATE user_company_tab_permissions
                SET can_view = 1
                WHERE user_company_id = ?
                  AND module_slug = 'human_resources'
                  AND tab_key = 'announcements'
                """,
            userCompanyId
        );
        jdbcTemplate.update(
            """
                INSERT INTO user_company_tab_permissions (user_company_id, module_slug, tab_key, can_view)
                SELECT ?, 'human_resources', 'announcements', 1
                WHERE NOT EXISTS (
                  SELECT 1
                  FROM user_company_tab_permissions
                  WHERE user_company_id = ?
                    AND module_slug = 'human_resources'
                    AND tab_key = 'announcements'
                )
                """,
            userCompanyId,
            userCompanyId
        );
    }

    record TestUser(long userId, long userCompanyId, String department) {
    }
}
