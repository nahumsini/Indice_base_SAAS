package com.indice.erp.hr;

import com.indice.erp.hr.permissions.HrPermissionAttendanceSyncService;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class HrPermissionAttendanceSyncServiceIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private HrPermissionAttendanceSyncService syncService;

    private final List<Long> requestIds = new ArrayList<>();
    private final List<Long> userCompanyIds = new ArrayList<>();
    private final List<Long> userIds = new ArrayList<>();

    @AfterEach
    void tearDown() {
        for (var requestId : requestIds) {
            jdbcTemplate.update("DELETE FROM user_permission_requests WHERE id = ?", requestId);
        }
        for (var userCompanyId : userCompanyIds) {
            jdbcTemplate.update("DELETE FROM user_attendance_daily_records WHERE user_company_id = ?", userCompanyId);
            jdbcTemplate.update("DELETE FROM user_work_profiles WHERE user_company_id = ?", userCompanyId);
            jdbcTemplate.update("DELETE FROM user_companies WHERE id = ?", userCompanyId);
        }
        for (var userId : userIds) {
            jdbcTemplate.update("DELETE FROM users WHERE id = ?", userId);
        }
    }

    @Test
    void syncApprovedLeaveStatusMarksOnlyRequestUsersDaysAsLeave() {
        var unique = System.currentTimeMillis();
        var target = createUser(unique, "Target");
        var other = createUser(unique + 1, "Other");
        var startDate = LocalDate.now().plusDays(2);
        var endDate = startDate.plusDays(1);
        var requestId = createPermissionRequest(target, startDate, endDate);

        seedDailyRecord(other, startDate, "on_time");
        syncService.syncApprovedLeaveStatus(1L, 1L, requestId);

        assertThat(correctedStatus(target.userCompanyId(), startDate)).isEqualTo("leave");
        assertThat(correctedStatus(target.userCompanyId(), endDate)).isEqualTo("leave");
        assertThat(correctedStatus(other.userCompanyId(), startDate)).isEqualTo("on_time");
    }

    private TestUser createUser(long unique, String label) {
        var email = "permission.sync." + unique + "@example.com";
        jdbcTemplate.update(
            "INSERT INTO users (email, password_hash, full_name) VALUES (?, '$2y$12$4s7mj2iDLKOSDtJY9Zz5qukpJvNLtWAF87NhuEEF7kxuEH6G1r3ge', ?)",
            email,
            label + " User " + unique
        );
        var userId = jdbcTemplate.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, email);
        jdbcTemplate.update("INSERT INTO user_companies (user_id, company_id, role, status, visibility) VALUES (?, 1, 'user', 'active', 'all')", userId);
        var userCompanyId = jdbcTemplate.queryForObject("SELECT id FROM user_companies WHERE user_id = ? AND company_id = 1", Long.class, userId);
        jdbcTemplate.update(
            """
                INSERT INTO user_work_profiles
                (company_id, user_company_id, user_id, position, department, hire_date, workday_hours, status)
                VALUES (1, ?, ?, 'Operator', 'Operations', ?, 8.00, 'active')
                """,
            userCompanyId,
            userId,
            LocalDate.now().minusMonths(1)
        );
        userIds.add(userId);
        userCompanyIds.add(userCompanyId);
        return new TestUser(userId, userCompanyId, label + " User " + unique);
    }

    private long createPermissionRequest(TestUser user, LocalDate startDate, LocalDate endDate) {
        var requestNumber = "PER-SYNC-" + System.currentTimeMillis();
        jdbcTemplate.update(
            """
                INSERT INTO user_permission_requests
                (company_id, request_number, user_company_id, user_id, user_name_snapshot, permission_type, start_date, end_date,
                 requested_days, is_half_day, status, reason, created_by_user_id, updated_by_user_id)
                VALUES (1, ?, ?, ?, ?, 'vacation', ?, ?, ?, 0, 'approved', 'Family trip', 1, 1)
                """,
            requestNumber,
            user.userCompanyId(),
            user.userId(),
            user.fullName(),
            startDate,
            endDate,
            BigDecimal.valueOf(endDate.toEpochDay() - startDate.toEpochDay() + 1)
        );
        var requestId = jdbcTemplate.queryForObject(
            "SELECT id FROM user_permission_requests WHERE company_id = 1 AND request_number = ?",
            Long.class,
            requestNumber
        );
        requestIds.add(requestId);
        return requestId;
    }

    private void seedDailyRecord(TestUser user, LocalDate date, String correctedStatus) {
        jdbcTemplate.update(
            """
                INSERT INTO user_attendance_daily_records
                (company_id, user_id, user_company_id, attendance_date, system_status, corrected_status, corrected_by, corrected_at, minutes_late, notes)
                VALUES (1, ?, ?, ?, 'pending', ?, 1, ?, 0, NULL)
                """,
            user.userId(),
            user.userCompanyId(),
            date,
            correctedStatus,
            Timestamp.valueOf(date.atStartOfDay())
        );
    }

    private String correctedStatus(long userCompanyId, LocalDate date) {
        return jdbcTemplate.queryForObject(
            "SELECT corrected_status FROM user_attendance_daily_records WHERE company_id = 1 AND user_company_id = ? AND attendance_date = ?",
            String.class,
            userCompanyId,
            date
        );
    }

    private record TestUser(long userId, long userCompanyId, String fullName) {
    }
}
