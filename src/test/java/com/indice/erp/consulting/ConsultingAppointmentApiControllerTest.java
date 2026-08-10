package com.indice.erp.consulting;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ConsultingAppointmentApiController.class)
class ConsultingAppointmentApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionAuthService sessionAuthService;

    @MockBean
    private SessionCsrfService sessionCsrfService;

    @MockBean
    private ConsultingAppointmentService service;

    @Test
    void workspaceRequiresAnAuthenticatedSession() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/consulting/workspace"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void workspaceReturnsBookingConfigurationAndHistory() throws Exception {
        var user = new AuthSessionUser(7L, 31L, 91L, "Owner", "owner");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(user));
        given(service.workspace(user)).willReturn(Map.of(
            "duration_minutes", 50,
            "included_session_available", true,
            "additional_session_amount_cents", 8900,
            "currency", "USD",
            "join_window_minutes", 15,
            "topics", List.of(Map.of("value", "ONBOARDING", "module", false)),
            "in_person_locations", List.of(Map.of(
                "id", 1L,
                "country_code", "MX",
                "location_code", "MX-MTY",
                "region_name", "Nuevo León",
                "city_name", "Monterrey"
            )),
            "appointments", List.of()
        ));

        mockMvc.perform(get("/api/v1/consulting/workspace"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.duration_minutes").value(50))
            .andExpect(jsonPath("$.included_session_available").value(true))
            .andExpect(jsonPath("$.additional_session_amount_cents").value(8900))
            .andExpect(jsonPath("$.join_window_minutes").value(15))
            .andExpect(jsonPath("$.in_person_locations[0].location_code").value("MX-MTY"));
    }

    @Test
    void createValidatesCsrfAndReturnsTheSavedRequest() throws Exception {
        var user = new AuthSessionUser(7L, 31L, 91L, "Owner", "owner");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(user));
        given(service.create(eq(user), any(ConsultingAppointmentService.BookingRequest.class)))
            .willReturn(Map.of("id", 42L, "status", "REQUESTED", "session_kind", "INCLUDED"));

        mockMvc.perform(post("/api/v1/consulting/appointments")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "attendeeName": "Owner",
                      "attendeeEmail": "owner@example.com",
                      "attendeePhone": "+52 81 0000 0000",
                      "topic": "ONBOARDING",
                      "consultationMode": "VIRTUAL",
                      "notes": "Initial implementation",
                      "preferredStartAt": "2026-08-12T16:00:00Z",
                      "alternativeStartAt": "2026-08-13T16:00:00Z",
                      "timezone": "America/Monterrey"
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(42))
            .andExpect(jsonPath("$.status").value("REQUESTED"));

        verify(sessionCsrfService).requireCsrf(any(), eq("csrf-token"));
        verify(service).create(eq(user), any(ConsultingAppointmentService.BookingRequest.class));
    }

    @Test
    void cancelValidatesCsrfAndScopesTheAppointmentToTheCurrentCompany() throws Exception {
        var user = new AuthSessionUser(7L, 31L, 91L, "Owner", "owner");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(user));
        given(service.cancel(eq(user), eq(42L), any(ConsultingAppointmentService.CancelRequest.class)))
            .willReturn(Map.of("id", 42L, "status", "CANCELLED"));

        mockMvc.perform(post("/api/v1/consulting/appointments/42/cancel")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(APPLICATION_JSON)
                .content("{\"reason\":\"Schedule changed\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("CANCELLED"));

        verify(sessionCsrfService).requireCsrf(any(), eq("csrf-token"));
        verify(service).cancel(eq(user), eq(42L), any(ConsultingAppointmentService.CancelRequest.class));
    }
}
