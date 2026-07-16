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

    public ExecutiveKpiController(SessionAuthService sessionAuthService, ExecutiveKpiService executiveKpiService) {
        this.sessionAuthService = sessionAuthService;
        this.executiveKpiService = executiveKpiService;
    }

    @GetMapping("/executive-panel")
    public ResponseEntity<?> executivePanel(HttpSession session, @RequestParam Map<String, String> params) {
        var user = currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.ok(executiveKpiService.getExecutivePanel(
                    user.get().companyId(),
                    user.get().userId(),
                    params));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    private Optional<AuthSessionUser> currentUser(HttpSession session) {
        return sessionAuthService.currentUser(session);
    }
}
