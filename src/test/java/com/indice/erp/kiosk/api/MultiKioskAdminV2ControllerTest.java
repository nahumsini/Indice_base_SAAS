package com.indice.erp.kiosk.api;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.kiosk.engine.KioskEngineFeatureFlags;
import com.indice.erp.kiosk.engine.KioskUnavailableException;
import com.indice.erp.kiosk.engine.MultiKioskService;
import com.indice.erp.kiosk.engine.ProviderCenterAccessAdminService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class MultiKioskAdminV2ControllerTest {

    private final KioskInternalRequestGuard guard = mock(KioskInternalRequestGuard.class);
    private final KioskEngineFeatureFlags flags = mock(KioskEngineFeatureFlags.class);
    private final MultiKioskService multiKiosks = mock(MultiKioskService.class);
    private final ProviderCenterAccessAdminService providerAccess = mock(ProviderCenterAccessAdminService.class);
    private final KioskV2ResponseFactory responses = mock(KioskV2ResponseFactory.class);
    private final HttpSession session = mock(HttpSession.class);
    private MultiKioskAdminV2Controller controller;

    @BeforeEach
    void setUp() {
        when(flags.registryEnabled()).thenReturn(true);
        when(flags.sessionsEnabled()).thenReturn(true);
        when(flags.auditEnabled()).thenReturn(true);
        when(flags.globalCenterEnabled()).thenReturn(true);
        when(flags.multiDashboardEnabled()).thenReturn(false);
        controller = new MultiKioskAdminV2Controller(
            guard, flags, multiKiosks, providerAccess, responses);
    }

    @Test
    void rejectsAdministrativeMutationWhenMultiDashboardIsDisabled() {
        assertThatThrownBy(() -> controller.create(
            session, "csrf-token", Map.of("name", "Operations")))
            .isInstanceOf(KioskUnavailableException.class);

        verifyNoInteractions(guard, multiKiosks, responses);
    }

    @Test
    void manualProviderPinChangeRequiresTheProtectedCenterWritePath() {
        when(flags.multiDashboardEnabled()).thenReturn(true);
        when(guard.requireCenterWrite(session, "csrf-token"))
            .thenReturn(new AuthSessionUser(9L, 7L, "Root", "root"));
        when(providerAccess.updatePin(7L, 44L, 80L, 9L, "482731"))
            .thenReturn(Map.of("pin", "482731"));

        controller.updateProviderPin(
            session, "csrf-token", 44L, 80L,
            new ProviderCenterPinUpdateRequest("482731"));

        verify(guard).requireCenterWrite(session, "csrf-token");
        verify(providerAccess).updatePin(7L, 44L, 80L, 9L, "482731");
    }
}
