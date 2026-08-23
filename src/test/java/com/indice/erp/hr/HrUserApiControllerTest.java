package com.indice.erp.hr;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.billing.seats.SeatCapacityExceededException;
import com.indice.erp.billing.seats.SeatService.SeatSnapshot;
import com.indice.erp.hr.HrAccessService.HrTab;
import com.indice.erp.hr.users.HrUserApiController;
import com.indice.erp.hr.users.HrUserService;
import com.indice.erp.storage.ObjectStorageDisabledException;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;


@WebMvcTest(HrUserApiController.class)
class HrUserApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SessionAuthService sessionAuthService;

    @MockitoBean
    private SessionCsrfService sessionCsrfService;

    @MockitoBean
    private HrUserService hrUserService;

    @MockitoBean
    private HrAccessService hrAccessService;

    @BeforeEach
    void allowHrAccessByDefault() {
        given(hrAccessService.canAccessManagementTab(any(AuthSessionUser.class), any(HrTab.class)))
            .willReturn(true);
    }

    @Test
    void listReturnsUnauthorizedWhenSessionIsMissing() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/hr/users"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void listReturnsExpectedEnvelopeForAuthenticatedSession() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");
        var hrUser = new LinkedHashMap<String, Object>();
        hrUser.put("id", 2L);
        hrUser.put("full_name", "Second Empleado");
        hrUser.put("email", "second.hr-user.spring@example.com");
        hrUser.put("user_code", "");
        hrUser.put("status", "active");
        hrUser.put("position_title", "Senior Analyst");
        hrUser.put("department", "Finance");
        hrUser.put("phone", "");
        hrUser.put("hire_date", null);
        hrUser.put("salary", new BigDecimal("6500.00"));

        var serviceResult = new LinkedHashMap<String, Object>();
        serviceResult.put("rows", List.of(hrUser));
        serviceResult.put("meta", Map.of(
            "total_count", 1,
            "total_payroll_amount_monthly", new BigDecimal("6500.00")
        ));

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrUserService.listUsers(currentUser)).willReturn(serviceResult);

        mockMvc.perform(get("/api/v1/hr/users"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.count").value(1))
            .andExpect(jsonPath("$.items[0].full_name").value("Second Empleado"))
            .andExpect(jsonPath("$.summary.total_count").value(1));
    }

    @Test
    void listReturnsForbiddenWhenCollaboratorsTabIsDenied() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrAccessService.canAccessManagementTab(currentUser, HrTab.COLLABORATORS)).willReturn(false);

        mockMvc.perform(get("/api/v1/hr/users"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Forbidden"));
    }


    @Test
    void writeEndpointsRejectMissingCsrfToken() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser()));
        willThrow(new IllegalArgumentException("Invalid CSRF token."))
            .given(sessionCsrfService).requireCsrf(any(), eq(null));

        for (var request : employeeWriteRequests()) {
            mockMvc.perform(request)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Invalid CSRF token."));
        }

        verifyNoInteractions(hrUserService);
    }

    @Test
    void writeEndpointsRejectInvalidCsrfToken() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser()));
        willThrow(new IllegalArgumentException("Invalid CSRF token."))
            .given(sessionCsrfService).requireCsrf(any(), eq("bad-token"));

        for (var request : employeeWriteRequests()) {
            mockMvc.perform(request.header("X-CSRF-Token", "bad-token"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Invalid CSRF token."));
        }

        verifyNoInteractions(hrUserService);
    }

    @Test
    void createWithValidCsrfCallsService() throws Exception {
        var currentUser = currentUser();
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrUserService.createUser(any(AuthSessionUser.class), any(Map.class)))
            .willReturn(Map.of("user", Map.of("id", 21L, "full_name", "Ada Owner")));

        mockMvc.perform(post("/api/v1/hr/users")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "first_name": "Ada",
                      "last_name": "Owner",
                      "email": "ada@example.com"
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(21))
            .andExpect(jsonPath("$.full_name").value("Ada Owner"));

        verify(sessionCsrfService).requireCsrf(any(), eq("csrf-token"));
        verify(hrUserService).createUser(eq(currentUser), any(Map.class));
    }

    @Test
    void createBulkWithValidCsrfDelegatesAtomicImport() throws Exception {
        var currentUser = currentUser();
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrUserService.createUsersBulk(any(AuthSessionUser.class), any(Map.class)))
            .willReturn(Map.of("items", java.util.List.of(Map.of("id", 21L)), "count", 1));

        mockMvc.perform(post("/api/v1/hr/users/bulk")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "items": [{
                        "first_name": "Ada",
                        "last_name": "Owner",
                        "email": "ada@example.com"
                      }]
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.count").value(1));

        verify(hrUserService).createUsersBulk(eq(currentUser), any(Map.class));
    }

    @Test
    void createReturnsConflictWhenSeatsAreFull() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser()));
        given(hrUserService.createUser(any(AuthSessionUser.class), any(Map.class)))
            .willThrow(seatCapacityExceeded());

        mockMvc.perform(post("/api/v1/hr/users")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"first_name\":\"Ada\",\"email\":\"ada@example.com\"}"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("SEAT_CAPACITY_EXCEEDED"))
            .andExpect(jsonPath("$.seat_limit").value(5))
            .andExpect(jsonPath("$.seat_usage").value(5));
    }

    @Test
    void updateReturnsNotFoundWhenHrUserIsMissing() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrUserService.updateUser(any(AuthSessionUser.class), anyLong(), any(Map.class)))
            .willThrow(new NoSuchElementException("HR user not found."));

        mockMvc.perform(put("/api/v1/hr/users/999")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "first_name": "Missing"
                    }
                    """))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message").value("HR user not found."));
    }

    @Test
    void detailsReturnsExpandedHrUserEnvelope() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");
        var detailBody = new LinkedHashMap<String, Object>();
        detailBody.put("user_company_id", 12L);
        detailBody.put("user", Map.of(
            "id", 12L,
            "full_name", "Jordan Smith",
            "email", "jordan@example.com"
        ));
        detailBody.put("profile", Map.of(
            "registration_country", "CA",
            "state_province", "Ontario"
        ));
        detailBody.put("documents", List.of());

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrUserService.getUserDetails(currentUser, 12L)).willReturn(detailBody);

        mockMvc.perform(get("/api/v1/hr/users/12"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.user_company_id").value(12))
            .andExpect(jsonPath("$.user.full_name").value("Jordan Smith"))
            .andExpect(jsonPath("$.profile.registration_country").value("CA"))
            .andExpect(jsonPath("$.access").doesNotExist())
            .andExpect(jsonPath("$.documents").isArray());
    }

    @Test
    void documentPresignReturnsServiceUnavailableWhenStorageIsDisabled() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrUserService.createDocumentUpload(any(AuthSessionUser.class), anyLong(), any(Map.class)))
            .willThrow(new ObjectStorageDisabledException("Object storage is not enabled."));

        mockMvc.perform(post("/api/v1/hr/users/12/documents/presign-upload")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "document_type": "resume",
                      "file_name": "resume.pdf",
                      "content_type": "application/pdf",
                      "size_bytes": 1024
                    }
                    """))
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.message").value("Object storage is not enabled."));
    }

    @Test
    void detailsReturnsForbiddenWhenTargetIsOutsideOperationalScope() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Scoped Admin", "admin");

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrUserService.getUserDetails(currentUser, 77L))
            .willThrow(new HrAccessDeniedException("Forbidden"));

        mockMvc.perform(get("/api/v1/hr/users/77"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    private AuthSessionUser currentUser() {
        return new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");
    }

    private SeatCapacityExceededException seatCapacityExceeded() {
        return new SeatCapacityExceededException(
            "The company has reached its seat limit. Purchase another seat before adding this user.",
            new SeatSnapshot(1L, true, 5, 0, 0, 5, 0)
        );
    }

    private List<MockHttpServletRequestBuilder> employeeWriteRequests() {
        return List.of(
            post("/api/v1/hr/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"),
            put("/api/v1/hr/users/12")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"),
            post("/api/v1/hr/users/12/documents/presign-upload")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"),
            post("/api/v1/hr/users/12/documents")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"),
            delete("/api/v1/hr/users/12/documents/99"),
            post("/api/v1/hr/users/12/terminate")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"),
            delete("/api/v1/hr/users/12")
        );
    }
}
