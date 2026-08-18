package com.indice.erp.kiosk.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.kiosk.engine.KioskCenterService;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.pos.PosRequestGuard;
import com.indice.erp.pos.customerdisplay.CustomerDisplayService;
import com.indice.erp.pos.selfservice.SelfServiceKioskService;
import com.indice.erp.pos.shift.ShiftRepository;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class PointOfSaleKioskAdminV2ControllerAuthorizationTest {

    private final PosRequestGuard guard = mock(PosRequestGuard.class);
    private final CustomerDisplayService customerDisplays = mock(CustomerDisplayService.class);
    private final SelfServiceKioskService selfService = mock(SelfServiceKioskService.class);
    private final KioskRegistryService registry = mock(KioskRegistryService.class);
    private final KioskCenterService center = mock(KioskCenterService.class);
    private final ShiftRepository shifts = mock(ShiftRepository.class);
    private final KioskV2ResponseFactory responses = mock(KioskV2ResponseFactory.class);
    private final ObjectMapper objectMapper = mock(ObjectMapper.class);
    private final Validator validator = mock(Validator.class);
    private final HttpSession session = mock(HttpSession.class);
    private PointOfSaleKioskAdminV2Controller controller;

    @BeforeEach
    void setUp() {
        controller = new PointOfSaleKioskAdminV2Controller(
            guard, customerDisplays, selfService, registry, center,
            shifts, responses, objectMapper, validator);
    }

    @Test
    void requiresAdministrativeReadAccessForEveryManagementRead() {
        when(guard.requireAdminReadAccess(session)).thenReturn(forbidden());

        controller.list(session, null);
        controller.detail(session, 11L);
        controller.publicAccess(session, 11L);
        controller.audit(session, 11L);

        verify(guard, times(4)).requireAdminReadAccess(session);
        verify(guard, never()).requireReadAccess(session);
        verifyNoManagementInteractions();
    }

    @Test
    void requiresAdministrativeWriteAccessForEveryManagementMutation() {
        when(guard.requireAdminWriteAccess(session, "csrf")).thenReturn(forbidden());

        controller.create(session, "csrf", "self_service", null);
        controller.update(session, "csrf", 11L, null);
        controller.rotate(session, "csrf", 11L);
        controller.disable(session, "csrf", 11L, null);
        controller.enable(session, "csrf", 11L, null);
        controller.revoke(session, "csrf", 11L, null);
        controller.delete(session, "csrf", 11L, null);

        verify(guard, times(7)).requireAdminWriteAccess(session, "csrf");
        verify(guard, never()).requireWriteAccess(session, "csrf");
        verifyNoManagementInteractions();
    }

    private void verifyNoManagementInteractions() {
        verifyNoInteractions(
            customerDisplays, selfService, registry, center,
            shifts, responses, objectMapper, validator);
    }

    private PosRequestGuard.Result forbidden() {
        return new PosRequestGuard.Result(
            null, ResponseEntity.status(HttpStatus.FORBIDDEN).build());
    }
}
