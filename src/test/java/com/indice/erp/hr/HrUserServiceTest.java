package com.indice.erp.hr;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.attendance.HrAttendanceService;
import com.indice.erp.hr.users.HrUserService;
import com.indice.erp.storage.DisabledObjectStorageService;
import com.indice.erp.storage.ObjectStorageDisabledException;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import com.indice.erp.storage.PresignedUpload;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;


@ExtendWith(MockitoExtension.class)
class HrUserServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private HrAttendanceService hrAttendanceService;

    @Mock
    private HrOperationalScopeService hrOperationalScopeService;

    @Test
    void listUsersAllowsNullOptionalColumns() throws Exception {
        var service = createService();

        when(jdbcTemplate.query(anyString(), org.mockito.ArgumentMatchers.<RowMapper<Map<String, Object>>>any(), eq(1L)))
            .thenAnswer(invocation -> {
                @SuppressWarnings("unchecked")
                var rowMapper = (RowMapper<Map<String, Object>>) invocation.getArgument(1);
                ResultSet rs = hrUserResultSet();
                return List.of(rowMapper.mapRow(rs, 0));
            });

        when(jdbcTemplate.queryForObject(anyString(), org.mockito.ArgumentMatchers.<RowMapper<Map<String, Object>>>any(), eq(1L)))
            .thenAnswer(invocation -> {
                @SuppressWarnings("unchecked")
                var rowMapper = (RowMapper<Map<String, Object>>) invocation.getArgument(1);
                ResultSet rs = mock(ResultSet.class);
                when(rs.getInt("total_count")).thenReturn(1);
                when(rs.getInt("active_count")).thenReturn(1);
                when(rs.getInt("inactive_count")).thenReturn(0);
                when(rs.getInt("terminated_count")).thenReturn(0);
                when(rs.getBigDecimal("total_payroll_amount_monthly")).thenReturn(new BigDecimal("6500.00"));
                return rowMapper.mapRow(rs, 0);
            });

        var result = service.listUsers(1L);

        @SuppressWarnings("unchecked")
        var rows = (List<Map<String, Object>>) result.get("rows");
        assertEquals(1, rows.size());
        assertEquals("Second Empleado", rows.getFirst().get("full_name"));
        assertEquals("", rows.getFirst().get("user_code"));
        assertEquals("", rows.getFirst().get("phone"));
        assertNull(rows.getFirst().get("hire_date"));
        assertEquals(new BigDecimal("6500.00"), rows.getFirst().get("salary"));
        assertEquals(new BigDecimal("5.00"), rows.getFirst().get("workdays_per_week"));
    }

    @Test
    void listUsersAppliesBusinessScopeForCurrentUser() throws Exception {
        var service = createService();
        var currentUser = new AuthSessionUser(7L, 1L, "Scoped Admin", "admin");

        when(hrOperationalScopeService.resolve(currentUser))
            .thenReturn(HrOperationalScope.businessOffice(4L, 9L));
        when(jdbcTemplate.query(
            org.mockito.ArgumentMatchers.contains("e.business_id = ?"),
            org.mockito.ArgumentMatchers.<RowMapper<Map<String, Object>>>any(),
            eq(1L),
            eq(9L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Map<String, Object>>) invocation.getArgument(1);
            ResultSet rs = hrUserResultSet();
            return List.of(rowMapper.mapRow(rs, 0));
        });

        when(jdbcTemplate.queryForObject(
            org.mockito.ArgumentMatchers.contains("e.business_id = ?"),
            org.mockito.ArgumentMatchers.<RowMapper<Map<String, Object>>>any(),
            eq(1L),
            eq(9L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Map<String, Object>>) invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getInt("total_count")).thenReturn(1);
            when(rs.getInt("active_count")).thenReturn(1);
            when(rs.getInt("inactive_count")).thenReturn(0);
            when(rs.getInt("terminated_count")).thenReturn(0);
            when(rs.getBigDecimal("total_payroll_amount_monthly")).thenReturn(new BigDecimal("6500.00"));
            return rowMapper.mapRow(rs, 0);
        });

        var result = service.listUsers(currentUser);

        @SuppressWarnings("unchecked")
        var rows = (List<Map<String, Object>>) result.get("rows");
        assertEquals(1, rows.size());
        assertEquals("Second Empleado", rows.getFirst().get("full_name"));
    }

    @Test
    void updateUserThrowsWhenHrUserDoesNotExist() {
        var service = createService();
        var payload = new HashMap<String, Object>();
        payload.put("id", 999L);
        payload.put("first_name", "Missing");
        payload.put("last_name", "user");
        payload.put("email", "missing@example.com");

        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq(1L), eq(999L)))
            .thenReturn(0);

        assertThrows(NoSuchElementException.class, () -> service.updateUser(1L, payload));
    }

    @Test
    void updateUserRejectsInvalidHireDate() {
        var service = createService();
        var payload = new HashMap<String, Object>();
        payload.put("id", 2L);
        payload.put("first_name", "Test");
        payload.put("last_name", "user");
        payload.put("email", "test@example.com");
        payload.put("hire_date", "03/31/2026");

        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq(1L), eq(2L)))
            .thenReturn(1);

        var error = assertThrows(IllegalArgumentException.class, () -> service.updateUser(1L, payload));
        assertEquals("hire_date must use YYYY-MM-DD format.", error.getMessage());
    }

    @Test
    void updateUserRejectsMissingAssignmentFields() {
        var service = createService();
        var payload = new HashMap<String, Object>();
        payload.put("id", 2L);
        payload.put("first_name", "Test");
        payload.put("last_name", "user");
        payload.put("email", "test@example.com");
        payload.put("salary", "5200");

        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq(1L), eq(2L)))
            .thenReturn(1);

        var error = assertThrows(IllegalArgumentException.class, () -> service.updateUser(1L, payload));
        assertEquals("position is required.", error.getMessage());
    }

    @Test
    void updateUserRejectsMissingDailySalary() {
        var service = createService();
        var payload = new HashMap<String, Object>();
        payload.put("id", 2L);
        payload.put("first_name", "Test");
        payload.put("last_name", "user");
        payload.put("email", "test@example.com");
        payload.put("position", "HR Analyst");
        payload.put("department", "People Ops");
        payload.put("unit_id", 5);
        payload.put("business_id", 5);
        payload.put("salary_type", "daily");
        payload.put("salary", "");

        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq(1L), eq(2L)))
            .thenReturn(1);
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq(5L), eq(1L)))
            .thenReturn(1);
        when(jdbcTemplate.query(anyString(), org.mockito.ArgumentMatchers.<RowMapper<Object>>any(), eq(5L), eq(1L)))
            .thenAnswer(invocation -> {
                @SuppressWarnings("unchecked")
                var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
                ResultSet rs = mock(ResultSet.class);
                when(rs.getLong("id")).thenReturn(5L);
                when(rs.getLong("unit_id")).thenReturn(0L);
                when(rs.wasNull()).thenReturn(true);
                return List.of(rowMapper.mapRow(rs, 0));
            });

        var error = assertThrows(IllegalArgumentException.class, () -> service.updateUser(1L, payload));
        assertEquals("salary is required for daily users.", error.getMessage());
    }

    @Test
    void createDocumentUploadRejectsWhenStorageIsDisabled() {
        var service = createService();

        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq(1L), eq(2L)))
            .thenReturn(1);

        Map<String, Object> payload = new HashMap<>();
        payload.put("document_type", "resume");
        payload.put("file_name", "hr-user-resume.pdf");
        payload.put("content_type", "application/pdf");
        payload.put("size_bytes", 1024);

        assertThrows(ObjectStorageDisabledException.class, () -> service.createDocumentUpload(1L, 2L, payload));
    }

    @Test
    void createDocumentUploadReturnsPresignedPayloadWhenStorageIsEnabled() {
        ObjectStorageService objectStorageService = mock(ObjectStorageService.class);
        when(objectStorageService.isEnabled()).thenReturn(true);
        when(objectStorageService.presignUpload(anyString(), anyString(), anyString(), eq(900)))
            .thenReturn(new PresignedUpload(
                "hr/users/1/2/documents/resume/example-upload.pdf",
                "https://minio.example.test/upload",
                Instant.parse("2026-04-13T12:00:00Z"),
                Map.of("Content-Type", "application/pdf")
            ));

        var service = createService(objectStorageService, createStorageProperties());

        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq(1L), eq(2L)))
            .thenReturn(1);

        Map<String, Object> payload = new HashMap<>();
        payload.put("document_type", "resume");
        payload.put("file_name", "HR user Resume.pdf");
        payload.put("content_type", "application/pdf");
        payload.put("size_bytes", 2048);

        var result = service.createDocumentUpload(1L, 2L, payload);

        assertEquals("resume", result.get("document_type"));
        assertEquals("hr/users/1/2/documents/resume/example-upload.pdf", result.get("object_key"));
        assertEquals("https://minio.example.test/upload", result.get("upload_url"));
    }

    private HrUserService createService() {
        return createService(new DisabledObjectStorageService(), createStorageProperties());
    }

    private HrUserService createService(
        ObjectStorageService objectStorageService,
        ObjectStorageProperties objectStorageProperties
    ) {
        return new HrUserService(
            jdbcTemplate,
            hrAttendanceService,
            hrOperationalScopeService,
            objectStorageService,
            objectStorageProperties
        );
    }

    private ObjectStorageProperties createStorageProperties() {
        var properties = new ObjectStorageProperties();
        properties.setProvider("minio");
        properties.getMinio().setBucketDocuments("indice-hr-documents");
        properties.getMinio().setPresignExpirySeconds(900);
        return properties;
    }

    private ResultSet hrUserResultSet() throws SQLException {
        ResultSet rs = mock(ResultSet.class);
        when(rs.getLong("id")).thenReturn(2L);
        when(rs.getString("first_name")).thenReturn("Second");
        when(rs.getString("last_name")).thenReturn("Empleado");
        when(rs.getString("email")).thenReturn("second.hr-user.spring@example.com");
        when(rs.getString("user_code")).thenReturn(null);
        when(rs.getString("status")).thenReturn("active");
        when(rs.getString("position")).thenReturn("Senior Analyst");
        when(rs.getString("department")).thenReturn("Finance");
        when(rs.getString("phone")).thenReturn(null);
        when(rs.getString("registration_country")).thenReturn("MX");
        when(rs.getString("unit_name")).thenReturn(null);
        when(rs.getString("business_name")).thenReturn(null);
        when(rs.getString("pay_period")).thenReturn("weekly");
        when(rs.getString("salary_type")).thenReturn("daily");
        when(rs.getString("contract_type")).thenReturn("permanent");
        when(rs.getString("termination_reason_type")).thenReturn(null);
        when(rs.getString("termination_reason_code")).thenReturn(null);
        when(rs.getString("termination_summary")).thenReturn(null);
        when(rs.getLong("user_id")).thenReturn(22L);
        when(rs.getLong("user_company_id")).thenReturn(33L);
        when(rs.getLong("work_profile_id")).thenReturn(44L);
        when(rs.getObject("hire_date")).thenReturn(null);
        when(rs.getObject("contract_start_date")).thenReturn(null);
        when(rs.getObject("contract_end_date")).thenReturn(null);
        when(rs.getObject("termination_date")).thenReturn(null);
        when(rs.getObject("last_working_day")).thenReturn(null);
        when(rs.getBigDecimal("salary")).thenReturn(new BigDecimal("6500.00"));
        when(rs.getBigDecimal("hourly_rate")).thenReturn(null);
        when(rs.getBigDecimal("workday_hours")).thenReturn(new BigDecimal("8.00"));
        when(rs.getBigDecimal("workdays_per_week")).thenReturn(new BigDecimal("5.00"));
        when(rs.getLong("unit_id")).thenReturn(0L);
        when(rs.getLong("business_id")).thenReturn(0L);
        when(rs.wasNull()).thenReturn(true);
        return rs;
    }
}
