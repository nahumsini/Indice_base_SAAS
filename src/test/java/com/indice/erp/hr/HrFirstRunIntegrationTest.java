package com.indice.erp.hr;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.hr.announcements.HrAnnouncementService;
import jakarta.servlet.http.HttpSession;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class HrFirstRunIntegrationTest {

    private static final LocalDate TEST_ATTENDANCE_DATE = LocalDate.now();
    private static final String TEST_ATTENDANCE_DAY = TEST_ATTENDANCE_DATE.toString();
    private static final String TEST_ATTENDANCE_MONTH = YearMonth.from(TEST_ATTENDANCE_DATE).toString();

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private HrAnnouncementService hrAnnouncementService;

    private final List<Long> createdEmployeeIds = new ArrayList<>();
    private final List<Long> createdRecordIds = new ArrayList<>();
    private final List<Long> createdAnnouncementIds = new ArrayList<>();
    private final List<Long> createdLocationIds = new ArrayList<>();
    private final List<Long> createdTemplateIds = new ArrayList<>();
    private final List<Long> createdPayrollRunIds = new ArrayList<>();
    private final List<Long> createdUserIds = new ArrayList<>();
    private final List<Long> createdBusinessIds = new ArrayList<>();
    private final List<Long> createdUnitIds = new ArrayList<>();

    private record BusinessFixture(long businessId, long unitId, String unitName) {
    }

    private record EmployeeScope(Long unitId, Long businessId) {
    }

    @AfterEach
    void tearDown() {
        for (var runId : createdPayrollRunIds) {
            jdbcTemplate.update("DELETE FROM hr_payroll_runs WHERE id = ?", runId);
        }
        createdPayrollRunIds.clear();

        for (var announcementId : createdAnnouncementIds) {
            jdbcTemplate.update("DELETE FROM hr_announcements WHERE id = ?", announcementId);
        }
        createdAnnouncementIds.clear();

        for (var recordId : createdRecordIds) {
            jdbcTemplate.update("DELETE FROM hr_employee_records WHERE id = ?", recordId);
        }
        createdRecordIds.clear();

        for (var employeeId : createdEmployeeIds) {
            jdbcTemplate.update("DELETE FROM hr_employees WHERE id = ?", employeeId);
        }
        createdEmployeeIds.clear();

        for (var userId : createdUserIds) {
            jdbcTemplate.update("DELETE FROM user_companies WHERE user_id = ?", userId);
            jdbcTemplate.update("DELETE FROM users WHERE id = ?", userId);
        }
        createdUserIds.clear();

        for (var templateId : createdTemplateIds) {
            jdbcTemplate.update("DELETE FROM hr_schedule_templates WHERE id = ?", templateId);
        }
        createdTemplateIds.clear();

        for (var locationId : createdLocationIds) {
            jdbcTemplate.update("DELETE FROM hr_attendance_locations WHERE id = ?", locationId);
        }
        createdLocationIds.clear();

        for (var businessId : createdBusinessIds) {
            jdbcTemplate.update("DELETE FROM businesses WHERE id = ?", businessId);
        }
        createdBusinessIds.clear();

        for (var unitId : createdUnitIds) {
            jdbcTemplate.update("DELETE FROM units WHERE id = ?", unitId);
        }
        createdUnitIds.clear();
    }

    @Test
    void employeesEndpointRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/hr/employees"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void employeeCrudAndTerminationFlowWorks() throws Exception {
        var session = authenticatedSession();
        var uniqueSuffix = System.currentTimeMillis();
        var business = activeBusinessFixture();

        var createResponse = mockMvc.perform(
            post("/api/v1/hr/employees")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.ofEntries(
                    Map.entry("first_name", "Test"),
                    Map.entry("last_name", "Employee" + uniqueSuffix),
                    Map.entry("email", "test.employee." + uniqueSuffix + "@example.com"),
                    Map.entry("phone", "+1 555 0101"),
                    Map.entry("position", "HR Analyst"),
                    Map.entry("department", "People Ops"),
                    Map.entry("unit_id", business.unitId()),
                    Map.entry("business_id", business.businessId()),
                    Map.entry("hire_date", "2026-04-06"),
                    Map.entry("salary", "5200"),
                    Map.entry("pay_period", "monthly"),
                    Map.entry("salary_type", "daily"),
                    Map.entry("contract_type", "permanent")
                )))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.full_name").value("Test Employee" + uniqueSuffix))
            .andReturn();

        var createdEmployee = readMap(createResponse.getResponse().getContentAsString());
        var employeeId = ((Number) createdEmployee.get("id")).longValue();
        var generatedEmployeeNumber = String.valueOf(createdEmployee.get("employee_number"));
        assertThat(generatedEmployeeNumber).matches("^EMP-\\d{4,}$");
        createdEmployeeIds.add(employeeId);

        mockMvc.perform(
            put("/api/v1/hr/employees/{employeeId}", employeeId)
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.ofEntries(
                    Map.entry("first_name", "Test"),
                    Map.entry("last_name", "Employee" + uniqueSuffix),
                    Map.entry("email", "test.employee." + uniqueSuffix + "@example.com"),
                    Map.entry("phone", "+1 555 0199"),
                    Map.entry("position", "Senior HR Analyst"),
                    Map.entry("department", "People Ops"),
                    Map.entry("unit_id", business.unitId()),
                    Map.entry("business_id", business.businessId()),
                    Map.entry("hire_date", "2026-04-06"),
                    Map.entry("salary", "5600"),
                    Map.entry("pay_period", "monthly"),
                    Map.entry("salary_type", "daily"),
                    Map.entry("contract_type", "permanent"),
                    Map.entry("status", "active")
                )))
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.position_title").value("Senior HR Analyst"))
            .andExpect(jsonPath("$.business_id").value((int) business.businessId()))
            .andExpect(jsonPath("$.employee_number").value(generatedEmployeeNumber));

        mockMvc.perform(
            post("/api/v1/hr/employees/{employeeId}/terminate", employeeId)
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "exit_date", "2026-04-20",
                    "last_working_day", "2026-04-18",
                    "reason_type", "resignation",
                    "specific_reason", "better_offer",
                    "summary", "Accepted another role."
                )))
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("terminated"))
            .andExpect(jsonPath("$.termination_reason_type").value("resignation"));

        mockMvc.perform(delete("/api/v1/hr/employees/{employeeId}", employeeId).session(session))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));

        createdEmployeeIds.remove(employeeId);
    }

    @Test
    void employeeDetailsFlowPersistsProfileAndDocumentsAcrossAllTabs() throws Exception {
        var session = authenticatedSession();
        var uniqueSuffix = System.currentTimeMillis();
        var business = activeBusinessFixture();

        var createResponse = mockMvc.perform(
            post("/api/v1/hr/employees")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "employee", Map.ofEntries(
                        Map.entry("employee_number", "EMP-" + uniqueSuffix),
                        Map.entry("first_name", "Jordan"),
                        Map.entry("last_name", "Employee" + uniqueSuffix),
                        Map.entry("email", "jordan.employee." + uniqueSuffix + "@example.com"),
                        Map.entry("phone", "4165551234"),
                        Map.entry("position", "HR Analyst"),
                        Map.entry("department", "People Ops"),
                        Map.entry("unit_id", business.unitId()),
                        Map.entry("business_id", business.businessId()),
                        Map.entry("hire_date", "2026-04-06"),
                        Map.entry("salary", "5200"),
                        Map.entry("pay_period", "monthly"),
                        Map.entry("salary_type", "daily"),
                        Map.entry("contract_type", "temporary"),
                        Map.entry("contract_start_date", "2026-04-06"),
                        Map.entry("contract_end_date", "2026-12-31")
                    ),
                    "profile", Map.ofEntries(
                        Map.entry("date_of_birth", "1991-02-03"),
                        Map.entry("address", "123 King Street West"),
                        Map.entry("national_id", "CA-ABC-1234"),
                        Map.entry("tax_id", "CA-TAX-9876"),
                        Map.entry("social_security_number", "123456789"),
                        Map.entry("registration_country", "CA"),
                        Map.entry("state_province", "Ontario"),
                        Map.entry("alternate_phone", "4165559999"),
                        Map.entry("emergency_contact_name", "Maria Smith"),
                        Map.entry("emergency_contact_relationship", "Spouse"),
                        Map.entry("emergency_contact_phone", "4165551111"),
                        Map.entry("workday_hours", "8")
                    )
                )))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.full_name").value("Jordan Employee" + uniqueSuffix))
            .andReturn();

        var createdEmployee = readMap(createResponse.getResponse().getContentAsString());
        var employeeId = ((Number) createdEmployee.get("id")).longValue();
        assertThat(String.valueOf(createdEmployee.get("employee_number"))).matches("^EMP-\\d{4,}$");
        createdEmployeeIds.add(employeeId);

        mockMvc.perform(get("/api/v1/hr/employees/{employeeId}", employeeId).session(session))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.employee.id").value(employeeId))
            .andExpect(jsonPath("$.employee.employee_number").value("EMP-" + uniqueSuffix))
            .andExpect(jsonPath("$.profile.date_of_birth").value("1991-02-03"))
            .andExpect(jsonPath("$.profile.address").value("123 King Street West"))
            .andExpect(jsonPath("$.profile.registration_country").value("CA"))
            .andExpect(jsonPath("$.profile.alternate_phone").value("4165559999"))
            .andExpect(jsonPath("$.profile.emergency_contact_name").value("Maria Smith"))
            .andExpect(jsonPath("$.profile.workday_hours").value(8.00))
            .andExpect(jsonPath("$.access").doesNotExist())
            .andExpect(jsonPath("$.documents").isArray())
            .andExpect(jsonPath("$.documents.length()").value(0));
    }

    @Test
    void employeeDocumentUploadReturnsServiceUnavailableWhenObjectStorageIsDisabled() throws Exception {
        var session = authenticatedSession();
        var uniqueSuffix = System.currentTimeMillis();
        var employeeId = createEmployeeForTests(session, uniqueSuffix);

        mockMvc.perform(
            post("/api/v1/hr/employees/{employeeId}/documents/presign-upload", employeeId)
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "document_type", "resume",
                    "file_name", "resume.pdf",
                    "content_type", "application/pdf",
                    "size_bytes", 1024
                )))
        )
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.message").value("Object storage is not enabled."));
    }

    @Test
    void recordsCrudAndAttachmentUploadFlowWorks() throws Exception {
        var session = authenticatedSession();
        var uniqueSuffix = System.currentTimeMillis();
        var employeeId = 2L;

        var createResponse = mockMvc.perform(
            post("/api/v1/hr/records")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "employee_id", employeeId,
                    "record_type", "incident",
                    "severity", "high",
                    "title", "Warehouse Safety Incident " + uniqueSuffix,
                    "description", "Detailed incident description for integration testing.",
                    "actions_taken", "Area secured and supervisor informed.",
                    "event_date", "2026-04-10",
                    "witnesses", List.of("Maria Smith")
                )))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.record_number").value(org.hamcrest.Matchers.matchesPattern("^REC-\\d{6}$")))
            .andExpect(jsonPath("$.status").value("pending"))
            .andReturn();

        var createdRecord = readMap(createResponse.getResponse().getContentAsString());
        var recordId = ((Number) createdRecord.get("id")).longValue();
        createdRecordIds.add(recordId);

        mockMvc.perform(get("/api/v1/hr/records").session(session))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[?(@.id==" + recordId + ")].title").value("Warehouse Safety Incident " + uniqueSuffix));

        mockMvc.perform(get("/api/v1/hr/records/{recordId}", recordId).session(session))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.record.id").value(recordId))
            .andExpect(jsonPath("$.record.witnesses[0].name").value("Maria Smith"))
            .andExpect(jsonPath("$.record.activity[0].activity_type").value("created"));

        mockMvc.perform(
            put("/api/v1/hr/records/{recordId}", recordId)
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "employee_id", employeeId,
                    "record_type", "warning",
                    "severity", "medium",
                    "status", "reviewed",
                    "title", "Updated Safety Warning " + uniqueSuffix,
                    "description", "Updated description.",
                    "actions_taken", "Updated actions.",
                    "event_date", "2026-04-10",
                    "witnesses", List.of("Maria Smith", "Jordan Miles")
                )))
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("reviewed"))
            .andExpect(jsonPath("$.type").value("warning"));

        mockMvc.perform(
            post("/api/v1/hr/records/{recordId}/attachments/presign-upload", recordId)
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "file_name", "incident.pdf",
                    "content_type", "application/pdf",
                    "size_bytes", 1024
                )))
        )
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.message").value("Object storage is not enabled."));

        mockMvc.perform(delete("/api/v1/hr/records/{recordId}", recordId).session(session))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));

        var deletedAt = jdbcTemplate.queryForObject(
            "SELECT deleted_at FROM hr_employee_records WHERE id = ?",
            Timestamp.class,
            recordId
        );
        assertThat(deletedAt).isNotNull();
    }

    @Test
    void attendanceKioskAndCorrectionFlowWorks() throws Exception {
        var session = authenticatedSession();
        var uniqueSuffix = System.currentTimeMillis();
        var employeeId = createEmployeeForTests(session, uniqueSuffix);
        var locationId = createBusinessLocationForEmployee(employeeId, uniqueSuffix, "Kiosk Flow");

        mockMvc.perform(
            post("/api/v1/hr/attendance/kiosk-events")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(Map.of(
                        "employee_id", employeeId,
                        "event_type", "check_in",
                        "auth_method", "manual_override",
                        "location_id", locationId,
                        "latitude", 25.6866140,
                        "longitude", -100.3161130,
                        "event_timestamp", attendanceTimestamp("08:35:00")
                    )))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("on_time"));

        mockMvc.perform(
            post("/api/v1/hr/attendance/kiosk-events")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(Map.of(
                        "employee_id", employeeId,
                        "event_type", "check_out",
                        "auth_method", "manual_override",
                        "location_id", locationId,
                        "latitude", 25.6866140,
                        "longitude", -100.3161130,
                        "event_timestamp", attendanceTimestamp("17:04:00")
                    )))
        )
            .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/hr/attendance/dashboard").session(session).param("date", TEST_ATTENDANCE_DAY))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.summary.on_time_count").value(1))
            .andExpect(jsonPath("$.items[?(@.employee_id==" + employeeId + ")].status").value("on_time"));

        mockMvc.perform(
            put("/api/v1/hr/attendance/daily-records/{employeeId}/{date}", employeeId, TEST_ATTENDANCE_DAY)
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "status", "leave",
                    "notes", "Approved personal day"
                )))
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.effective_status").value("leave"));

        var calendarResponse = mockMvc.perform(
            get("/api/v1/hr/attendance/employees/{employeeId}/calendar", employeeId)
                .session(session)
                .param("month", TEST_ATTENDANCE_MONTH)
        )
            .andExpect(status().isOk())
            .andReturn();

        var calendarBody = readMap(calendarResponse.getResponse().getContentAsString());
        @SuppressWarnings("unchecked")
        var items = (List<Map<String, Object>>) calendarBody.get("items");
        var attendanceDay = items.stream()
            .filter(item -> TEST_ATTENDANCE_DAY.equals(item.get("date")))
            .findFirst()
            .orElseThrow();

        assertThat(attendanceDay.get("system_status")).isEqualTo("on_time");
        assertThat(attendanceDay.get("corrected_status")).isEqualTo("leave");
    }

    @Test
    void overnightScheduleCheckoutAfterMidnightUsesOriginalAttendanceDateAndPayrollTotals() throws Exception {
        var session = authenticatedSession();
        var uniqueSuffix = System.currentTimeMillis();
        var business = createIsolatedBusinessFixture(
            "Overnight Unit " + uniqueSuffix,
            "Overnight Business " + uniqueSuffix
        );
        var dailyEmployeeId = createEmployeeForTests(session, uniqueSuffix, business);
        var hourlyEmployeeId = createHourlyEmployeeForTests(session, uniqueSuffix);
        jdbcTemplate.update(
            "UPDATE hr_employees SET unit_id = ?, business_id = ?, pay_period = 'weekly' WHERE id IN (?, ?)",
            business.unitId(),
            business.businessId(),
            dailyEmployeeId,
            hourlyEmployeeId
        );
        var dailyLocationId = createBusinessLocationForEmployee(dailyEmployeeId, uniqueSuffix, "Overnight Daily");
        var hourlyLocationId = createBusinessLocationForEmployee(hourlyEmployeeId, uniqueSuffix + 1, "Overnight Hourly");
        var overnightDate = LocalDate.now().minusDays(1);
        var checkoutDate = overnightDate.plusDays(1);
        var effectiveEndDate = overnightDate.plusMonths(1);
        var overnightDayOfWeek = overnightDate.getDayOfWeek().getValue();
        var days = new ArrayList<Map<String, Object>>();
        for (var dayOfWeek = 1; dayOfWeek <= 7; dayOfWeek++) {
            days.add(dayOfWeek == overnightDayOfWeek
                ? Map.of(
                    "day_of_week", dayOfWeek,
                    "start_time", "18:00:00",
                    "end_time", "06:00:00",
                    "late_after_minutes", 10,
                    "is_rest_day", false
                )
                : Map.of("day_of_week", dayOfWeek, "late_after_minutes", 0, "is_rest_day", true));
        }

        var templateId = createScheduleTemplate(
            session,
            "Overnight Shift " + uniqueSuffix,
            "strict",
            null,
            days
        );
        seedScheduleAssignment(dailyEmployeeId, templateId, overnightDate, effectiveEndDate);
        seedScheduleAssignment(hourlyEmployeeId, templateId, overnightDate, effectiveEndDate);
        seedAttendanceCheckIn(
            dailyEmployeeId,
            dailyLocationId,
            overnightDate,
            overnightDate.atTime(18, 0)
        );
        seedAttendanceCheckIn(
            hourlyEmployeeId,
            hourlyLocationId,
            overnightDate,
            overnightDate.atTime(18, 0)
        );

        mockMvc.perform(
            post("/api/v1/hr/attendance/kiosk-events")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "employee_id", dailyEmployeeId,
                    "event_type", "check_out",
                    "auth_method", "manual_override",
                    "location_id", dailyLocationId,
                    "latitude", 25.6866140,
                    "longitude", -100.3161130,
                    "event_timestamp", checkoutDate + "T06:00:00"
                )))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("on_time"))
            .andExpect(jsonPath("$.last_check_out_at").value(checkoutDate + "T06:00"));

        mockMvc.perform(
            post("/api/v1/hr/attendance/kiosk-events")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "employee_id", hourlyEmployeeId,
                    "event_type", "check_out",
                    "auth_method", "manual_override",
                    "location_id", hourlyLocationId,
                    "latitude", 25.6866140,
                    "longitude", -100.3161130,
                    "event_timestamp", checkoutDate + "T06:00:00"
                )))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("on_time"))
            .andExpect(jsonPath("$.last_check_out_at").value(checkoutDate + "T06:00"));

        var assignmentEndDate = jdbcTemplate.queryForObject(
            """
                SELECT effective_end_date
                FROM hr_employee_schedule_assignments
                WHERE company_id = 1
                  AND employee_id = ?
                  AND template_id = ?
                ORDER BY id DESC
                LIMIT 1
                """,
            LocalDate.class,
            dailyEmployeeId,
            templateId
        );
        assertThat(assignmentEndDate).isEqualTo(effectiveEndDate);

        var checkoutAttendanceDate = jdbcTemplate.queryForObject(
            """
                SELECT attendance_date
                FROM hr_attendance_events
                WHERE company_id = 1
                  AND employee_id = ?
                  AND event_kind = 'check_out'
                  AND result_status IN ('success', 'overridden')
                ORDER BY id DESC
                LIMIT 1
            """,
            LocalDate.class,
            dailyEmployeeId
        );
        assertThat(checkoutAttendanceDate).isEqualTo(overnightDate);

        var dailyRecord = jdbcTemplate.queryForMap(
            """
                SELECT attendance_date, system_status
                FROM hr_attendance_daily_records
                WHERE company_id = 1
                  AND employee_id = ?
                  AND attendance_date = ?
                """,
            dailyEmployeeId,
            overnightDate
        );
        assertThat(dailyRecord.get("system_status")).isEqualTo("on_time");

        var nextDayDailyRecords = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_attendance_daily_records
                WHERE company_id = 1
                  AND employee_id = ?
                  AND attendance_date = ?
                """,
            Integer.class,
            dailyEmployeeId,
            checkoutDate
        );
        assertThat(nextDayDailyRecords).isZero();

        var payrollRunResponse = mockMvc.perform(
            post("/api/v1/hr/payroll/runs")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "pay_period", "weekly",
                    "grouping_mode", "business",
                    "period_start_date", overnightDate,
                    "period_end_date", overnightDate
                )))
        )
            .andExpect(status().isCreated())
            .andReturn();

        var payrollRunBody = readMap(payrollRunResponse.getResponse().getContentAsString());
        @SuppressWarnings("unchecked")
        var payrollRuns = (List<Map<String, Object>>) payrollRunBody.get("items");
        payrollRuns.stream()
            .filter(run -> !Boolean.TRUE.equals(run.get("reused")))
            .map(run -> ((Number) run.get("id")).longValue())
            .forEach(createdPayrollRunIds::add);
        var payrollRun = payrollRuns.stream()
            .filter(run -> ("business:" + business.businessId()).equals(run.get("grouping_key")))
            .findFirst()
            .orElseThrow();
        var runId = ((Number) payrollRun.get("id")).longValue();

        var payrollDetailResponse = mockMvc.perform(
            get("/api/v1/hr/payroll/runs/{runId}", runId)
                .session(session)
        )
            .andExpect(status().isOk())
            .andReturn();

        var payrollDetailBody = readMap(payrollDetailResponse.getResponse().getContentAsString());
        @SuppressWarnings("unchecked")
        var lines = (List<Map<String, Object>>) payrollDetailBody.get("lines");
        var dailyLine = lines.stream()
            .filter(line -> dailyEmployeeId == ((Number) line.get("employee_id")).longValue())
            .findFirst()
            .orElseThrow();
        var hourlyLine = lines.stream()
            .filter(line -> hourlyEmployeeId == ((Number) line.get("employee_id")).longValue())
            .findFirst()
            .orElseThrow();

        assertThat(((Number) dailyLine.get("days_payable")).doubleValue()).isEqualTo(1.0);
        assertThat(((Number) dailyLine.get("absence_days")).doubleValue()).isZero();
        assertThat(((Number) hourlyLine.get("regular_hours")).doubleValue()).isEqualTo(12.0);
        assertThat(((Number) hourlyLine.get("overtime_hours")).doubleValue()).isZero();
    }

    @Test
    void attendanceSelfEndpointsUseTheLoggedInEmployeeOnly() throws Exception {
        var adminSession = authenticatedSession();
        var uniqueSuffix = System.currentTimeMillis();
        var employeeId = createEmployeeForTests(adminSession, uniqueSuffix);
        var selfSession = createLinkedAttendanceSession(employeeId, uniqueSuffix);
        var selfUserId = ((Number) selfSession.getAttribute(SessionAuthService.SESSION_USER_ID)).longValue();
        var locationId = createBusinessLocationForEmployee(employeeId, uniqueSuffix, "Self User");

        mockMvc.perform(
            post("/api/v1/hr/attendance/me/kiosk-events")
                .session(selfSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "event_type", "check_in",
                    "latitude", 25.6866140,
                    "longitude", -100.3161130,
                    "event_timestamp", attendanceTimestamp("08:35:00")
                )))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.subject_type").value("user"))
            .andExpect(jsonPath("$.employee_id").value(selfUserId))
            .andExpect(jsonPath("$.user_id").value(selfUserId))
            .andExpect(jsonPath("$.location.id").value((int) locationId))
            .andExpect(jsonPath("$.status").value("on_time"));

        mockMvc.perform(get("/api/v1/hr/attendance/me/dashboard").session(selfSession).param("date", TEST_ATTENDANCE_DAY))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.summary.total_employees").value(1))
            .andExpect(jsonPath("$.summary.total_users").value(1))
            .andExpect(jsonPath("$.items[0].subject_type").value("user"))
            .andExpect(jsonPath("$.items[0].employee_id").value(selfUserId))
            .andExpect(jsonPath("$.items[0].user_id").value(selfUserId))
            .andExpect(jsonPath("$.employees[0].id").value(selfUserId));

        mockMvc.perform(
            put("/api/v1/hr/attendance/me/daily-records/{date}", TEST_ATTENDANCE_DAY)
                .session(selfSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "status", "leave",
                    "notes", "Self-correction request"
                )))
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.subject_type").value("user"))
            .andExpect(jsonPath("$.employee_id").value(selfUserId))
            .andExpect(jsonPath("$.user_id").value(selfUserId))
            .andExpect(jsonPath("$.effective_status").value("leave"));

        var calendarResponse = mockMvc.perform(
            get("/api/v1/hr/attendance/me/calendar")
                .session(selfSession)
                .param("month", TEST_ATTENDANCE_MONTH)
        )
            .andExpect(status().isOk())
            .andReturn();

        var calendarBody = readMap(calendarResponse.getResponse().getContentAsString());
        @SuppressWarnings("unchecked")
        var items = (List<Map<String, Object>>) calendarBody.get("items");
        var attendanceDay = items.stream()
            .filter(item -> TEST_ATTENDANCE_DAY.equals(item.get("date")))
            .findFirst()
            .orElseThrow();

        assertThat(((Number) ((Map<?, ?>) calendarBody.get("employee")).get("id")).longValue()).isEqualTo(selfUserId);
        assertThat(attendanceDay.get("corrected_status")).isEqualTo("leave");
    }

    @Test
    void attendanceSelfEndpointsUseUserRecordsWithoutProvisioningEmployees() throws Exception {
        var uniqueSuffix = System.currentTimeMillis();
        var userSession = createAttendanceSessionWithoutEmployeeLink(uniqueSuffix);
        var business = createIsolatedBusinessFixture("User Attendance Unit " + uniqueSuffix, "User Attendance Biz " + uniqueSuffix);
        var locationId = createBusinessStructureLocation("User Attendance Location " + uniqueSuffix, business.businessId(), 25.6866140, -100.3161130);

        var dashboardResponse = mockMvc.perform(
            get("/api/v1/hr/attendance/me/dashboard")
                .session(userSession.session())
                .param("date", TEST_ATTENDANCE_DAY)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.summary.total_employees").value(1))
            .andExpect(jsonPath("$.summary.total_users").value(1))
            .andExpect(jsonPath("$.items[0].subject_type").value("user"))
            .andExpect(jsonPath("$.items[0].employee_id").value(userSession.userId()))
            .andExpect(jsonPath("$.items[0].user_id").value(userSession.userId()))
            .andReturn();

        var portalLinkCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM hr_employee_portal_access WHERE company_id = 1 AND linked_user_id = ?",
            Integer.class,
            userSession.userId()
        );
        var employeeEmailCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM hr_employees WHERE company_id = 1 AND email = ?",
            Integer.class,
            userSession.email()
        );
        assertThat(portalLinkCount).isZero();
        assertThat(employeeEmailCount).isZero();

        mockMvc.perform(
            post("/api/v1/hr/attendance/me/kiosk-events")
                .session(userSession.session())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "event_type", "check_in",
                    "latitude", 25.6866140,
                    "longitude", -100.3161130,
                    "event_timestamp", attendanceTimestamp("08:35:00")
                )))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.subject_type").value("user"))
            .andExpect(jsonPath("$.employee_id").value(userSession.userId()))
            .andExpect(jsonPath("$.user_id").value(userSession.userId()))
            .andExpect(jsonPath("$.location.id").value((int) locationId))
            .andExpect(jsonPath("$.status").value("on_time"));

        var userAttendanceEvents = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_user_attendance_events
                WHERE company_id = 1
                  AND user_id = ?
                  AND attendance_date = ?
                """,
            Integer.class,
            userSession.userId(),
            TEST_ATTENDANCE_DAY
        );
        assertThat(userAttendanceEvents).isEqualTo(1);

        var dashboardBody = readMap(dashboardResponse.getResponse().getContentAsString());
        assertThat(((Number) ((Map<?, ?>) ((List<?>) dashboardBody.get("employees")).getFirst()).get("id")).longValue())
            .isEqualTo(userSession.userId());
    }

    @Test
    void attendanceSelfKioskEventMatchesCurrentBusinessStructureLocation() throws Exception {
        var uniqueSuffix = System.currentTimeMillis();
        var userSession = createAttendanceSessionWithoutEmployeeLink(uniqueSuffix);
        var firstBusiness = createIsolatedBusinessFixture("Attendance Scope Unit " + uniqueSuffix, "Scope Biz A " + uniqueSuffix);
        var secondBusinessId = createBusinessInUnit(firstBusiness.unitId(), "Scope Biz B " + uniqueSuffix);
        var firstLocationId = createBusinessStructureLocation("Scope Biz A Site " + uniqueSuffix, firstBusiness.businessId(), 25.6800000, -100.3200000);
        var secondLocationId = createBusinessStructureLocation("Scope Biz B Site " + uniqueSuffix, secondBusinessId, 25.6866140, -100.3161130);

        mockMvc.perform(
            post("/api/v1/hr/attendance/me/kiosk-events")
                .session(userSession.session())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "event_type", "check_in",
                    "latitude", 25.6866140,
                    "longitude", -100.3161130,
                    "event_timestamp", attendanceTimestamp("08:42:00")
                )))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.location.id").value((int) secondLocationId))
            .andExpect(jsonPath("$.location.unit_id").value((int) firstBusiness.unitId()))
            .andExpect(jsonPath("$.location.business_id").value((int) secondBusinessId))
            .andExpect(jsonPath("$.status").value("on_time"));

        var storedLocationId = jdbcTemplate.queryForObject(
            """
                SELECT location_id
                FROM hr_user_attendance_events
                WHERE company_id = 1
                  AND user_id = ?
                  AND attendance_date = ?
                ORDER BY id DESC
                LIMIT 1
                """,
            Long.class,
            userSession.userId(),
            TEST_ATTENDANCE_DAY
        );
        assertThat(storedLocationId).isEqualTo(secondLocationId);
    }

    @Test
	    void attendanceControlOverviewReturnsSchedulesLocationsAndAssignments() throws Exception {
	        var session = authenticatedSession();
	        var uniqueSuffix = System.currentTimeMillis();
	        var employeeId = createEmployeeForTests(session, uniqueSuffix);
	        createBusinessLocationForEmployee(employeeId, uniqueSuffix, "Overview");
	        var templateName = "Overview Shift " + uniqueSuffix;
	        var templateId = createScheduleTemplate(
	            session,
	            templateName,
	            "strict",
	            null,
	            List.of(
	                Map.of("day_of_week", 1, "start_time", "08:00:00", "end_time", "16:00:00", "late_after_minutes", 10, "is_rest_day", false),
	                Map.of("day_of_week", 2, "start_time", "08:00:00", "end_time", "16:00:00", "late_after_minutes", 10, "is_rest_day", false),
	                Map.of("day_of_week", 3, "start_time", "08:00:00", "end_time", "16:00:00", "late_after_minutes", 10, "is_rest_day", false),
	                Map.of("day_of_week", 4, "start_time", "08:00:00", "end_time", "16:00:00", "late_after_minutes", 10, "is_rest_day", false),
	                Map.of("day_of_week", 5, "start_time", "08:00:00", "end_time", "16:00:00", "late_after_minutes", 10, "is_rest_day", false),
	                Map.of("day_of_week", 6, "late_after_minutes", 0, "is_rest_day", true),
	                Map.of("day_of_week", 7, "late_after_minutes", 0, "is_rest_day", true)
	            )
	        );
	        assignSchedule(session, employeeId, templateId, TEST_ATTENDANCE_DAY);

	        var response = mockMvc.perform(
	            get("/api/v1/hr/attendance/control-overview")
	                .session(session)
	                .param("date", TEST_ATTENDANCE_DAY)
	        )
            .andExpect(status().isOk())
            .andReturn();

        var body = readMap(response.getResponse().getContentAsString());
        @SuppressWarnings("unchecked")
        var locations = (List<Map<String, Object>>) body.get("locations");
        @SuppressWarnings("unchecked")
        var templates = (List<Map<String, Object>>) body.get("templates");
        @SuppressWarnings("unchecked")
        var assignments = (List<Map<String, Object>>) body.get("assignments");

	        assertThat(locations).isNotEmpty();
	        assertThat(templates).isNotEmpty();
	        assertThat(templates.stream().anyMatch(template -> templateName.equals(template.get("name")))).isTrue();
	        assertThat(templates.getFirst().get("days")).isInstanceOf(List.class);
	        assertThat(assignments).isNotEmpty();
	        assertThat(assignments.stream().anyMatch(assignment ->
	            employeeId == ((Number) assignment.get("employee_id")).longValue()
	                && templateName.equals(assignment.get("schedule_template_name"))
	        )).isTrue();
    }

    @Test
    void attendanceControlCrudAndBulkAssignmentFlowWorks() throws Exception {
        var session = authenticatedSession();
        var uniqueSuffix = System.currentTimeMillis();
        var employeeId = createEmployeeForTests(session, uniqueSuffix);

        var locationResponse = mockMvc.perform(
            post("/api/v1/hr/attendance/locations")
                .session(session)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(Map.ofEntries(
                        Map.entry("name", "North Gate " + uniqueSuffix),
                        Map.entry("latitude", 25.700001),
                        Map.entry("longitude", -100.300001),
                        Map.entry("radius_meters", 90),
                        Map.entry("contract_start_date", "2026-01-01"),
                        Map.entry("contract_end_date", "2099-12-31"),
                        Map.entry("required_hours_per_day", "8"),
                        Map.entry("required_start_time", "08:00:00"),
                        Map.entry("required_end_time", "16:00:00"),
                        Map.entry("required_days_per_week", 5),
                        Map.entry("status", "active")
                    )))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.location.name").value("North Gate " + uniqueSuffix))
            .andReturn();

        var location = readMap(locationResponse.getResponse().getContentAsString());
        @SuppressWarnings("unchecked")
        var locationPayload = (Map<String, Object>) location.get("location");
        var locationId = ((Number) locationPayload.get("id")).longValue();
        createdLocationIds.add(locationId);

        mockMvc.perform(
            put("/api/v1/hr/attendance/locations/{locationId}", locationId)
                .session(session)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(Map.ofEntries(
                        Map.entry("name", "North Gate " + uniqueSuffix),
                        Map.entry("latitude", 25.700001),
                        Map.entry("longitude", -100.300001),
                        Map.entry("radius_meters", 95),
                        Map.entry("contract_start_date", "2026-01-01"),
                        Map.entry("contract_end_date", "2099-12-31"),
                        Map.entry("required_hours_per_day", "8"),
                        Map.entry("required_start_time", "08:00:00"),
                        Map.entry("required_end_time", "16:00:00"),
                        Map.entry("required_days_per_week", 5),
                        Map.entry("status", "inactive")
                    )))
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.location.status").value("inactive"));

        var templateResponse = mockMvc.perform(
            post("/api/v1/hr/attendance/schedule-templates")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "name", "Late Shift " + uniqueSuffix,
                    "status", "active",
                    "days", List.of(
                        Map.of("day_of_week", 1, "start_time", "10:00:00", "end_time", "19:00:00", "late_after_minutes", 5, "is_rest_day", false),
                        Map.of("day_of_week", 2, "start_time", "10:00:00", "end_time", "19:00:00", "late_after_minutes", 5, "is_rest_day", false),
                        Map.of("day_of_week", 3, "start_time", "10:00:00", "end_time", "19:00:00", "late_after_minutes", 5, "is_rest_day", false),
                        Map.of("day_of_week", 4, "start_time", "10:00:00", "end_time", "19:00:00", "late_after_minutes", 5, "is_rest_day", false),
                        Map.of("day_of_week", 5, "start_time", "10:00:00", "end_time", "19:00:00", "late_after_minutes", 5, "is_rest_day", false),
                        Map.of("day_of_week", 6, "late_after_minutes", 0, "is_rest_day", true),
                        Map.of("day_of_week", 7, "late_after_minutes", 0, "is_rest_day", true)
                    )
                )))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.template.name").value("Late Shift " + uniqueSuffix))
            .andReturn();

        var templateBody = readMap(templateResponse.getResponse().getContentAsString());
        @SuppressWarnings("unchecked")
        var templatePayload = (Map<String, Object>) templateBody.get("template");
        var templateId = ((Number) templatePayload.get("id")).longValue();
        createdTemplateIds.add(templateId);

        mockMvc.perform(
            post("/api/v1/hr/attendance/schedule-assignments/bulk")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "employee_ids", List.of(employeeId),
                    "template_id", templateId,
                    "effective_start_date", TEST_ATTENDANCE_DAY,
                    "effective_end_date", TEST_ATTENDANCE_DAY
                )))
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.assigned_count").value(1))
            .andExpect(jsonPath("$.template_name").value("Late Shift " + uniqueSuffix));

        mockMvc.perform(
            get("/api/v1/hr/attendance/control-overview")
                .session(session)
                .param("date", TEST_ATTENDANCE_DAY)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.assignments[?(@.employee_id==" + employeeId + ")].schedule_template_name").value("Late Shift " + uniqueSuffix));
    }

        @Test
        void clearingWorkAssignmentsMakesEmployeeAvailableForThatDate() throws Exception {
            var session = authenticatedSession();
            var uniqueSuffix = System.currentTimeMillis();
            var employeeId = createEmployeeForTests(session, uniqueSuffix);
            var targetDate = TEST_ATTENDANCE_DAY;
            var nextDate = TEST_ATTENDANCE_DATE.plusDays(1).toString();
        var templateId = createScheduleTemplate(
            session,
            "Clear Candidate Shift " + uniqueSuffix,
            "strict",
            null,
            List.of(
                Map.of("day_of_week", 1, "start_time", "08:00:00", "end_time", "16:00:00", "late_after_minutes", 10, "is_rest_day", false),
                Map.of("day_of_week", 2, "start_time", "08:00:00", "end_time", "16:00:00", "late_after_minutes", 10, "is_rest_day", false),
                Map.of("day_of_week", 3, "start_time", "08:00:00", "end_time", "16:00:00", "late_after_minutes", 10, "is_rest_day", false),
                Map.of("day_of_week", 4, "start_time", "08:00:00", "end_time", "16:00:00", "late_after_minutes", 10, "is_rest_day", false),
                Map.of("day_of_week", 5, "start_time", "08:00:00", "end_time", "16:00:00", "late_after_minutes", 10, "is_rest_day", false),
                Map.of("day_of_week", 6, "late_after_minutes", 0, "is_rest_day", true),
                Map.of("day_of_week", 7, "late_after_minutes", 0, "is_rest_day", true)
            )
        );
        assignSchedule(session, employeeId, templateId, targetDate, nextDate);

	        var beforeResponse = mockMvc.perform(
	            get("/api/v1/hr/attendance/schedule-candidates")
	                .session(session)
	                .param("date", targetDate)
	                .param("effective_end_date", targetDate)
	                .param("search", String.valueOf(uniqueSuffix))
	        )
            .andExpect(status().isOk())
            .andReturn();

        var beforeBody = readMap(beforeResponse.getResponse().getContentAsString());
        @SuppressWarnings("unchecked")
        var beforeItems = (List<Map<String, Object>>) beforeBody.get("items");
        assertThat(beforeItems)
            .anySatisfy((item) -> {
                assertThat(((Number) item.get("employee_id")).longValue()).isEqualTo(employeeId);
                assertThat(item.get("can_assign_schedule")).isEqualTo(false);
                assertThat(item.get("schedule_busy_reason")).isEqualTo("Schedule already assigned");
            });

        var clearResponse = mockMvc.perform(
            post("/api/v1/hr/attendance/work-assignments/clear")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "employee_id", employeeId,
                    "date", targetDate
                )))
        )
            .andExpect(status().isOk())
            .andReturn();

        var clearBody = readMap(clearResponse.getResponse().getContentAsString());
        assertThat(((Number) clearBody.get("schedule_assignments_cleared")).intValue()).isGreaterThan(0);

	        var availableResponse = mockMvc.perform(
	            get("/api/v1/hr/attendance/schedule-candidates")
	                .session(session)
	                .param("date", targetDate)
	                .param("effective_end_date", targetDate)
	                .param("search", String.valueOf(uniqueSuffix))
	                .param("available_only", "true")
        )
            .andExpect(status().isOk())
            .andReturn();

        var availableBody = readMap(availableResponse.getResponse().getContentAsString());
        @SuppressWarnings("unchecked")
        var availableItems = (List<Map<String, Object>>) availableBody.get("items");
        assertThat(availableItems)
            .anySatisfy((item) -> {
                assertThat(((Number) item.get("employee_id")).longValue()).isEqualTo(employeeId);
                assertThat(item.get("can_assign_schedule")).isEqualTo(true);
            });

        var futureAvailableResponse = mockMvc.perform(
            get("/api/v1/hr/attendance/schedule-candidates")
                .session(session)
                .param("date", nextDate)
                .param("search", String.valueOf(uniqueSuffix))
                .param("available_only", "true")
        )
            .andExpect(status().isOk())
            .andReturn();

        var futureAvailableBody = readMap(futureAvailableResponse.getResponse().getContentAsString());
        @SuppressWarnings("unchecked")
        var futureAvailableItems = (List<Map<String, Object>>) futureAvailableBody.get("items");
        assertThat(futureAvailableItems)
            .noneSatisfy((item) -> assertThat(((Number) item.get("employee_id")).longValue()).isEqualTo(employeeId));
    }

    @Test
    void openScheduleAllowsAnyBusinessStructureLocationButStrictUsesEmployeeBusiness() throws Exception {
        var session = authenticatedSession();
        var uniqueSuffix = System.currentTimeMillis();
        var businessFixtures = activeBusinessFixtures(2);
        var employeeBusiness = businessFixtures.get(0);
        var otherBusiness = businessFixtures.get(1);
        var openEmployeeId = createEmployeeForTests(session, uniqueSuffix, employeeBusiness);
        var strictEmployeeId = createEmployeeForTests(session, uniqueSuffix + 1, employeeBusiness);
        var openPin = pinForSuffix(uniqueSuffix, 11);
        var strictPin = pinForSuffix(uniqueSuffix, 12);
        activatePinAccess(session, openEmployeeId, openPin);
        activatePinAccess(session, strictEmployeeId, strictPin);
        var attendanceDate = java.time.LocalDate.now();
        var eventTimestamp = attendanceDate + "T09:00:00";

        var employeeBusinessLocationId = createBusinessStructureLocation(
            "Business A Policy " + uniqueSuffix,
            employeeBusiness.businessId(),
            25.6866140,
            -100.3161130
        );
        var otherBusinessLocationId = createBusinessStructureLocation(
            "Business B Policy " + uniqueSuffix,
            otherBusiness.businessId(),
            25.7000010,
            -100.3000010
        );

        var openTemplateId = createScheduleTemplate(
            session,
            "Open Policy " + uniqueSuffix,
            "open",
            null,
            List.of(
                Map.of("day_of_week", 1, "late_after_minutes", 0, "is_rest_day", false),
                Map.of("day_of_week", 2, "late_after_minutes", 0, "is_rest_day", false),
                Map.of("day_of_week", 3, "late_after_minutes", 0, "is_rest_day", false),
                Map.of("day_of_week", 4, "late_after_minutes", 0, "is_rest_day", false),
                Map.of("day_of_week", 5, "late_after_minutes", 0, "is_rest_day", false),
                Map.of("day_of_week", 6, "late_after_minutes", 0, "is_rest_day", false),
                Map.of("day_of_week", 7, "late_after_minutes", 0, "is_rest_day", false)
            )
        );
        assignSchedule(session, openEmployeeId, openTemplateId, attendanceDate.toString());

        mockMvc.perform(
            post("/api/v1/hr/attendance/kiosk-events")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "employee_id", openEmployeeId,
                    "event_type", "check_in",
                    "auth_method", "pin",
                    "credential_payload", openPin,
                    "location_id", otherBusinessLocationId,
                    "latitude", 25.7000010,
                    "longitude", -100.3000010,
                    "event_timestamp", eventTimestamp
                )))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.location.id").value(otherBusinessLocationId));

        var strictTemplateId = createScheduleTemplate(
            session,
            "Strict Policy " + uniqueSuffix,
            "strict",
            null,
            List.of(
                Map.of("day_of_week", 1, "start_time", "09:00:00", "end_time", "17:00:00", "late_after_minutes", 5, "is_rest_day", false),
                Map.of("day_of_week", 2, "start_time", "09:00:00", "end_time", "17:00:00", "late_after_minutes", 5, "is_rest_day", false),
                Map.of("day_of_week", 3, "start_time", "09:00:00", "end_time", "17:00:00", "late_after_minutes", 5, "is_rest_day", false),
                Map.of("day_of_week", 4, "start_time", "09:00:00", "end_time", "17:00:00", "late_after_minutes", 5, "is_rest_day", false),
                Map.of("day_of_week", 5, "start_time", "09:00:00", "end_time", "17:00:00", "late_after_minutes", 5, "is_rest_day", false),
                Map.of("day_of_week", 6, "start_time", "09:00:00", "end_time", "17:00:00", "late_after_minutes", 5, "is_rest_day", false),
                Map.of("day_of_week", 7, "start_time", "09:00:00", "end_time", "17:00:00", "late_after_minutes", 5, "is_rest_day", false)
            )
        );
        assignSchedule(session, strictEmployeeId, strictTemplateId, attendanceDate.toString());

        mockMvc.perform(
            post("/api/v1/hr/attendance/kiosk-events")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "employee_id", strictEmployeeId,
                    "event_type", "check_in",
                    "auth_method", "pin",
                    "credential_payload", strictPin,
                    "location_id", otherBusinessLocationId,
                    "latitude", 25.7000010,
                    "longitude", -100.3000010,
                    "event_timestamp", eventTimestamp
                )))
        )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Attendance registration is restricted to the employee's assigned business location."));

        mockMvc.perform(
            post("/api/v1/hr/attendance/kiosk-events")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "employee_id", strictEmployeeId,
                    "event_type", "check_in",
                    "auth_method", "pin",
                    "credential_payload", strictPin,
                    "location_id", employeeBusinessLocationId,
                    "latitude", 25.6866140,
                    "longitude", -100.3161130,
                    "event_timestamp", eventTimestamp
                )))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.location.id").value(employeeBusinessLocationId));
    }

    @Test
    void workSiteAndAttendanceDoNotChangeBaseUnitBusinessButEmployeeUpdateDoes() throws Exception {
        var session = authenticatedSession();
        var uniqueSuffix = System.currentTimeMillis();
        var homeBusiness = createIsolatedBusinessFixture("Home Unit " + uniqueSuffix, "Home Business " + uniqueSuffix);
        var transferBusiness = createIsolatedBusinessFixture("Transfer Unit " + uniqueSuffix, "Transfer Business " + uniqueSuffix);
        var employeeId = createEmployeeForTests(session, uniqueSuffix, homeBusiness);
        var today = java.time.LocalDate.now();

        assertThat(loadEmployeeScope(employeeId))
            .isEqualTo(new EmployeeScope(homeBusiness.unitId(), homeBusiness.businessId()));

        mockMvc.perform(
            post("/api/v1/hr/attendance/work-assignments/clear")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "employee_id", employeeId,
                    "date", today.toString()
                )))
        )
            .andExpect(status().isOk());
        assertThat(loadEmployeeScope(employeeId))
            .isEqualTo(new EmployeeScope(homeBusiness.unitId(), homeBusiness.businessId()));

        var transferLocationId = createBusinessStructureLocation(
            "Transfer Site " + uniqueSuffix,
            transferBusiness.businessId(),
            25.7000010,
            -100.3000010
        );

        var assignResponse = mockMvc.perform(
            post("/api/v1/hr/attendance/work-site-assignments/bulk")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "employee_ids", List.of(employeeId),
                    "location_id", transferLocationId,
                    "effective_start_date", today.toString(),
                    "effective_end_date", today.toString()
                )))
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.assigned_count").value(1))
            .andReturn();

        var assignBody = readMap(assignResponse.getResponse().getContentAsString());
        @SuppressWarnings("unchecked")
        var assignments = (List<Map<String, Object>>) assignBody.get("assignments");
        assertThat(assignments).hasSize(1);
        assertThat(((Number) assignments.getFirst().get("location_id")).longValue()).isEqualTo(transferLocationId);
        assertThat(loadEmployeeScope(employeeId))
            .isEqualTo(new EmployeeScope(homeBusiness.unitId(), homeBusiness.businessId()));

        var activeWorkSiteLocationId = jdbcTemplate.queryForObject(
            """
                SELECT location_id
                FROM hr_employee_work_site_assignments
                WHERE company_id = 1
                  AND employee_id = ?
                  AND status = 'active'
                  AND effective_start_date <= ?
                  AND (effective_end_date IS NULL OR effective_end_date >= ?)
                LIMIT 1
                """,
            Long.class,
            employeeId,
            today,
            today
        );
        assertThat(activeWorkSiteLocationId).isEqualTo(transferLocationId);

        var pin = pinForSuffix(uniqueSuffix, 21);
        activatePinAccess(session, employeeId, pin);
        mockMvc.perform(
            post("/api/v1/hr/attendance/kiosk-events")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "employee_id", employeeId,
                    "event_kind", "check_in",
                    "auth_method", "pin",
                    "credential_payload", pin,
                    "location_id", transferLocationId,
                    "latitude", 25.7000010,
                    "longitude", -100.3000010,
                    "event_timestamp", today + "T09:00:00"
                )))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.active_work_site.location_id").value(transferLocationId))
            .andExpect(jsonPath("$.location.id").value(transferLocationId));
        assertThat(loadEmployeeScope(employeeId))
            .isEqualTo(new EmployeeScope(homeBusiness.unitId(), homeBusiness.businessId()));

        mockMvc.perform(
            put("/api/v1/hr/employees/{employeeId}", employeeId)
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.ofEntries(
                    Map.entry("first_name", "Attendance"),
                    Map.entry("last_name", "Employee" + uniqueSuffix),
                    Map.entry("email", "attendance.employee." + uniqueSuffix + "@example.com"),
                    Map.entry("position", "Operator"),
                    Map.entry("department", "Operations"),
                    Map.entry("unit_id", transferBusiness.unitId()),
                    Map.entry("business_id", transferBusiness.businessId()),
                    Map.entry("hire_date", "2026-04-06"),
                    Map.entry("salary", "4800"),
                    Map.entry("pay_period", "monthly"),
                    Map.entry("salary_type", "daily"),
                    Map.entry("contract_type", "permanent"),
                    Map.entry("status", "active")
                )))
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.unit_id").value((int) transferBusiness.unitId()))
            .andExpect(jsonPath("$.business_id").value((int) transferBusiness.businessId()));

        assertThat(loadEmployeeScope(employeeId))
            .isEqualTo(new EmployeeScope(transferBusiness.unitId(), transferBusiness.businessId()));
    }

    @Test
        void kioskAuthFailureThenSuccessAndBreakEventsStayImmutable() throws Exception {
            var session = authenticatedSession();
            var uniqueSuffix = System.currentTimeMillis();
	        var employeeId = createEmployeeForTests(session, uniqueSuffix);
	        var locationId = createBusinessLocationForEmployee(employeeId, uniqueSuffix, "Pin Flow");
	        var validPin = pinForSuffix(uniqueSuffix, 31);
	        var invalidPin = pinForSuffix(uniqueSuffix, 32);

            var profileId = jdbcTemplate.queryForObject(
            "SELECT id FROM hr_employee_access_profiles WHERE employee_id = ? LIMIT 1",
            Long.class,
            employeeId
        );
        assertThat(profileId).isNotNull();

        mockMvc.perform(
            post("/api/v1/hr/attendance/access-methods")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "access_profile_id", profileId,
	                        "method_type", "pin",
	                        "secret", validPin,
	                        "status", "active",
	                    "priority", 0
	                )))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.access_method.method_type").value("pin"));

        mockMvc.perform(
            put("/api/v1/hr/attendance/access-profiles/{profileId}", profileId)
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "employee_id", employeeId,
                    "status", "active",
                    "default_method", "pin"
                )))
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.access_profile.default_method").value("pin"));

        mockMvc.perform(
            post("/api/v1/hr/attendance/kiosk-events")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "employee_id", employeeId,
	                        "event_kind", "check_in",
	                        "auth_method", "pin",
	                        "credential_payload", invalidPin,
		                    "location_id", locationId,
                    "latitude", 25.6866140,
                    "longitude", -100.3161130,
                    "event_timestamp", attendanceTimestamp("08:35:00")
                )))
        )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Credential validation failed."));

        var failedAuthAttempts = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_attendance_events
                WHERE employee_id = ?
                  AND attendance_date = ?
                  AND event_kind = 'auth_attempt'
                  AND result_status = 'failure'
                """,
            Integer.class,
            employeeId,
            TEST_ATTENDANCE_DAY
        );
        assertThat(failedAuthAttempts).isEqualTo(1);

        mockMvc.perform(
            post("/api/v1/hr/attendance/kiosk-events")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "employee_id", employeeId,
	                        "event_kind", "check_in",
	                        "auth_method", "pin",
	                        "credential_payload", validPin,
		                    "location_id", locationId,
                    "latitude", 25.6866140,
                    "longitude", -100.3161130,
                    "event_timestamp", attendanceTimestamp("08:35:00")
                )))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.event_kind").value("check_in"));

        mockMvc.perform(
            post("/api/v1/hr/attendance/kiosk-events")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "employee_id", employeeId,
	                        "event_kind", "break_out",
	                        "auth_method", "pin",
	                        "credential_payload", validPin,
		                    "location_id", locationId,
                    "latitude", 25.6866140,
                    "longitude", -100.3161130,
                    "event_timestamp", attendanceTimestamp("13:00:00")
                )))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.event_kind").value("break_out"));

        mockMvc.perform(
            post("/api/v1/hr/attendance/kiosk-events")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "employee_id", employeeId,
	                        "event_kind", "break_in",
	                        "auth_method", "pin",
	                        "credential_payload", validPin,
		                    "location_id", locationId,
                    "latitude", 25.6866140,
                    "longitude", -100.3161130,
                    "event_timestamp", attendanceTimestamp("13:40:00")
                )))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.event_kind").value("break_in"));

        mockMvc.perform(
            post("/api/v1/hr/attendance/kiosk-events")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "employee_id", employeeId,
	                        "event_kind", "check_out",
	                        "auth_method", "pin",
	                        "credential_payload", validPin,
		                    "location_id", locationId,
                    "latitude", 25.6866140,
                    "longitude", -100.3161130,
                    "event_timestamp", attendanceTimestamp("17:15:00")
                )))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.event_kind").value("check_out"));

        var authAttempts = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_attendance_events
                WHERE employee_id = ?
                  AND attendance_date = ?
                  AND event_kind = 'auth_attempt'
                """,
            Integer.class,
            employeeId,
            TEST_ATTENDANCE_DAY
        );
        assertThat(authAttempts).isEqualTo(5);

        var breakEvents = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_attendance_events
                WHERE employee_id = ?
                  AND attendance_date = ?
                  AND event_kind IN ('break_out', 'break_in')
                """,
            Integer.class,
            employeeId,
            TEST_ATTENDANCE_DAY
        );
        assertThat(breakEvents).isEqualTo(2);

        mockMvc.perform(get("/api/v1/hr/attendance/dashboard").session(session).param("date", TEST_ATTENDANCE_DAY))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[?(@.employee_id==" + employeeId + ")].first_check_in_at").exists())
            .andExpect(jsonPath("$.items[?(@.employee_id==" + employeeId + ")].last_check_out_at").exists());
    }

    @Test
	    void correctionEndpointAppendsCorrectionEventAndProjectsDailyState() throws Exception {
	        var session = authenticatedSession();
	        var uniqueSuffix = System.currentTimeMillis();
	        var employeeId = createEmployeeForTests(session, uniqueSuffix);
	        var locationId = createBusinessLocationForEmployee(employeeId, uniqueSuffix, "Correction Flow");

        mockMvc.perform(
            post("/api/v1/hr/attendance/kiosk-events")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "employee_id", employeeId,
                    "event_kind", "check_in",
	                    "auth_method", "manual_override",
	                    "location_id", locationId,
                    "latitude", 25.6866140,
                    "longitude", -100.3161130,
                    "event_timestamp", attendanceTimestamp("08:35:00")
                )))
        )
            .andExpect(status().isCreated());

        mockMvc.perform(
            put("/api/v1/hr/attendance/daily-records/{employeeId}/{date}", employeeId, TEST_ATTENDANCE_DAY)
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "status", "leave",
                    "notes", "Approved leave override"
                )))
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.effective_status").value("leave"))
            .andExpect(jsonPath("$.corrected_status").value("leave"));

        var correctionEvents = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_attendance_events
                WHERE employee_id = ?
                  AND attendance_date = ?
                  AND event_kind = 'correction'
                """,
            Integer.class,
            employeeId,
            TEST_ATTENDANCE_DAY
        );
        assertThat(correctionEvents).isEqualTo(1);

        var projectedStatus = jdbcTemplate.queryForObject(
            "SELECT corrected_status FROM hr_attendance_daily_records WHERE employee_id = ? AND attendance_date = ?",
            String.class,
            employeeId,
            TEST_ATTENDANCE_DAY
        );
        assertThat(projectedStatus).isEqualTo("leave");
    }

    @Test
	    void correctionEndpointCanClearManualCorrectionWithoutLeavingNullStringsBehind() throws Exception {
	        var session = authenticatedSession();
	        var uniqueSuffix = System.currentTimeMillis();
	        var employeeId = createEmployeeForTests(session, uniqueSuffix);
	        var locationId = createBusinessLocationForEmployee(employeeId, uniqueSuffix, "Correction Clear");

        mockMvc.perform(
            post("/api/v1/hr/attendance/kiosk-events")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "employee_id", employeeId,
                    "event_kind", "check_in",
                    "auth_method", "manual_override",
                    "location_id", locationId,
                    "latitude", 25.6866140,
                    "longitude", -100.3161130,
                    "event_timestamp", attendanceTimestamp("08:35:00")
                )))
        )
            .andExpect(status().isCreated());

        mockMvc.perform(
            put("/api/v1/hr/attendance/daily-records/{employeeId}/{date}", employeeId, TEST_ATTENDANCE_DAY)
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "status", "leave",
                    "notes", "Approved leave override"
                )))
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.corrected_status").value("leave"));

        var clearResponse = mockMvc.perform(
            put("/api/v1/hr/attendance/daily-records/{employeeId}/{date}", employeeId, TEST_ATTENDANCE_DAY)
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("status", "")))
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.effective_status").value("on_time"))
            .andReturn();

        var clearBody = readMap(clearResponse.getResponse().getContentAsString());
        assertThat(clearBody.get("corrected_status")).isNull();
        assertThat(clearBody.get("notes")).isNull();

        var projectedRecord = jdbcTemplate.queryForMap(
            "SELECT corrected_status, notes FROM hr_attendance_daily_records WHERE employee_id = ? AND attendance_date = ?",
            employeeId,
            TEST_ATTENDANCE_DAY
        );
        assertThat(projectedRecord.get("corrected_status")).isNull();
        assertThat(projectedRecord.get("notes")).isNull();
    }

    @Test
	    void kioskEventRejectsCheckOutWithoutActiveCheckInButStillRecordsTheAuthAttempt() throws Exception {
	        var session = authenticatedSession();
	        var uniqueSuffix = System.currentTimeMillis();
	        var employeeId = createEmployeeForTests(session, uniqueSuffix);
	        var locationId = createBusinessLocationForEmployee(employeeId, uniqueSuffix, "Rejected Checkout");

        mockMvc.perform(
            post("/api/v1/hr/attendance/kiosk-events")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "employee_id", employeeId,
                    "event_kind", "check_out",
                    "auth_method", "manual_override",
                    "location_id", locationId,
                    "latitude", 25.6866140,
                    "longitude", -100.3161130,
                    "event_timestamp", attendanceTimestamp("17:15:00")
                )))
        )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Check-out requires an active check-in."));

        var authAttempts = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_attendance_events
                WHERE employee_id = ?
                  AND attendance_date = ?
                  AND event_kind = 'auth_attempt'
                  AND result_status = 'overridden'
                """,
            Integer.class,
            employeeId,
            TEST_ATTENDANCE_DAY
        );
        assertThat(authAttempts).isEqualTo(1);

        var checkOutEvents = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_attendance_events
                WHERE employee_id = ?
                  AND attendance_date = ?
                  AND event_kind = 'check_out'
                """,
            Integer.class,
            employeeId,
            TEST_ATTENDANCE_DAY
        );
        assertThat(checkOutEvents).isZero();
    }

    @Test
	    void kioskEventRejectsCheckOutWhileBreakIsStillOpen() throws Exception {
	        var session = authenticatedSession();
	        var uniqueSuffix = System.currentTimeMillis();
	        var employeeId = createEmployeeForTests(session, uniqueSuffix);
	        var locationId = createBusinessLocationForEmployee(employeeId, uniqueSuffix, "Break Checkout");

        mockMvc.perform(
            post("/api/v1/hr/attendance/kiosk-events")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "employee_id", employeeId,
                    "event_kind", "check_in",
                    "auth_method", "manual_override",
                    "location_id", locationId,
                    "latitude", 25.6866140,
                    "longitude", -100.3161130,
                    "event_timestamp", attendanceTimestamp("08:35:00")
                )))
        )
            .andExpect(status().isCreated());

        mockMvc.perform(
            post("/api/v1/hr/attendance/kiosk-events")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "employee_id", employeeId,
                    "event_kind", "break_out",
                    "auth_method", "manual_override",
                    "location_id", locationId,
                    "latitude", 25.6866140,
                    "longitude", -100.3161130,
                    "event_timestamp", attendanceTimestamp("13:00:00")
                )))
        )
            .andExpect(status().isCreated());

        mockMvc.perform(
            post("/api/v1/hr/attendance/kiosk-events")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "employee_id", employeeId,
                    "event_kind", "check_out",
                    "auth_method", "manual_override",
                    "location_id", locationId,
                    "latitude", 25.6866140,
                    "longitude", -100.3161130,
                    "event_timestamp", attendanceTimestamp("17:15:00")
                )))
        )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Close the active break before checking out."));

        var authAttempts = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_attendance_events
                WHERE employee_id = ?
                  AND attendance_date = ?
                  AND event_kind = 'auth_attempt'
                  AND result_status = 'overridden'
                """,
            Integer.class,
            employeeId,
            TEST_ATTENDANCE_DAY
        );
        assertThat(authAttempts).isEqualTo(3);

        var checkOutEvents = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_attendance_events
                WHERE employee_id = ?
                  AND attendance_date = ?
                  AND event_kind = 'check_out'
                """,
            Integer.class,
            employeeId,
            TEST_ATTENDANCE_DAY
        );
        assertThat(checkOutEvents).isZero();
    }

    @Test
    void payrollRunGenerationEditingLifecycleAndExportsWork() throws Exception {
        var session = authenticatedSession();
        var uniqueSuffix = System.currentTimeMillis();
	        var dailyEmployeeId = createEmployeeForTests(session, uniqueSuffix);
	        var hourlyEmployeeId = createHourlyEmployeeForTests(session, uniqueSuffix);
	        var dailyLocationId = createBusinessLocationForEmployee(dailyEmployeeId, uniqueSuffix, "Payroll Daily");
	        var hourlyLocationId = createBusinessLocationForEmployee(hourlyEmployeeId, uniqueSuffix + 1, "Payroll Hourly");

        mockMvc.perform(
            post("/api/v1/hr/attendance/kiosk-events")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(Map.of(
                        "employee_id", dailyEmployeeId,
                        "event_type", "check_in",
                        "auth_method", "manual_override",
	                    "location_id", dailyLocationId,
                        "latitude", 25.6866140,
                        "longitude", -100.3161130,
                        "event_timestamp", attendanceTimestamp("09:05:00")
                    )))
        )
            .andExpect(status().isCreated());

        mockMvc.perform(
            post("/api/v1/hr/attendance/kiosk-events")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(Map.of(
                        "employee_id", hourlyEmployeeId,
                        "event_type", "check_in",
                        "auth_method", "manual_override",
	                    "location_id", hourlyLocationId,
                        "latitude", 25.6866140,
                        "longitude", -100.3161130,
                        "event_timestamp", attendanceTimestamp("09:00:00")
                    )))
        )
            .andExpect(status().isCreated());

        mockMvc.perform(
            post("/api/v1/hr/attendance/kiosk-events")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(Map.of(
                        "employee_id", hourlyEmployeeId,
                        "event_type", "check_out",
                        "auth_method", "manual_override",
	                    "location_id", hourlyLocationId,
                        "latitude", 25.6866140,
                        "longitude", -100.3161130,
                        "event_timestamp", attendanceTimestamp("18:30:00")
                    )))
        )
            .andExpect(status().isCreated());

        var createRunResponse = mockMvc.perform(
            post("/api/v1/hr/payroll/runs")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "pay_period", "monthly",
                    "grouping_mode", "single",
                    "period_start_date", TEST_ATTENDANCE_DAY,
                    "period_end_date", TEST_ATTENDANCE_DAY
                )))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.items[0].status").value("draft"))
            .andReturn();

        var createRunBody = readMap(createRunResponse.getResponse().getContentAsString());
        @SuppressWarnings("unchecked")
        var createdRuns = (List<Map<String, Object>>) createRunBody.get("items");
        var runId = ((Number) createdRuns.getFirst().get("id")).longValue();
        createdPayrollRunIds.add(runId);

        var detailResponse = mockMvc.perform(
            get("/api/v1/hr/payroll/runs/{runId}", runId)
                .session(session)
        )
            .andExpect(status().isOk())
            .andReturn();

        var detailBody = readMap(detailResponse.getResponse().getContentAsString());
        @SuppressWarnings("unchecked")
        var lines = (List<Map<String, Object>>) detailBody.get("lines");
        assertThat(lines.stream().anyMatch(line -> dailyEmployeeId == ((Number) line.get("employee_id")).longValue())).isTrue();
        assertThat(lines.stream().anyMatch(line -> hourlyEmployeeId == ((Number) line.get("employee_id")).longValue())).isTrue();
        var dailyLine = lines.stream()
            .filter(line -> dailyEmployeeId == ((Number) line.get("employee_id")).longValue())
            .findFirst()
            .orElseThrow();

        var dailyLineId = ((Number) dailyLine.get("id")).longValue();

        mockMvc.perform(
            put("/api/v1/hr/payroll/runs/{runId}/lines/{lineId}", runId, dailyLineId)
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "include_in_fiscal", false,
                    "notes", "Manual bonus approved",
                    "manual_items", List.of(
                        Map.of("category", "earning", "label", "Retention bonus", "amount", 250.00)
                    )
                )))
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.lines[?(@.id==" + dailyLineId + ")].include_in_fiscal").value(false));

        mockMvc.perform(post("/api/v1/hr/payroll/runs/{runId}/process", runId).session(session))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.run.status").value("processed"));

        mockMvc.perform(post("/api/v1/hr/payroll/runs/{runId}/approve", runId).session(session))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.run.status").value("approved"));

        mockMvc.perform(post("/api/v1/hr/payroll/runs/{runId}/mark-paid", runId).session(session))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.run.status").value("paid"));

        var csvExport = mockMvc.perform(get("/api/v1/hr/payroll/runs/{runId}/export.csv", runId).session(session))
            .andExpect(status().isOk())
            .andReturn();
        assertThat(csvExport.getResponse().getContentAsString()).contains("run_id");

        var pdfExport = mockMvc.perform(get("/api/v1/hr/payroll/runs/{runId}/export.pdf", runId).session(session))
            .andExpect(status().isOk())
            .andReturn();
        assertThat(pdfExport.getResponse().getContentAsByteArray()).isNotEmpty();
    }

        @Test
        void payrollDailyAbsenceOnlyPeriodDoesNotProduceNegativeNet() throws Exception {
            var session = authenticatedSession();
            var uniqueSuffix = System.currentTimeMillis();
            var employeeId = createEmployeeForTests(session, uniqueSuffix);
            var absenceTemplateId = createScheduleTemplate(
                session,
                "Absence Only Shift " + uniqueSuffix,
                "strict",
                null,
                List.of(
                    Map.of("day_of_week", 1, "start_time", "08:00:00", "end_time", "16:00:00", "late_after_minutes", 10, "is_rest_day", false),
                    Map.of("day_of_week", 2, "start_time", "08:00:00", "end_time", "16:00:00", "late_after_minutes", 10, "is_rest_day", false),
                    Map.of("day_of_week", 3, "start_time", "08:00:00", "end_time", "16:00:00", "late_after_minutes", 10, "is_rest_day", false),
                    Map.of("day_of_week", 4, "start_time", "08:00:00", "end_time", "16:00:00", "late_after_minutes", 10, "is_rest_day", false),
                    Map.of("day_of_week", 5, "start_time", "08:00:00", "end_time", "16:00:00", "late_after_minutes", 10, "is_rest_day", false),
                    Map.of("day_of_week", 6, "start_time", "08:00:00", "end_time", "16:00:00", "late_after_minutes", 10, "is_rest_day", false),
                    Map.of("day_of_week", 7, "start_time", "08:00:00", "end_time", "16:00:00", "late_after_minutes", 10, "is_rest_day", false)
                )
            );
            assignSchedule(session, employeeId, absenceTemplateId, "2099-01-01", "2099-01-01");

            var createRunResponse = mockMvc.perform(
                post("/api/v1/hr/payroll/runs")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "pay_period", "monthly",
                    "grouping_mode", "single",
                    "period_start_date", "2099-01-01",
                    "period_end_date", "2099-01-01"
                )))
        )
            .andExpect(status().isCreated())
            .andReturn();

        var createRunBody = readMap(createRunResponse.getResponse().getContentAsString());
        @SuppressWarnings("unchecked")
        var createdRuns = (List<Map<String, Object>>) createRunBody.get("items");
        var runId = ((Number) createdRuns.getFirst().get("id")).longValue();
        createdPayrollRunIds.add(runId);

        var detailResponse = mockMvc.perform(
            get("/api/v1/hr/payroll/runs/{runId}", runId)
                .session(session)
        )
            .andExpect(status().isOk())
            .andReturn();

        var detailBody = readMap(detailResponse.getResponse().getContentAsString());
        @SuppressWarnings("unchecked")
        var lines = (List<Map<String, Object>>) detailBody.get("lines");
        var employeeLine = lines.stream()
            .filter(line -> employeeId == ((Number) line.get("employee_id")).longValue())
            .findFirst()
            .orElseThrow();

        assertThat(employeeLine.get("gross_amount")).isEqualTo(4800.00);
        assertThat(employeeLine.get("deductions_amount")).isEqualTo(4800.00);
        assertThat(employeeLine.get("net_amount")).isEqualTo(0.00);
    }

    @Test
    void announcementsCreateListAndPublishFlowWorks() throws Exception {
        var session = authenticatedSession();
        var uniqueSuffix = System.currentTimeMillis();
        var business = activeBusinessFixture();

        var scheduledResponse = mockMvc.perform(
            post("/api/v1/hr/announcements")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "title", "Scheduled HR Notice " + uniqueSuffix,
                    "type", "reminder",
                    "content", "Complete monthly reviews.",
                    "audience_type", "units",
                    "status", "scheduled",
                    "scheduled_for", "2099-04-01T08:00:00",
                    "unit_ids", List.of(String.valueOf(business.unitId()))
                )))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("scheduled"))
            .andReturn();

        var scheduledAnnouncement = readMap(scheduledResponse.getResponse().getContentAsString());
        var scheduledAnnouncementId = ((Number) scheduledAnnouncement.get("id")).longValue();
        createdAnnouncementIds.add(scheduledAnnouncementId);

        jdbcTemplate.update(
            "UPDATE hr_announcements SET scheduled_for = ? WHERE id = ?",
            Timestamp.valueOf("2026-04-01 08:00:00"),
            scheduledAnnouncementId
        );

        var draftResponse = mockMvc.perform(
            post("/api/v1/hr/announcements")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "title", "Draft HR Notice " + uniqueSuffix,
                    "type", "general",
                    "content", "Draft content for HR.",
                    "audience_type", "all",
                    "status", "draft"
                )))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("draft"))
            .andReturn();

        var draftAnnouncement = readMap(draftResponse.getResponse().getContentAsString());
        createdAnnouncementIds.add(((Number) draftAnnouncement.get("id")).longValue());

        hrAnnouncementService.publishDueAnnouncements();

        var listResponse = mockMvc.perform(get("/api/v1/hr/announcements").session(session))
            .andExpect(status().isOk())
            .andReturn();

        var body = readMap(listResponse.getResponse().getContentAsString());
        @SuppressWarnings("unchecked")
        var items = (List<Map<String, Object>>) body.get("items");

        var scheduledItem = items.stream()
            .filter(item -> ("Scheduled HR Notice " + uniqueSuffix).equals(item.get("title")))
            .findFirst()
            .orElseThrow();

        assertThat(scheduledItem.get("status")).isEqualTo("published");
        assertThat(scheduledItem.get("audience_summary")).isEqualTo(business.unitName());
    }

    private long createEmployeeForTests(HttpSession session, long uniqueSuffix) throws Exception {
        return createEmployeeForTests(session, uniqueSuffix, activeBusinessFixture());
    }

    private long createEmployeeForTests(HttpSession session, long uniqueSuffix, BusinessFixture business) throws Exception {
        var response = mockMvc.perform(
            post("/api/v1/hr/employees")
                .session((MockHttpSession) session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.ofEntries(
                    Map.entry("first_name", "Attendance"),
                    Map.entry("last_name", "Employee" + uniqueSuffix),
                    Map.entry("email", "attendance.employee." + uniqueSuffix + "@example.com"),
                    Map.entry("position", "Operator"),
                    Map.entry("department", "Operations"),
                    Map.entry("unit_id", business.unitId()),
                    Map.entry("business_id", business.businessId()),
                    Map.entry("hire_date", "2026-04-06"),
                    Map.entry("salary", "4800"),
                    Map.entry("pay_period", "monthly"),
                    Map.entry("salary_type", "daily"),
                    Map.entry("contract_type", "permanent")
                )))
        )
            .andExpect(status().isCreated())
            .andReturn();

        var employee = readMap(response.getResponse().getContentAsString());
        var employeeId = ((Number) employee.get("id")).longValue();
        assertThat(String.valueOf(employee.get("employee_number"))).matches("^EMP-\\d{4,}$");
        createdEmployeeIds.add(employeeId);
        return employeeId;
    }

    private void activatePinAccess(HttpSession session, long employeeId, String pin) throws Exception {
        var profileId = jdbcTemplate.queryForObject(
            "SELECT id FROM hr_employee_access_profiles WHERE employee_id = ? LIMIT 1",
            Long.class,
            employeeId
        );
        assertThat(profileId).isNotNull();

        mockMvc.perform(
            post("/api/v1/hr/attendance/access-methods")
                .session((MockHttpSession) session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "access_profile_id", profileId,
                    "method_type", "pin",
                    "secret", pin,
                    "status", "active",
                    "priority", 0
                )))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.access_method.method_type").value("pin"));

        mockMvc.perform(
            put("/api/v1/hr/attendance/access-profiles/{profileId}", profileId)
                .session((MockHttpSession) session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "employee_id", employeeId,
                    "status", "active",
                    "default_method", "pin"
                )))
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.access_profile.default_method").value("pin"));
    }

    private String pinForSuffix(long uniqueSuffix, int offset) {
        return String.format("%05d", 10000 + Math.floorMod(uniqueSuffix + offset, 90000));
    }

    private long createHourlyEmployeeForTests(HttpSession session, long uniqueSuffix) throws Exception {
        var business = activeBusinessFixture();
        var response = mockMvc.perform(
            post("/api/v1/hr/employees")
                .session((MockHttpSession) session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.ofEntries(
                    Map.entry("first_name", "Hourly"),
                    Map.entry("last_name", "Employee" + uniqueSuffix),
                    Map.entry("email", "hourly.employee." + uniqueSuffix + "@example.com"),
                    Map.entry("position", "Support Operator"),
                    Map.entry("department", "Operations"),
                    Map.entry("unit_id", business.unitId()),
                    Map.entry("business_id", business.businessId()),
                    Map.entry("hire_date", "2026-04-06"),
                    Map.entry("salary", "0"),
                    Map.entry("pay_period", "monthly"),
                    Map.entry("salary_type", "hourly"),
                    Map.entry("hourly_rate", "120"),
                    Map.entry("contract_type", "permanent")
                )))
        )
            .andExpect(status().isCreated())
            .andReturn();

        var employee = readMap(response.getResponse().getContentAsString());
        var employeeId = ((Number) employee.get("id")).longValue();
        assertThat(String.valueOf(employee.get("employee_number"))).matches("^EMP-\\d{4,}$");
        createdEmployeeIds.add(employeeId);
        return employeeId;
    }

    private BusinessFixture activeBusinessFixture() {
        return activeBusinessFixtures(1).getFirst();
    }

    private BusinessFixture createIsolatedBusinessFixture(String unitName, String businessName) {
        jdbcTemplate.update(
            "INSERT INTO units (company_id, name, status) VALUES (1, ?, 'active')",
            unitName
        );
        var unitId = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        assertThat(unitId).isNotNull();
        createdUnitIds.add(unitId);

        jdbcTemplate.update(
            """
                INSERT INTO businesses (company_id, unit_id, name, status, created_by, updated_by)
                VALUES (1, ?, ?, 'active', 1, 1)
                """,
            unitId,
            businessName
        );
        var businessId = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        assertThat(businessId).isNotNull();
        createdBusinessIds.add(businessId);
        return new BusinessFixture(businessId, unitId, unitName);
    }

    private long createBusinessInUnit(long unitId, String businessName) {
        jdbcTemplate.update(
            """
                INSERT INTO businesses (company_id, unit_id, name, status, created_by, updated_by)
                VALUES (1, ?, ?, 'active', 1, 1)
                """,
            unitId,
            businessName
        );
        var businessId = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        assertThat(businessId).isNotNull();
        createdBusinessIds.add(businessId);
        return businessId;
    }

    private EmployeeScope loadEmployeeScope(long employeeId) {
        return jdbcTemplate.queryForObject(
            "SELECT unit_id, business_id FROM hr_employees WHERE id = ?",
            (rs, rowNum) -> {
                var unitIdValue = rs.getLong("unit_id");
                Long unitId = rs.wasNull() ? null : unitIdValue;
                var businessIdValue = rs.getLong("business_id");
                Long businessId = rs.wasNull() ? null : businessIdValue;
                return new EmployeeScope(unitId, businessId);
            },
            employeeId
        );
    }

    private List<BusinessFixture> activeBusinessFixtures(int count) {
        var fixtures = jdbcTemplate.query(
            """
                SELECT b.id AS business_id,
                       b.unit_id AS unit_id,
                       u.name AS unit_name
                FROM businesses b
                JOIN units u
                  ON u.id = b.unit_id
                 AND (u.company_id = b.company_id OR u.company_id IS NULL)
                WHERE b.company_id = 1
                  AND b.unit_id IS NOT NULL
                  AND LOWER(COALESCE(b.status, 'active')) = 'active'
                  AND LOWER(COALESCE(u.status, 'active')) = 'active'
                ORDER BY b.id ASC
                LIMIT ?
                """,
            (rs, rowNum) -> new BusinessFixture(
                rs.getLong("business_id"),
                rs.getLong("unit_id"),
                rs.getString("unit_name")
            ),
            count
        );
        while (fixtures.size() < count) {
            var suffix = System.currentTimeMillis() + fixtures.size();
            fixtures.add(createIsolatedBusinessFixture(
                "HR Test Unit " + suffix,
                "HR Test Business " + suffix
            ));
        }
        return fixtures;
    }

    private long createBusinessLocationForEmployee(long employeeId, long uniqueSuffix, String label) {
        var scope = loadEmployeeScope(employeeId);
        assertThat(scope.businessId()).isNotNull();
        return createBusinessStructureLocation(label + " Location " + uniqueSuffix, scope.businessId(), 25.6866140, -100.3161130);
    }

    private long createBusinessStructureLocation(String name, long businessId, double latitude, double longitude) {
        var unitId = jdbcTemplate.queryForObject(
            "SELECT unit_id FROM businesses WHERE id = ? AND company_id = 1",
            Long.class,
            businessId
        );
        jdbcTemplate.update(
            """
                INSERT INTO hr_attendance_locations
                (company_id, unit_id, business_id, contract_start_date, contract_end_date, name, latitude, longitude, radius_meters,
                 required_hours_per_day, required_start_time, required_end_time, required_days_per_week, status, managed_source, created_by)
                VALUES (1, ?, ?, '1970-01-01', '9999-12-31', ?, ?, ?, 120, 8.00, '08:00:00', '16:00:00', 5, 'active', 'business_structure', 1)
                """,
            unitId,
            businessId,
            name,
            latitude,
            longitude
        );
        var locationId = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        assertThat(locationId).isNotNull();
        createdLocationIds.add(locationId);
        return locationId;
    }

    private void seedAttendanceCheckIn(
        long employeeId,
        long locationId,
        LocalDate attendanceDate,
        LocalDateTime checkInAt
    ) {
        jdbcTemplate.update(
            """
                INSERT INTO hr_attendance_events
                (company_id, employee_id, event_type, event_timestamp, attendance_date, location_id,
                 latitude, longitude, source, auth_method, result_status, event_kind, created_by)
                VALUES (1, ?, 'check_in', ?, ?, ?, 25.6866140, -100.3161130,
                        'kiosk', 'manual_override', 'overridden', 'check_in', 1)
                """,
            employeeId,
            Timestamp.valueOf(checkInAt),
            attendanceDate,
            locationId
        );
    }

    private void seedScheduleAssignment(
        long employeeId,
        long templateId,
        LocalDate effectiveStartDate,
        LocalDate effectiveEndDate
    ) {
        jdbcTemplate.update(
            """
                INSERT INTO hr_employee_schedule_assignments
                (company_id, employee_id, template_id, effective_start_date, effective_end_date, status, created_by)
                VALUES (1, ?, ?, ?, ?, 'active', 1)
                """,
            employeeId,
            templateId,
            effectiveStartDate,
            effectiveEndDate
        );
    }

    private long createScheduleTemplate(
        HttpSession session,
        String name,
        String scheduleMode,
        Long locationId,
        List<Map<String, Object>> days
    ) throws Exception {
        var payload = new LinkedHashMap<String, Object>();
        payload.put("name", name);
        payload.put("status", "active");
        payload.put("schedule_mode", scheduleMode);
        payload.put("block_after_grace_period", false);
        payload.put("enforce_location", locationId != null);
        if (locationId != null) {
            payload.put("location_id", locationId);
        }
        payload.put("days", days);

        var response = mockMvc.perform(
            post("/api/v1/hr/attendance/schedule-templates")
                .session((MockHttpSession) session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload))
        )
            .andExpect(status().isCreated())
            .andReturn();

        var body = readMap(response.getResponse().getContentAsString());
        @SuppressWarnings("unchecked")
        var template = (Map<String, Object>) body.get("template");
        var templateId = ((Number) template.get("id")).longValue();
        createdTemplateIds.add(templateId);
        return templateId;
    }

        private void assignSchedule(HttpSession session, long employeeId, long templateId, String effectiveStartDate) throws Exception {
            assignSchedule(session, employeeId, templateId, effectiveStartDate, effectiveStartDate);
        }

        private void assignSchedule(
            HttpSession session,
            long employeeId,
            long templateId,
            String effectiveStartDate,
            String effectiveEndDate
        ) throws Exception {
            var payload = new LinkedHashMap<String, Object>();
            payload.put("employee_ids", List.of(employeeId));
            payload.put("template_id", templateId);
            payload.put("effective_start_date", effectiveStartDate);
            if (effectiveEndDate != null) {
                payload.put("effective_end_date", effectiveEndDate);
            }

            mockMvc.perform(
                post("/api/v1/hr/attendance/schedule-assignments/bulk")
                    .session((MockHttpSession) session)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(payload))
            )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assigned_count").value(1));
        }

    private MockHttpSession authenticatedSession() {
        var session = new MockHttpSession();
        session.setAttribute(SessionAuthService.SESSION_USER_ID, 1L);
        session.setAttribute(SessionAuthService.SESSION_COMPANY_ID, 1L);
        session.setAttribute(SessionAuthService.SESSION_USER_NAME, "Usuario Demo");
        session.setAttribute(SessionAuthService.SESSION_ROLE, "admin");
        return session;
    }

    private MockHttpSession createLinkedAttendanceSession(long employeeId, long uniqueSuffix) {
        var email = "attendance.self." + uniqueSuffix + "@example.com";
        jdbcTemplate.update(
            "INSERT INTO users (email, password_hash, full_name) VALUES (?, '$2y$12$4s7mj2iDLKOSDtJY9Zz5qukpJvNLtWAF87NhuEEF7kxuEH6G1r3ge', ?)",
            email,
            "Attendance Self " + uniqueSuffix
        );
        var userId = jdbcTemplate.queryForObject(
            "SELECT id FROM users WHERE email = ?",
            Long.class,
            email
        );
        assertThat(userId).isNotNull();
        createdUserIds.add(userId);

        jdbcTemplate.update(
            "INSERT INTO user_companies (user_id, company_id, role, status, visibility) VALUES (?, 1, 'user', 'active', 'all')",
            userId
        );

        jdbcTemplate.update(
            """
                INSERT INTO hr_employee_portal_access
                (employee_id, company_id, access_role, linked_user_id, invitation_status, created_by)
                VALUES (?, 1, 'employee', ?, 'linked', 1)
                ON DUPLICATE KEY UPDATE
                  linked_user_id = VALUES(linked_user_id),
                  invitation_status = VALUES(invitation_status)
                """,
            employeeId,
            userId
        );

        var session = new MockHttpSession();
        session.setAttribute(SessionAuthService.SESSION_USER_ID, userId);
        session.setAttribute(SessionAuthService.SESSION_COMPANY_ID, 1L);
        session.setAttribute(SessionAuthService.SESSION_USER_NAME, "Attendance Self " + uniqueSuffix);
        session.setAttribute(SessionAuthService.SESSION_ROLE, "user");
        return session;
    }

    private UserSessionRef createAttendanceSessionWithoutEmployeeLink(long uniqueSuffix) {
        var email = "attendance.auto." + uniqueSuffix + "@example.com";
        var fullName = "Attendance Auto " + uniqueSuffix;

        jdbcTemplate.update(
            "INSERT INTO users (email, password_hash, full_name) VALUES (?, '$2y$12$4s7mj2iDLKOSDtJY9Zz5qukpJvNLtWAF87NhuEEF7kxuEH6G1r3ge', ?)",
            email,
            fullName
        );
        var userId = jdbcTemplate.queryForObject(
            "SELECT id FROM users WHERE email = ?",
            Long.class,
            email
        );
        assertThat(userId).isNotNull();
        createdUserIds.add(userId);

        jdbcTemplate.update(
            "INSERT INTO user_companies (user_id, company_id, role, status, visibility) VALUES (?, 1, 'user', 'active', 'all')",
            userId
        );

        var session = new MockHttpSession();
        session.setAttribute(SessionAuthService.SESSION_USER_ID, userId);
        session.setAttribute(SessionAuthService.SESSION_COMPANY_ID, 1L);
        session.setAttribute(SessionAuthService.SESSION_USER_NAME, fullName);
        session.setAttribute(SessionAuthService.SESSION_ROLE, "user");
        return new UserSessionRef(userId, email, session);
    }

    private Map<String, Object> readMap(String json) throws Exception {
        return objectMapper.readValue(json, new TypeReference<>() {
        });
    }

    private static String attendanceTimestamp(String time) {
        return TEST_ATTENDANCE_DAY + "T" + time;
    }

    private record UserSessionRef(
        long userId,
        String email,
        MockHttpSession session
    ) {
    }
}
