package com.indice.erp.hr;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.face.HrFaceService;
import com.indice.erp.storage.ObjectStorageDisabledException;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(HrAttendanceApiController.class)
class HrAttendanceApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionAuthService sessionAuthService;

    @MockBean
    private HrAttendanceService hrAttendanceService;

    @MockBean
    private HrFaceService hrFaceService;

    @Test
    void controlOverviewRequiresAuthentication() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/hr/attendance/control-overview"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void controlOverviewReturnsPayloadForAuthenticatedUser() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrAttendanceService.controlOverview(eq(1L), any())).willReturn(Map.of(
            "date", "2026-04-07",
            "summary", Map.of(
                "employees_count", 1,
                "locations_count", 1,
                "templates_count", 1
            ),
            "locations", java.util.List.of(Map.of("id", 1, "name", "Spring HQ")),
            "templates", java.util.List.of(Map.of("id", 1, "name", "Spring Default Schedule")),
            "assignments", java.util.List.of(Map.of("employee_id", 2, "employee_name", "Second Empleado"))
        ));

        mockMvc.perform(get("/api/v1/hr/attendance/control-overview").param("date", "2026-04-07"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.summary.locations_count").value(1))
            .andExpect(jsonPath("$.templates[0].name").value("Spring Default Schedule"))
            .andExpect(jsonPath("$.assignments[0].employee_name").value("Second Empleado"));
    }

    @Test
    void myDashboardReturnsPayloadForAuthenticatedUser() throws Exception {
        var currentUser = new AuthSessionUser(7L, 1L, "Attendance User", "user");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrAttendanceService.selfDashboard(eq(1L), eq(7L), any())).willReturn(Map.of(
            "date", "2026-04-07",
            "summary", Map.of("total_employees", 1, "on_time_count", 1),
            "items", java.util.List.of(Map.of("employee_id", 12, "status", "on_time")),
            "employees", java.util.List.of(Map.of("id", 12, "full_name", "Attendance User")),
            "locations", java.util.List.of()
        ));

        mockMvc.perform(get("/api/v1/hr/attendance/me/dashboard").param("date", "2026-04-07"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.summary.total_employees").value(1))
            .andExpect(jsonPath("$.items[0].employee_id").value(12));
    }

    @Test
    void createLocationReturnsCreatedPayloadForAuthenticatedUser() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrAttendanceService.saveLocation(eq(1L), eq(1L), eq(null), anyMap())).willReturn(Map.of(
            "location", Map.of(
                "id", 9,
                "name", "North Gate",
                "status", "active"
            )
        ));

        mockMvc.perform(
            post("/api/v1/hr/attendance/locations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "name": "North Gate",
                      "latitude": 25.700001,
                      "longitude": -100.300001,
                      "radius_meters": 80,
                      "status": "active"
                    }
                    """)
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.location.id").value(9))
            .andExpect(jsonPath("$.location.name").value("North Gate"));
    }

    @Test
    void updateScheduleTemplateReturnsBadRequestWhenValidationFails() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrAttendanceService.saveScheduleTemplate(eq(1L), eq(1L), eq(3L), anyMap()))
            .willThrow(new IllegalArgumentException("Schedule template name must be unique."));

        mockMvc.perform(
            put("/api/v1/hr/attendance/schedule-templates/3")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "name": "Spring Default Schedule",
                      "status": "active",
                      "days": []
                    }
                    """)
        )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Schedule template name must be unique."));
    }

    @Test
    void bulkAssignReturnsPayloadForAuthenticatedUser() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrAttendanceService.bulkAssignScheduleTemplate(eq(1L), eq(1L), anyMap())).willReturn(Map.of(
            "assigned_count", 1,
            "template_name", "Late Shift",
            "assignments", java.util.List.of(Map.of("employee_id", 2, "employee_name", "Second Empleado"))
        ));

        mockMvc.perform(
            post("/api/v1/hr/attendance/schedule-assignments/bulk")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "employee_ids": [2],
                      "template_id": 4,
                      "effective_start_date": "2026-04-10"
                    }
                    """)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.assigned_count").value(1))
            .andExpect(jsonPath("$.template_name").value("Late Shift"))
            .andExpect(jsonPath("$.assignments[0].employee_name").value("Second Empleado"));
    }

    @Test
    void kioskDevicesReturnsPayloadForAuthenticatedUser() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrAttendanceService.listKioskDevices(eq(1L))).willReturn(Map.of(
            "items", java.util.List.of(Map.of("id", 1, "code", "spring-front-kiosk", "name", "Spring Front Kiosk"))
        ));

        mockMvc.perform(get("/api/v1/hr/attendance/kiosk-devices"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].code").value("spring-front-kiosk"));
    }

    @Test
    void rotateKioskPublicAccessTokenRequiresAuthentication() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.empty());

        mockMvc.perform(post("/api/v1/hr/attendance/kiosk-devices/4/rotate-public-access-token"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void publicKioskBootstrapReturnsPayloadWithoutAuthentication() throws Exception {
        given(hrAttendanceService.publicKioskBootstrap("device-token")).willReturn(Map.of(
            "kiosk_device", Map.of("id", 4, "code", "front-kiosk", "name", "Front Kiosk"),
            "location", Map.of("id", 9, "name", "North Gate"),
            "auth_methods", java.util.List.of("pin", "badge"),
            "inactivity_timeout_seconds", 60
        ));

        mockMvc.perform(get("/api/v1/hr/attendance/public-kiosk/device-token/bootstrap"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.kiosk_device.code").value("front-kiosk"))
            .andExpect(jsonPath("$.auth_methods[0]").value("pin"));
    }

    @Test
    void publicKioskIdentifyReturnsPayloadWithoutAuthentication() throws Exception {
        given(hrAttendanceService.publicKioskIdentify(eq("device-token"), anyMap())).willReturn(Map.of(
            "auth_attempt_event_id", 10,
            "auth_method", "pin",
            "employee", Map.of(
                "id", 12,
                "employee_number", "EMP-0012",
                "full_name", "Attendance User"
            ),
            "identification_token", "signed-token",
            "expires_at", "2026-04-14T18:00:00Z"
        ));

        mockMvc.perform(
            post("/api/v1/hr/attendance/public-kiosk/device-token/identify")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "auth_method": "pin",
                      "credential_payload": "1234"
                    }
                    """)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.employee.id").value(12))
            .andExpect(jsonPath("$.identification_token").value("signed-token"));
    }

    @Test
    void publicKioskPunchReturnsCreatedPayloadWithoutAuthentication() throws Exception {
        given(hrAttendanceService.publicKioskPunch(eq("device-token"), anyMap())).willReturn(Map.of(
            "event_id", 14,
            "employee_id", 12,
            "event_kind", "check_in",
            "status", "on_time"
        ));

        mockMvc.perform(
            post("/api/v1/hr/attendance/public-kiosk/device-token/punch")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "identification_token": "signed-token",
                      "event_type": "check_in"
                    }
                    """)
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.event_id").value(14))
            .andExpect(jsonPath("$.event_kind").value("check_in"));
    }

    @Test
    void createAccessProfileReturnsCreatedPayload() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrAttendanceService.saveAccessProfile(eq(1L), eq(1L), eq(null), anyMap())).willReturn(Map.of(
            "access_profile", Map.of("id", 7, "employee_id", 2, "default_method", "manual_override")
        ));

        mockMvc.perform(
            post("/api/v1/hr/attendance/access-profiles")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "employee_id": 2,
                      "status": "active",
                      "default_method": "manual_override"
                    }
                    """)
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.access_profile.id").value(7))
            .andExpect(jsonPath("$.access_profile.default_method").value("manual_override"));
    }

    @Test
    void updateAccessMethodReturnsPayload() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrAttendanceService.saveAccessMethod(eq(1L), eq(8L), anyMap())).willReturn(Map.of(
            "access_method", Map.of("id", 8, "method_type", "pin", "status", "active")
        ));

        mockMvc.perform(
            put("/api/v1/hr/attendance/access-methods/8")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "access_profile_id": 4,
                      "method_type": "pin",
                      "secret": "1234",
                      "status": "active",
                      "priority": 10
                    }
                    """)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.access_method.id").value(8))
            .andExpect(jsonPath("$.access_method.method_type").value("pin"));
    }

    @Test
    void presignUploadRequiresAuthentication() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.empty());

        mockMvc.perform(
            post("/api/v1/hr/attendance/media/presign-upload")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "employee_id": 2,
                      "content_type": "image/jpeg"
                    }
                    """)
        )
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void presignUploadReturnsPayloadForAuthenticatedUser() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrAttendanceService.createPhotoUpload(eq(1L), anyMap())).willReturn(Map.of(
            "object_key", "hr/attendance/1/2/2026/04/07/check_in-demo.jpg",
            "upload_url", "http://127.0.0.1:9000/upload",
            "expires_at", "2026-04-07T16:00:00Z",
            "upload_headers", Map.of("Content-Type", "image/jpeg")
        ));

        mockMvc.perform(
            post("/api/v1/hr/attendance/media/presign-upload")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "employee_id": 2,
                      "content_type": "image/jpeg",
                      "event_type": "check_in"
                    }
                    """)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.object_key").value("hr/attendance/1/2/2026/04/07/check_in-demo.jpg"))
            .andExpect(jsonPath("$.upload_url").value("http://127.0.0.1:9000/upload"))
            .andExpect(jsonPath("$.upload_headers.Content-Type").value("image/jpeg"));
    }

    @Test
    void presignUploadReturnsServiceUnavailableWhenStorageIsDisabled() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrAttendanceService.createPhotoUpload(eq(1L), anyMap()))
            .willThrow(new ObjectStorageDisabledException("Object storage is not enabled."));

        mockMvc.perform(
            post("/api/v1/hr/attendance/media/presign-upload")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "employee_id": 2,
                      "content_type": "image/jpeg"
                    }
                    """)
        )
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.message").value("Object storage is not enabled."));
    }

    @Test
    void myKioskEventReturnsPayloadForAuthenticatedUser() throws Exception {
        var currentUser = new AuthSessionUser(7L, 1L, "Attendance User", "user");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrAttendanceService.recordSelfKioskEvent(eq(1L), eq(7L), anyMap())).willReturn(Map.of(
            "employee_id", 12,
            "status", "on_time"
        ));

        mockMvc.perform(
            post("/api/v1/hr/attendance/me/kiosk-events")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "event_type": "check_in",
                      "location_id": 1,
                      "latitude": 25.7,
                      "longitude": -100.3
                    }
                    """)
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.employee_id").value(12))
            .andExpect(jsonPath("$.status").value("on_time"));
    }

    @Test
    void myDailyRecordUpdateReturnsPayload() throws Exception {
        var currentUser = new AuthSessionUser(7L, 1L, "Attendance User", "user");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrAttendanceService.updateSelfDailyRecord(eq(1L), eq(7L), any(), anyMap())).willReturn(Map.of(
            "employee_id", 12,
            "date", "2026-04-07",
            "effective_status", "leave"
        ));

        mockMvc.perform(
            put("/api/v1/hr/attendance/me/daily-records/2026-04-07")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "status": "leave"
                    }
                    """)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.employee_id").value(12))
            .andExpect(jsonPath("$.effective_status").value("leave"));
    }
}
