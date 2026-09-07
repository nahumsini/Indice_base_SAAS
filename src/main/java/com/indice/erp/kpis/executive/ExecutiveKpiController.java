package com.indice.erp.kpis.executive;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/kpis")
public class ExecutiveKpiController {

    private final SessionAuthService sessionAuthService;
    private final ExecutiveKpiService executiveKpiService;
    private final com.indice.erp.kpis.KpiRequestAccessService access;

    public ExecutiveKpiController(SessionAuthService sessionAuthService, ExecutiveKpiService executiveKpiService, com.indice.erp.kpis.KpiRequestAccessService access) {
        this.sessionAuthService = sessionAuthService;
        this.executiveKpiService = executiveKpiService;
        this.access = access;
    }

    @GetMapping("/executive-panel")
    public ResponseEntity<?> executivePanel(HttpSession session, @RequestParam Map<String, String> params) {
        var user = currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            var selection = access.central(user.get(), "kpis", scopeId(params.get("unitId")), scopeId(params.get("businessId")));
            return ResponseEntity.ok(executiveKpiService.getExecutivePanel(
                    user.get().companyId(),
                    user.get().userId(),
                    selection.apply(params)));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    private Optional<AuthSessionUser> currentUser(HttpSession session) {
        return sessionAuthService.currentUser(session);
    }
    private static Long scopeId(String value) { return value == null || value.isBlank() ? null : Long.valueOf(value); }
}
