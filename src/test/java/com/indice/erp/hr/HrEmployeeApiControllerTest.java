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
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(HrEmployeeApiController.class)
class HrEmployeeApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionAuthService sessionAuthService;

    @MockBean
    private HrEmployeeService hrEmployeeService;

    @Test
    void listReturnsUnauthorizedWhenSessionIsMissing() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/hr/employees"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void listReturnsExpectedEnvelopeForAuthenticatedSession() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");
        var employee = new LinkedHashMap<String, Object>();
        employee.put("id", 2L);
        employee.put("full_name", "Second Empleado");
        employee.put("email", "second.employee.spring@example.com");
        employee.put("employee_number", "");
        employee.put("status", "active");
        employee.put("position_title", "Senior Analyst");
        employee.put("department", "Finance");
        employee.put("phone", "");
        employee.put("hire_date", null);
        employee.put("salary", new BigDecimal("6500.00"));

        var serviceResult = new LinkedHashMap<String, Object>();
        serviceResult.put("rows", List.of(employee));
        serviceResult.put("meta", Map.of(
            "total_count", 1,
            "total_payroll_amount_monthly", new BigDecimal("6500.00")
        ));

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrEmployeeService.listEmployees(1L)).willReturn(serviceResult);

        mockMvc.perform(get("/api/v1/hr/employees"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.count").value(1))
            .andExpect(jsonPath("$.items[0].full_name").value("Second Empleado"))
            .andExpect(jsonPath("$.summary.total_count").value(1));
    }

    @Test
    void updateReturnsNotFoundWhenEmployeeIsMissing() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrEmployeeService.updateEmployee(anyLong(), any(Map.class)))
            .willThrow(new NoSuchElementException("Employee not found."));

        mockMvc.perform(put("/api/v1/hr/employees/999")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "first_name": "Missing"
                    }
                    """))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message").value("Employee not found."));
    }

    @Test
    void detailsReturnsExpandedEmployeeEnvelope() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");
        var detailBody = new LinkedHashMap<String, Object>();
        detailBody.put("employee_id", 12L);
        detailBody.put("employee", Map.of(
            "id", 12L,
            "full_name", "Jordan Smith",
            "email", "jordan@example.com"
        ));
        detailBody.put("profile", Map.of(
            "registration_country", "CA",
            "state_province", "Ontario"
        ));
        detailBody.put("access", Map.of(
            "access_role", "manager",
            "invitation_status", "not_invited"
        ));
        detailBody.put("documents", List.of());

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrEmployeeService.getEmployeeDetails(1L, 12L)).willReturn(detailBody);

        mockMvc.perform(get("/api/v1/hr/employees/12"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.employee_id").value(12))
            .andExpect(jsonPath("$.employee.full_name").value("Jordan Smith"))
            .andExpect(jsonPath("$.profile.registration_country").value("CA"))
            .andExpect(jsonPath("$.access.access_role").value("manager"));
    }

    @Test
    void documentPresignReturnsServiceUnavailableWhenStorageIsDisabled() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrEmployeeService.createDocumentUpload(anyLong(), anyLong(), any(Map.class)))
            .willThrow(new ObjectStorageDisabledException("Object storage is not enabled."));

        mockMvc.perform(post("/api/v1/hr/employees/12/documents/presign-upload")
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
