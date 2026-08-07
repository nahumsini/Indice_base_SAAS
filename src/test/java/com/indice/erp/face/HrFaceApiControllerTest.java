package com.indice.erp.face;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.hr.HrAccessDeniedException;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(HrFaceApiController.class)
class HrFaceApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionAuthService sessionAuthService;

    @MockBean
    private SessionCsrfService sessionCsrfService;

    @MockBean
    private HrFaceAccessService hrFaceAccessService;

    @MockBean
    private HrFaceService hrFaceService;

    @Test
    void createEnrollmentSessionReturnsUnauthorizedWhenSessionIsMissing() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.empty());

        mockMvc.perform(
            post("/api/v1/hr/face/enrollment-sessions")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "user_company_id": 12
                    }
                    """)
        )
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void createEnrollmentSessionReturnsForbiddenWhenTargetIsOutOfScope() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Scoped Admin", "admin");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        doThrow(new HrAccessDeniedException("Forbidden"))
            .when(hrFaceAccessService)
            .requireEnrollmentTargetInScope(eq(currentUser), eq(12L));

        mockMvc.perform(
            post("/api/v1/hr/face/enrollment-sessions")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "user_company_id": 12
                    }
                    """)
        )
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    @Test
    void writeEndpointsRejectMissingCsrfBeforeScopeAndServiceCalls() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(new AuthSessionUser(1L, 7L, "Scoped Admin", "admin")));
        willThrow(new IllegalArgumentException("Invalid CSRF token."))
            .given(sessionCsrfService)
            .requireCsrf(any(), eq(null));

        for (var request : faceWriteRequests()) {
            mockMvc.perform(request)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Invalid CSRF token."));
        }

        verifyNoInteractions(hrFaceAccessService, hrFaceService);
    }

    @Test
    void createEnrollmentSessionReturnsCreatedPayloadWhenAllowed() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Scoped Admin", "admin");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrFaceService.createEnrollmentSession(eq(7L), eq(1L), anyMap())).willReturn(Map.of(
            "id", 55,
            "user_company_id", 12,
            "status", "pending"
        ));

        mockMvc.perform(
            post("/api/v1/hr/face/enrollment-sessions")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "user_company_id": 12
                    }
                    """)
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(55))
            .andExpect(jsonPath("$.user_company_id").value(12));

        verify(sessionCsrfService).requireCsrf(any(), eq("csrf-token"));
    }

    @Test
    void getEnrollmentReturnsForbiddenWhenTargetIsOutOfScope() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Scoped Admin", "admin");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        doThrow(new HrAccessDeniedException("Forbidden"))
            .when(hrFaceAccessService)
            .requireEnrollmentTargetInScope(eq(currentUser), eq(12L));

        mockMvc.perform(get("/api/v1/hr/face/enrollments/12"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    @Test
    void deleteEnrollmentReturnsForbiddenWhenTargetIsOutOfScope() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Scoped Admin", "admin");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        doThrow(new HrAccessDeniedException("Forbidden"))
            .when(hrFaceAccessService)
            .requireEnrollmentTargetInScope(eq(currentUser), eq(12L));

        mockMvc.perform(delete("/api/v1/hr/face/enrollments/12"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    private java.util.List<MockHttpServletRequestBuilder> faceWriteRequests() {
        return java.util.List.of(
            post("/api/v1/hr/face/enrollment-sessions")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"user_company_id\":12}"),
            post("/api/v1/hr/face/enrollment-sessions/55/captures/presign-upload")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"),
            post("/api/v1/hr/face/enrollment-sessions/55/complete"),
            delete("/api/v1/hr/face/enrollments/12")
        );
    }
}
