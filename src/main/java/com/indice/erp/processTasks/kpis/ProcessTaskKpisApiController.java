package com.indice.erp.processTasks.kpis;

import com.indice.erp.processTasks.ProcessTasksRequestGuard;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/process-task-kpis")
public class ProcessTaskKpisApiController {

    private final ProcessTasksRequestGuard guard;
    private final ProcessTaskKpisService processTaskKpisService;

    public ProcessTaskKpisApiController(
            ProcessTasksRequestGuard guard,
            ProcessTaskKpisService processTaskKpisService) {
        this.guard = guard;
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
            @RequestParam(required = false) Long collaboratorId,
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) String focus,
            @RequestParam(required = false) String status) {
        var access = guard.requireRead(session);
        if (access.denied()) {
            return access.error();
        }

        try {
            return ResponseEntity.ok(processTaskKpisService.getDashboard(
                    access.user().companyId(),
                    access.user().userId(),
                    from,
                    to,
                    includeOverdueBacklog,
                    overdueOnly,
                    unitId,
                    businessId,
                    collaboratorId,
                    projectId,
                    focus,
                    status));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }
}
