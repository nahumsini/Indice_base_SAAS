package com.indice.erp.hr.payroll;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrAccessDeniedException;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

/**
 * Action-level authorization for payroll operations.
 *
 * <p>Tab access is still resolved by {@code HrAccessService}. This service adds the
 * second, narrower gate required by sensitive payroll transitions.</p>
 */
@Service
public class HrPayrollAuthorizationService {

    private static final Set<String> PREPARATION_ROLES = Set.of(
        "root", "superadmin", "admin", "owner", "dueno", "manager"
    );
    private static final Set<String> APPROVAL_ROLES = Set.of(
        "root", "superadmin", "admin", "owner", "dueno", "approver"
    );
    private static final Set<String> PAYMENT_ROLES = Set.of(
        "root", "superadmin", "admin", "owner", "dueno"
    );
    private static final Set<String> CONFIGURATION_ROLES = Set.of(
        "root", "superadmin", "admin", "owner", "dueno"
    );
    private static final Set<String> SEPARATION_OVERRIDE_ROLES = Set.of(
        "root", "superadmin", "owner", "dueno"
    );

    public boolean can(AuthSessionUser user, Action action) {
        var role = normalizeRole(user == null ? null : user.role());
        return switch (action) {
            case PREPARE, CANCEL -> PREPARATION_ROLES.contains(role);
            case APPROVE, REPORTING -> APPROVAL_ROLES.contains(role);
            case PAY -> PAYMENT_ROLES.contains(role);
            case CONFIGURE -> CONFIGURATION_ROLES.contains(role);
        };
    }

    public void require(AuthSessionUser user, Action action) {
        if (!can(user, action)) {
            throw new HrAccessDeniedException("Forbidden");
        }
    }

    public boolean canOverrideSeparationOfDuties(String rawRole) {
        return SEPARATION_OVERRIDE_ROLES.contains(normalizeRole(rawRole));
    }

    public Map<String, Object> capabilities(AuthSessionUser user) {
        var body = new LinkedHashMap<String, Object>();
        body.put("can_prepare", can(user, Action.PREPARE));
        body.put("can_approve", can(user, Action.APPROVE));
        body.put("can_pay", can(user, Action.PAY));
        body.put("can_cancel", can(user, Action.CANCEL));
        body.put("can_configure", can(user, Action.CONFIGURE));
        body.put("can_manage_reporting", can(user, Action.REPORTING));
        body.put("can_override_separation_of_duties", canOverrideSeparationOfDuties(user == null ? null : user.role()));
        return body;
    }

    private String normalizeRole(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "super admin", "super_admin" -> "superadmin";
            case "administrator" -> "admin";
            case "due\u00f1o" -> "dueno";
            default -> normalized;
        };
    }

    public enum Action {
        PREPARE,
        APPROVE,
        PAY,
        CANCEL,
        CONFIGURE,
        REPORTING
    }
}
