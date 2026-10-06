package com.indice.erp.platformadmin.leads;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.platformadmin.PlatformAdminForbiddenException;
import jakarta.servlet.http.HttpSession;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PlatformLeadAnalyticsControllerTest {
    private final SessionAuthService auth = mock(SessionAuthService.class);
    private final PlatformLeadAnalyticsService service = mock(PlatformLeadAnalyticsService.class);
    private final HttpSession session = mock(HttpSession.class);
    private final PlatformLeadAnalyticsController controller = new PlatformLeadAnalyticsController(auth, service);

    @Test void unauthenticatedReportingNeverCallsBusinessLogic() {
        when(auth.currentUser(session)).thenReturn(Optional.empty());
        assertThat(controller.dashboard(session, 30, "all").getStatusCode().value()).isEqualTo(401);
        assertThat(controller.details(session, 30, "all", "received", "", "", "", "", 1, 25).getStatusCode().value()).isEqualTo(401);
        verifyNoInteractions(service);
    }

    @Test void actorComesFromTheSessionAndDeniedReadsReturn403() {
        when(auth.currentUser(session)).thenReturn(Optional.of(new AuthSessionUser(9L, 1L, "Operator", "admin")));
        when(service.dashboard(9, 30, "MX")).thenThrow(new PlatformAdminForbiddenException("Denied"));
        assertThat(controller.dashboard(session, 30, "MX").getStatusCode().value()).isEqualTo(403);
        when(service.details(9, 30, "MX", "received", "", "", "", "", 1, 25))
            .thenThrow(new PlatformAdminForbiddenException("Denied"));
        assertThat(controller.details(session, 30, "MX", "received", "", "", "", "", 1, 25).getStatusCode().value()).isEqualTo(403);
    }

    @Test void routeBindingAcceptsTheDeclaredScopeAndRejectsInvalidQueries() throws Exception {
        when(auth.currentUser(any(HttpSession.class))).thenReturn(Optional.of(new AuthSessionUser(9L, 1L, "Operator", "admin")));
        var mvc = MockMvcBuilders.standaloneSetup(controller).build();
        mvc.perform(get("/api/v1/platform-admin/leads/analytics").param("market", "CA"))
            .andExpect(status().isOk());
        verify(service).dashboard(9, 30, "CA");
        mvc.perform(get("/api/v1/platform-admin/leads/analytics/details").param("days", "7")
            .param("view", "received").param("source", "LinkedIn").param("page", "9"))
            .andExpect(status().isOk());
        verify(service).details(9, 7, "all", "received", "LinkedIn", "", "", "", 9, 25);
        when(service.dashboard(9, 12, "all")).thenThrow(new IllegalArgumentException("Invalid period"));
        mvc.perform(get("/api/v1/platform-admin/leads/analytics").param("days", "12"))
            .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/platform-admin/leads/analytics").param("days", "not-a-number"))
            .andExpect(status().isBadRequest());
    }
}
