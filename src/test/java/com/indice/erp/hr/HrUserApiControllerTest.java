package com.indice.erp.hr;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.hr.users.HrUserApiController;
import com.indice.erp.hr.users.HrUserService;
import com.indice.erp.storage.ObjectStorageDisabledException;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(HrUserApiController.class)
class HrUserApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SessionAuthService sessionAuthService;

    @MockitoBean
    private HrUserService hrUserService;

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
        given(hrUserService.listUsers(1L)).willReturn(serviceResult);

        mockMvc.perform(get("/api/v1/hr/users"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.count").value(1))
            .andExpect(jsonPath("$.items[0].full_name").value("Second Empleado"))
            .andExpect(jsonPath("$.summary.total_count").value(1));
    }

    @Test
    void updateReturnsNotFoundWhenHrUserIsMissing() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrUserService.updateUser(anyLong(), any(Map.class)))
            .willThrow(new NoSuchElementException("HR user not found."));

        mockMvc.perform(put("/api/v1/hr/users/999")
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
        given(hrUserService.getUserDetails(1L, 12L)).willReturn(detailBody);

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
        given(hrUserService.createDocumentUpload(anyLong(), anyLong(), any(Map.class)))
            .willThrow(new ObjectStorageDisabledException("Object storage is not enabled."));

        mockMvc.perform(post("/api/v1/hr/users/12/documents/presign-upload")
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
}
