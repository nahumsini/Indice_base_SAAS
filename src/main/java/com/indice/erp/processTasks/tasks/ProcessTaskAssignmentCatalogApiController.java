package com.indice.erp.processTasks.tasks;

import com.indice.erp.processTasks.ProcessTasksRequestGuard;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/process-tasks/assignment-catalog")
public class ProcessTaskAssignmentCatalogApiController {

    private final ProcessTasksRequestGuard guard;
    private final ProcessTaskAssignmentCatalogService catalogService;

    public ProcessTaskAssignmentCatalogApiController(
            ProcessTasksRequestGuard guard,
            ProcessTaskAssignmentCatalogService catalogService) {
        this.guard = guard;
        this.catalogService = catalogService;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        var access = guard.requireRead(session);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(catalogService.list(access.user().companyId(), access.user().userId()));
    }
}
