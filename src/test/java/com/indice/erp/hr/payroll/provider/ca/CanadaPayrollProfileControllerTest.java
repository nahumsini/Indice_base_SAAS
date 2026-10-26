package com.indice.erp.hr.payroll.provider.ca;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

class CanadaPayrollProfileControllerTest {
    @Test void unauthenticatedReadsAndWritesFailClosed() {
        var auth = mock(SessionAuthService.class);
        var csrf = mock(SessionCsrfService.class);
        var profiles = mock(CanadaPayrollProfileService.class);
        var session = new MockHttpSession();
        when(auth.currentUser(session)).thenReturn(Optional.empty());
        var controller = new CanadaPayrollProfileController(auth, csrf, profiles);
        assertEquals(401, controller.get(session, 1).getStatusCode().value());
        assertEquals(401, controller.save(session, 1, null, null).getStatusCode().value());
        verifyNoInteractions(profiles, csrf);
    }
    @Test void missingCsrfNeverReachesProfileMutation() {
        var auth = mock(SessionAuthService.class);
        var csrf = mock(SessionCsrfService.class);
        var profiles = mock(CanadaPayrollProfileService.class);
        var session = new MockHttpSession();
        when(auth.currentUser(session)).thenReturn(Optional.of(new AuthSessionUser(1L, 2L, "Synthetic", "root")));
        doThrow(new IllegalArgumentException("invalid")).when(csrf).requireCsrf(session, null);
        var controller = new CanadaPayrollProfileController(auth, csrf, profiles);
        assertEquals(403, controller.save(session, 1, null, null).getStatusCode().value());
        verifyNoInteractions(profiles);
    }
}
