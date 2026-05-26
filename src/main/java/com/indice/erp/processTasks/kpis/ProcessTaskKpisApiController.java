package com.indice.erp.processTasks.kpis;

import com.indice.erp.auth.SessionAuthService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/process-task-kpis")
public class ProcessTaskKpisApiController {

    private final SessionAuthService sessionAuthService;
    private final ProcessTaskKpisService processTaskKpisService;

    public ProcessTaskKpisApiController(
            SessionAuthService sessionAuthService,
            ProcessTaskKpisService processTaskKpisService) {
        this.sessionAuthService = sessionAuthService;
        this.processTaskKpisService = processTaskKpisService;
    }

    @GetMapping
    public ResponseEntity<?> dashboard(
            HttpSession session,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) Boolean includeOverdueBacklog,
            @RequestParam(required = false) Boolean overdueOnly,
            @RequestParam(required = false) Long unitId,
            @RequestParam(required = false) Long businessId,
            @RequestParam(required = false) Long collaboratorId) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.ok(processTaskKpisService.getDashboard(
                    user.get().companyId(),
                    user.get().userId(),
                    from,
                    to,
                    includeOverdueBacklog,
                    overdueOnly,
                    unitId,
                    businessId,
                    collaboratorId));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }
}
