package com.indice.erp.hr.payroll;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrAccessDeniedException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HrPayrollAuthorizationServiceTest {

    private final HrPayrollAuthorizationService service = new HrPayrollAuthorizationService();

    @Test
    void adminCanOperateAndConfigurePayrollButCannotOverrideSeparationOfDuties() {
        var user = new AuthSessionUser(7L, 1L, "Payroll Admin", "administrator");

        assertDoesNotThrow(() -> service.require(user, HrPayrollAuthorizationService.Action.PREPARE));
        assertDoesNotThrow(() -> service.require(user, HrPayrollAuthorizationService.Action.APPROVE));
        assertDoesNotThrow(() -> service.require(user, HrPayrollAuthorizationService.Action.PAY));
        assertDoesNotThrow(() -> service.require(user, HrPayrollAuthorizationService.Action.CONFIGURE));
        assertFalse(service.canOverrideSeparationOfDuties(user.role()));
    }

    @Test
    void managerCanPrepareButCannotApprovePayOrConfigure() {
        var user = new AuthSessionUser(8L, 1L, "Payroll Manager", "manager");

        assertTrue(service.can(user, HrPayrollAuthorizationService.Action.PREPARE));
        assertFalse(service.can(user, HrPayrollAuthorizationService.Action.APPROVE));
        assertFalse(service.can(user, HrPayrollAuthorizationService.Action.PAY));
        assertFalse(service.can(user, HrPayrollAuthorizationService.Action.CONFIGURE));
    }

    @Test
    void ordinaryUserCannotMutatePayroll() {
        var user = new AuthSessionUser(9L, 1L, "Employee", "user");

        assertThrows(
            HrAccessDeniedException.class,
            () -> service.require(user, HrPayrollAuthorizationService.Action.PREPARE)
        );
    }

    @Test
    void ownerAndSuperAdminAliasesCanOverrideSeparationOfDuties() {
        assertTrue(service.canOverrideSeparationOfDuties("owner"));
        assertTrue(service.canOverrideSeparationOfDuties("super_admin"));
        assertTrue(service.canOverrideSeparationOfDuties("due\u00f1o"));
    }
}
