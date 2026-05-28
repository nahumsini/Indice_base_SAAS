package com.indice.erp.processTasks.projects;

import com.indice.erp.processTasks.ProcessTasksRequestGuard;
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
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/projects")
public class ProjectsApiController {

    private final ProcessTasksRequestGuard guard;
    private final ProjectsService projectsService;

    public ProjectsApiController(ProcessTasksRequestGuard guard, ProjectsService projectsService) {
        this.guard = guard;
        this.projectsService = projectsService;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        var access = guard.requireRead(session);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(projectsService.listProjects(access.user().companyId()));
    }

    @PostMapping
    public ResponseEntity<?> create(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestBody Map<String, Object> payload) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(
                    projectsService.createProject(access.user().companyId(), access.user().userId(), payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/{projectId}")
    public ResponseEntity<?> update(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long projectId,
            @RequestBody Map<String, Object> payload) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        try {
            return ResponseEntity.ok(projectsService.updateProject(
                    access.user().companyId(), projectId, payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @DeleteMapping("/{projectId}")
    public ResponseEntity<?> delete(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long projectId) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        try {
            projectsService.deleteProject(access.user().companyId(), projectId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/{projectId}/complete")
    public ResponseEntity<?> complete(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long projectId) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        try {
            return ResponseEntity.ok(projectsService.completeProject(access.user().companyId(), projectId));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/{projectId}/cancel")
    public ResponseEntity<?> cancel(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long projectId) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        try {
            return ResponseEntity.ok(projectsService.cancelProject(access.user().companyId(), projectId));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/{projectId}/tasks")
    public ResponseEntity<?> tasks(HttpSession session, @PathVariable long projectId) {
        var access = guard.requireRead(session);
        if (access.denied()) {
            return access.error();
        }
        try {
            return ResponseEntity.ok(projectsService.listProjectTasks(
                    access.user().companyId(), access.user().userId(), projectId));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }
}
