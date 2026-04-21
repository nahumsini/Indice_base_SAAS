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
import jakarta.servlet.http.HttpSession;
import java.sql.Timestamp;
import java.util.ArrayList;
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
                    Map.entry("unit_id", 5),
                    Map.entry("business_id", 5),
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

        var assignmentCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM hr_employee_schedule_assignments WHERE employee_id = ?",
            Integer.class,
            employeeId
        );
        assertThat(assignmentCount).isNotNull().isGreaterThan(0);

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
                    Map.entry("unit_id", 5),
                    Map.entry("business_id", 5),
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
            .andExpect(jsonPath("$.business_id").value(5))
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
    void employeeDetailsFlowPersistsProfileAndAccessAcrossAllTabs() throws Exception {
        var session = authenticatedSession();
        var uniqueSuffix = System.currentTimeMillis();

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
                        Map.entry("unit_id", 5),
                        Map.entry("business_id", 5),
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
                    ),
                    "access", Map.of(
                        "access_role", "manager",
                        "invite_on_save", false
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
            .andExpect(jsonPath("$.access.access_role").value("manager"))
            .andExpect(jsonPath("$.access.invitation_status").value("not_invited"))
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

        var locationId = jdbcTemplate.queryForObject(
            "SELECT id FROM hr_attendance_locations WHERE company_id = 1 ORDER BY id ASC LIMIT 1",
            Long.class
        );
        assertThat(locationId).isNotNull();

        mockMvc.perform(
            post("/api/v1/hr/attendance/kiosk-events")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "employee_id", employeeId,
                    "event_type", "check_in",
                    "location_id", locationId,
                    "latitude", 25.6866140,
                    "longitude", -100.3161130,
                    "event_timestamp", "2026-04-06T08:35:00"
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
                    "location_id", locationId,
                    "latitude", 25.6866140,
                    "longitude", -100.3161130,
                    "event_timestamp", "2026-04-06T17:04:00"
                )))
        )
            .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/hr/attendance/dashboard").session(session).param("date", "2026-04-06"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.summary.on_time_count").value(1))
            .andExpect(jsonPath("$.items[?(@.employee_id==" + employeeId + ")].status").value("on_time"));

        mockMvc.perform(
            put("/api/v1/hr/attendance/daily-records/{employeeId}/{date}", employeeId, "2026-04-06")
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
                .param("month", "2026-04")
        )
            .andExpect(status().isOk())
            .andReturn();

        var calendarBody = readMap(calendarResponse.getResponse().getContentAsString());
        @SuppressWarnings("unchecked")
        var items = (List<Map<String, Object>>) calendarBody.get("items");
        var aprilSix = items.stream()
            .filter(item -> "2026-04-06".equals(item.get("date")))
            .findFirst()
            .orElseThrow();

        assertThat(aprilSix.get("system_status")).isEqualTo("on_time");
        assertThat(aprilSix.get("corrected_status")).isEqualTo("leave");
    }

    @Test
    void attendanceSelfEndpointsUseTheLoggedInEmployeeOnly() throws Exception {
        var adminSession = authenticatedSession();
        var uniqueSuffix = System.currentTimeMillis();
        var employeeId = createEmployeeForTests(adminSession, uniqueSuffix);
        var selfSession = createLinkedAttendanceSession(employeeId, uniqueSuffix);

        var locationId = jdbcTemplate.queryForObject(
            "SELECT id FROM hr_attendance_locations WHERE company_id = 1 ORDER BY id ASC LIMIT 1",
            Long.class
        );
        assertThat(locationId).isNotNull();

        mockMvc.perform(
            post("/api/v1/hr/attendance/me/kiosk-events")
                .session(selfSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "event_type", "check_in",
                    "location_id", locationId,
                    "latitude", 25.6866140,
                    "longitude", -100.3161130,
                    "event_timestamp", "2026-04-06T08:35:00"
                )))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.employee_id").value(employeeId))
            .andExpect(jsonPath("$.status").value("on_time"));

        mockMvc.perform(get("/api/v1/hr/attendance/me/dashboard").session(selfSession).param("date", "2026-04-06"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.summary.total_employees").value(1))
            .andExpect(jsonPath("$.items[0].employee_id").value(employeeId))
            .andExpect(jsonPath("$.employees[0].id").value(employeeId));

        mockMvc.perform(
            put("/api/v1/hr/attendance/me/daily-records/{date}", "2026-04-06")
                .session(selfSession)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "status", "leave",
                    "notes", "Self-correction request"
                )))
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.employee_id").value(employeeId))
            .andExpect(jsonPath("$.effective_status").value("leave"));

        var calendarResponse = mockMvc.perform(
            get("/api/v1/hr/attendance/me/calendar")
                .session(selfSession)
                .param("month", "2026-04")
        )
            .andExpect(status().isOk())
            .andReturn();

        var calendarBody = readMap(calendarResponse.getResponse().getContentAsString());
        @SuppressWarnings("unchecked")
        var items = (List<Map<String, Object>>) calendarBody.get("items");
        var aprilSix = items.stream()
            .filter(item -> "2026-04-06".equals(item.get("date")))
            .findFirst()
            .orElseThrow();

        assertThat(((Number) ((Map<?, ?>) calendarBody.get("employee")).get("id")).longValue()).isEqualTo(employeeId);
        assertThat(aprilSix.get("corrected_status")).isEqualTo("leave");
    }

    @Test
    void attendanceSelfEndpointsProvisionAnEmployeeForUnlinkedPlatformUsers() throws Exception {
        var uniqueSuffix = System.currentTimeMillis();
        var userSession = createAttendanceSessionWithoutEmployeeLink(uniqueSuffix);

        var dashboardResponse = mockMvc.perform(
            get("/api/v1/hr/attendance/me/dashboard")
                .session(userSession.session())
                .param("date", "2026-04-06")
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.summary.total_employees").value(1))
            .andReturn();

        var employeeId = jdbcTemplate.queryForObject(
            "SELECT employee_id FROM hr_employee_portal_access WHERE company_id = 1 AND linked_user_id = ?",
            Long.class,
            userSession.userId()
        );
        assertThat(employeeId).isNotNull();
        createdEmployeeIds.add(employeeId);

        var employeeRow = jdbcTemplate.queryForMap(
            """
                SELECT employee_number, first_name, last_name, email, status
                FROM hr_employees
                WHERE id = ?
                """,
            employeeId
        );
        assertThat(String.valueOf(employeeRow.get("employee_number"))).matches("^EMP-\\d{4,}$");
        assertThat(String.valueOf(employeeRow.get("email"))).isEqualTo(userSession.email());
        assertThat(String.valueOf(employeeRow.get("status"))).isEqualToIgnoringCase("active");

        var profileCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM hr_employee_profiles WHERE employee_id = ?",
            Integer.class,
            employeeId
        );
        var accessProfileCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM hr_employee_access_profiles WHERE employee_id = ?",
            Integer.class,
            employeeId
        );
        assertThat(profileCount).isNotNull().isEqualTo(1);
        assertThat(accessProfileCount).isNotNull().isGreaterThan(0);

        var locationId = jdbcTemplate.queryForObject(
            "SELECT id FROM hr_attendance_locations WHERE company_id = 1 ORDER BY id ASC LIMIT 1",
            Long.class
        );
        assertThat(locationId).isNotNull();

        mockMvc.perform(
            post("/api/v1/hr/attendance/me/kiosk-events")
                .session(userSession.session())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "event_type", "check_in",
                    "location_id", locationId,
                    "latitude", 25.6866140,
                    "longitude", -100.3161130,
                    "event_timestamp", "2026-04-06T08:35:00"
                )))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.employee_id").value(employeeId))
            .andExpect(jsonPath("$.status").value("on_time"));

        var dashboardBody = readMap(dashboardResponse.getResponse().getContentAsString());
        assertThat(((Number) ((Map<?, ?>) ((List<?>) dashboardBody.get("employees")).getFirst()).get("id")).longValue())
            .isEqualTo(employeeId);
    }

    @Test
    void attendanceControlOverviewReturnsSchedulesLocationsAndAssignments() throws Exception {
        var session = authenticatedSession();

        var response = mockMvc.perform(
            get("/api/v1/hr/attendance/control-overview")
                .session(session)
                .param("date", "2026-04-07")
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.locations[0].name").value("Spring HQ"))
            .andReturn();

        var body = readMap(response.getResponse().getContentAsString());
        @SuppressWarnings("unchecked")
        var templates = (List<Map<String, Object>>) body.get("templates");
        @SuppressWarnings("unchecked")
        var assignments = (List<Map<String, Object>>) body.get("assignments");

        assertThat(templates).isNotEmpty();
        assertThat(templates.stream().anyMatch(template -> "Spring Default Schedule".equals(template.get("name")))).isTrue();
        assertThat(templates.getFirst().get("days")).isInstanceOf(List.class);
        assertThat(assignments).isNotEmpty();
        assertThat(assignments.stream().anyMatch(assignment -> "Spring Default Schedule".equals(assignment.get("schedule_template_name")))).isTrue();
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
                .content(objectMapper.writeValueAsString(Map.of(
                    "name", "North Gate " + uniqueSuffix,
                    "latitude", 25.700001,
                    "longitude", -100.300001,
                    "radius_meters", 90,
                    "status", "active"
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
                .content(objectMapper.writeValueAsString(Map.of(
                    "name", "North Gate " + uniqueSuffix,
                    "latitude", 25.700001,
                    "longitude", -100.300001,
                    "radius_meters", 95,
                    "status", "inactive"
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
                    "effective_start_date", "2026-04-10"
                )))
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.assigned_count").value(1))
            .andExpect(jsonPath("$.template_name").value("Late Shift " + uniqueSuffix));

        var previousAssignmentEndDate = jdbcTemplate.queryForObject(
            """
                SELECT effective_end_date
                FROM hr_employee_schedule_assignments
                WHERE employee_id = ?
                  AND template_id <> ?
                ORDER BY id ASC
                LIMIT 1
                """,
            java.time.LocalDate.class,
            employeeId,
            templateId
        );
        assertThat(previousAssignmentEndDate).isEqualTo(java.time.LocalDate.parse("2026-04-09"));

        mockMvc.perform(
            get("/api/v1/hr/attendance/control-overview")
                .session(session)
                .param("date", "2026-04-10")
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.assignments[?(@.employee_id==" + employeeId + ")].schedule_template_name").value("Late Shift " + uniqueSuffix));
    }

    @Test
    void kioskAuthFailureThenSuccessAndBreakEventsStayImmutable() throws Exception {
        var session = authenticatedSession();
        var uniqueSuffix = System.currentTimeMillis();
        var employeeId = createEmployeeForTests(session, uniqueSuffix);

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
                    "secret", "1234",
                    "status", "active",
                    "priority", 10
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

        var kioskDeviceId = jdbcTemplate.queryForObject(
            "SELECT id FROM hr_kiosk_devices WHERE company_id = 1 AND code = 'spring-front-kiosk' LIMIT 1",
            Long.class
        );
        assertThat(kioskDeviceId).isNotNull();

        mockMvc.perform(
            post("/api/v1/hr/attendance/kiosk-events")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "employee_id", employeeId,
                    "event_kind", "check_in",
                    "auth_method", "pin",
                    "credential_payload", "9999",
                    "kiosk_device_id", kioskDeviceId,
                    "location_id", 1,
                    "latitude", 25.6866140,
                    "longitude", -100.3161130,
                    "event_timestamp", "2026-04-06T08:35:00"
                )))
        )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Credential validation failed."));

        var failedAuthAttempts = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_attendance_events
                WHERE employee_id = ?
                  AND attendance_date = '2026-04-06'
                  AND event_kind = 'auth_attempt'
                  AND result_status = 'failure'
                """,
            Integer.class,
            employeeId
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
                    "credential_payload", "1234",
                    "kiosk_device_id", kioskDeviceId,
                    "location_id", 1,
                    "latitude", 25.6866140,
                    "longitude", -100.3161130,
                    "event_timestamp", "2026-04-06T08:35:00"
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
                    "credential_payload", "1234",
                    "kiosk_device_id", kioskDeviceId,
                    "location_id", 1,
                    "latitude", 25.6866140,
                    "longitude", -100.3161130,
                    "event_timestamp", "2026-04-06T13:00:00"
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
                    "credential_payload", "1234",
                    "kiosk_device_id", kioskDeviceId,
                    "location_id", 1,
                    "latitude", 25.6866140,
                    "longitude", -100.3161130,
                    "event_timestamp", "2026-04-06T13:40:00"
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
                    "credential_payload", "1234",
                    "kiosk_device_id", kioskDeviceId,
                    "location_id", 1,
                    "latitude", 25.6866140,
                    "longitude", -100.3161130,
                    "event_timestamp", "2026-04-06T17:15:00"
                )))
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.event_kind").value("check_out"));

        var authAttempts = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_attendance_events
                WHERE employee_id = ?
                  AND attendance_date = '2026-04-06'
                  AND event_kind = 'auth_attempt'
                """,
            Integer.class,
            employeeId
        );
        assertThat(authAttempts).isEqualTo(5);

        var breakEvents = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_attendance_events
                WHERE employee_id = ?
                  AND attendance_date = '2026-04-06'
                  AND event_kind IN ('break_out', 'break_in')
                """,
            Integer.class,
            employeeId
        );
        assertThat(breakEvents).isEqualTo(2);

        mockMvc.perform(get("/api/v1/hr/attendance/dashboard").session(session).param("date", "2026-04-06"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[?(@.employee_id==" + employeeId + ")].first_check_in_at").exists())
            .andExpect(jsonPath("$.items[?(@.employee_id==" + employeeId + ")].last_check_out_at").exists());
    }

    @Test
    void correctionEndpointAppendsCorrectionEventAndProjectsDailyState() throws Exception {
        var session = authenticatedSession();
        var uniqueSuffix = System.currentTimeMillis();
        var employeeId = createEmployeeForTests(session, uniqueSuffix);

        var locationId = jdbcTemplate.queryForObject(
            "SELECT id FROM hr_attendance_locations WHERE company_id = 1 ORDER BY id ASC LIMIT 1",
            Long.class
        );
        assertThat(locationId).isNotNull();

        mockMvc.perform(
            post("/api/v1/hr/attendance/kiosk-events")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "employee_id", employeeId,
                    "event_kind", "check_in",
                    "auth_method", "manual_override",
                    "kiosk_device_id", 1,
                    "location_id", locationId,
                    "latitude", 25.6866140,
                    "longitude", -100.3161130,
                    "event_timestamp", "2026-04-06T08:35:00"
                )))
        )
            .andExpect(status().isCreated());

        mockMvc.perform(
            put("/api/v1/hr/attendance/daily-records/{employeeId}/{date}", employeeId, "2026-04-06")
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
                  AND attendance_date = '2026-04-06'
                  AND event_kind = 'correction'
                """,
            Integer.class,
            employeeId
        );
        assertThat(correctionEvents).isEqualTo(1);

        var projectedStatus = jdbcTemplate.queryForObject(
            "SELECT corrected_status FROM hr_attendance_daily_records WHERE employee_id = ? AND attendance_date = '2026-04-06'",
            String.class,
            employeeId
        );
        assertThat(projectedStatus).isEqualTo("leave");
    }

    @Test
    void correctionEndpointCanClearManualCorrectionWithoutLeavingNullStringsBehind() throws Exception {
        var session = authenticatedSession();
        var uniqueSuffix = System.currentTimeMillis();
        var employeeId = createEmployeeForTests(session, uniqueSuffix);

        var locationId = jdbcTemplate.queryForObject(
            "SELECT id FROM hr_attendance_locations WHERE company_id = 1 ORDER BY id ASC LIMIT 1",
            Long.class
        );
        assertThat(locationId).isNotNull();

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
                    "event_timestamp", "2026-04-06T08:35:00"
                )))
        )
            .andExpect(status().isCreated());

        mockMvc.perform(
            put("/api/v1/hr/attendance/daily-records/{employeeId}/{date}", employeeId, "2026-04-06")
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
            put("/api/v1/hr/attendance/daily-records/{employeeId}/{date}", employeeId, "2026-04-06")
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
            "SELECT corrected_status, notes FROM hr_attendance_daily_records WHERE employee_id = ? AND attendance_date = '2026-04-06'",
            employeeId
        );
        assertThat(projectedRecord.get("corrected_status")).isNull();
        assertThat(projectedRecord.get("notes")).isNull();
    }

    @Test
    void kioskEventRejectsCheckOutWithoutActiveCheckInButStillRecordsTheAuthAttempt() throws Exception {
        var session = authenticatedSession();
        var uniqueSuffix = System.currentTimeMillis();
        var employeeId = createEmployeeForTests(session, uniqueSuffix);

        var locationId = jdbcTemplate.queryForObject(
            "SELECT id FROM hr_attendance_locations WHERE company_id = 1 ORDER BY id ASC LIMIT 1",
            Long.class
        );
        assertThat(locationId).isNotNull();

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
                    "event_timestamp", "2026-04-06T17:15:00"
                )))
        )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Check-out requires an active check-in."));

        var authAttempts = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_attendance_events
                WHERE employee_id = ?
                  AND attendance_date = '2026-04-06'
                  AND event_kind = 'auth_attempt'
                  AND result_status = 'overridden'
                """,
            Integer.class,
            employeeId
        );
        assertThat(authAttempts).isEqualTo(1);

        var checkOutEvents = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_attendance_events
                WHERE employee_id = ?
                  AND attendance_date = '2026-04-06'
                  AND event_kind = 'check_out'
                """,
            Integer.class,
            employeeId
        );
        assertThat(checkOutEvents).isZero();
    }

    @Test
    void kioskEventRejectsCheckOutWhileBreakIsStillOpen() throws Exception {
        var session = authenticatedSession();
        var uniqueSuffix = System.currentTimeMillis();
        var employeeId = createEmployeeForTests(session, uniqueSuffix);

        var locationId = jdbcTemplate.queryForObject(
            "SELECT id FROM hr_attendance_locations WHERE company_id = 1 ORDER BY id ASC LIMIT 1",
            Long.class
        );
        assertThat(locationId).isNotNull();

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
                    "event_timestamp", "2026-04-06T08:35:00"
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
                    "event_timestamp", "2026-04-06T13:00:00"
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
                    "event_timestamp", "2026-04-06T17:15:00"
                )))
        )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Close the active break before checking out."));

        var authAttempts = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_attendance_events
                WHERE employee_id = ?
                  AND attendance_date = '2026-04-06'
                  AND event_kind = 'auth_attempt'
                  AND result_status = 'overridden'
                """,
            Integer.class,
            employeeId
        );
        assertThat(authAttempts).isEqualTo(3);

        var checkOutEvents = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_attendance_events
                WHERE employee_id = ?
                  AND attendance_date = '2026-04-06'
                  AND event_kind = 'check_out'
                """,
            Integer.class,
            employeeId
        );
        assertThat(checkOutEvents).isZero();
    }

    @Test
    void payrollRunGenerationEditingLifecycleAndExportsWork() throws Exception {
        var session = authenticatedSession();
        var uniqueSuffix = System.currentTimeMillis();
        var dailyEmployeeId = createEmployeeForTests(session, uniqueSuffix);
        var hourlyEmployeeId = createHourlyEmployeeForTests(session, uniqueSuffix);

        var locationId = jdbcTemplate.queryForObject(
            "SELECT id FROM hr_attendance_locations WHERE company_id = 1 ORDER BY id ASC LIMIT 1",
            Long.class
        );
        assertThat(locationId).isNotNull();

        mockMvc.perform(
            post("/api/v1/hr/attendance/kiosk-events")
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "employee_id", dailyEmployeeId,
                    "event_type", "check_in",
                    "location_id", locationId,
                    "latitude", 25.6866140,
                    "longitude", -100.3161130,
                    "event_timestamp", "2026-04-06T09:05:00"
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
                    "location_id", locationId,
                    "latitude", 25.6866140,
                    "longitude", -100.3161130,
                    "event_timestamp", "2026-04-06T09:00:00"
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
                    "location_id", locationId,
                    "latitude", 25.6866140,
                    "longitude", -100.3161130,
                    "event_timestamp", "2026-04-06T18:30:00"
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
                    "period_start_date", "2026-04-06",
                    "period_end_date", "2026-04-06"
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
                    "unit_ids", List.of("5")
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
        assertThat(scheduledItem.get("audience_summary")).isEqualTo("Spring Unit");
    }

    private long createEmployeeForTests(HttpSession session, long uniqueSuffix) throws Exception {
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
                    Map.entry("unit_id", 5),
                    Map.entry("business_id", 5),
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

    private long createHourlyEmployeeForTests(HttpSession session, long uniqueSuffix) throws Exception {
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
                    Map.entry("unit_id", 5),
                    Map.entry("business_id", 5),
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

    private record UserSessionRef(
        long userId,
        String email,
        MockHttpSession session
    ) {
    }
}
