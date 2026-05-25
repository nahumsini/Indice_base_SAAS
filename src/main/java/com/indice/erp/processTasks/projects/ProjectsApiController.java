package com.indice.erp.processTasks.projects;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.processTasks.ProcessTasksAccessService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/projects")
public class ProjectsApiController {

    private final SessionAuthService sessionAuthService;
    private final ProcessTasksAccessService accessService;
    private final ProjectsService projectsService;

    public ProjectsApiController(
        SessionAuthService sessionAuthService,
        ProcessTasksAccessService accessService,
        ProjectsService projectsService
    ) {
        this.sessionAuthService = sessionAuthService;
        this.accessService = accessService;
        this.projectsService = projectsService;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!accessService.canAccess(user.get())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Forbidden"));
        }

        return ResponseEntity.ok(projectsService.listProjects(user.get().companyId()));
    }

    @PostMapping
    public ResponseEntity<?> create(HttpSession session, @RequestBody Map<String, Object> payload) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!accessService.canAccess(user.get())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Forbidden"));
        }

        try {
            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(projectsService.createProject(user.get().companyId(), user.get().userId(), payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/{projectId}")
    public ResponseEntity<?> update(
            HttpSession session,
            @PathVariable long projectId,
            @RequestBody Map<String, Object> payload) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!accessService.canAccess(user.get())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Forbidden"));
        }

        try {
            return ResponseEntity.ok(projectsService.updateProject(user.get().companyId(), projectId, payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @DeleteMapping("/{projectId}")
    public ResponseEntity<?> delete(HttpSession session, @PathVariable long projectId) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!accessService.canAccess(user.get())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Forbidden"));
        }

        try {
            projectsService.deleteProject(user.get().companyId(), projectId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/{projectId}/complete")
    public ResponseEntity<?> complete(HttpSession session, @PathVariable long projectId) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!accessService.canAccess(user.get())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Forbidden"));
        }

        try {
            return ResponseEntity.ok(projectsService.completeProject(user.get().companyId(), projectId));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/{projectId}/cancel")
    public ResponseEntity<?> cancel(HttpSession session, @PathVariable long projectId) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!accessService.canAccess(user.get())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Forbidden"));
        }

        try {
            return ResponseEntity.ok(projectsService.cancelProject(user.get().companyId(), projectId));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/{projectId}/tasks")
    public ResponseEntity<?> tasks(HttpSession session, @PathVariable long projectId) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!accessService.canAccess(user.get())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Forbidden"));
        }

        try {
            return ResponseEntity.ok(projectsService.listProjectTasks(user.get().companyId(), projectId));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }
}
