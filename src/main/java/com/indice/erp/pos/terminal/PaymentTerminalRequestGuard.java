package com.indice.erp.pos.terminal;

import com.indice.erp.access.tab.TabPermissionAccessService;
import com.indice.erp.access.tab.TabPermissionRequirement;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.pos.PosRequestGuard;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

@Component
public record PaymentTerminalRequestGuard(PosRequestGuard guard,
        SessionAuthService auth, TabPermissionAccessService tabs) {
    public PosRequestGuard.Result read(HttpSession session) {
        return check(session, guard.requireReadAccess(session), "pos.sale");
    }
    public PosRequestGuard.Result write(HttpSession session, String csrf) {
        return check(session, guard.requireWriteAccess(session, csrf), "pos.sale");
    }
    public PosRequestGuard.Result adminRead(HttpSession session) {
        return check(session, guard.requireAdminReadAccess(session), "pos.cortes");
    }
    public PosRequestGuard.Result setupRead(HttpSession session) {
        return check(session, guard.requireReadAccess(session), "pos.sale", "pos.cortes");
    }
    public PosRequestGuard.Result adminSetupRead(HttpSession session) {
        return check(session, guard.requireAdminReadAccess(session), "pos.sale", "pos.cortes");
    }
    public PosRequestGuard.Result adminWrite(HttpSession session, String csrf) {
        return check(session, guard.requireAdminWriteAccess(session, csrf), "pos.cortes");
    }

    private PosRequestGuard.Result check(HttpSession session,
            PosRequestGuard.Result result, String... permissions) {
        if (result.denied()) return result;
        var user = auth.currentUser(session).orElse(null);
        if (user != null && java.util.Objects.equals(user.userId(), result.context().userId())
                && java.util.Objects.equals(user.companyId(), result.context().companyId())
                && java.util.Objects.equals(user.role(), result.context().role())
                && tabs.canAccess(user, TabPermissionRequirement.any(permissions))) {
            return result;
        }
        return new PosRequestGuard.Result(null, ResponseEntity.status(403).body(
            java.util.Map.of("message", "Payment terminal permission is required.")));
    }
}
