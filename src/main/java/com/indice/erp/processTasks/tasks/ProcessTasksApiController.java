package com.indice.erp.processTasks.tasks;

import com.indice.erp.processTasks.ProcessTasksRequestGuard;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/process-tasks")
public class ProcessTasksApiController {

    private final ProcessTasksRequestGuard guard;
    private final ProcessTasksService processTasksService;

    public ProcessTasksApiController(ProcessTasksRequestGuard guard, ProcessTasksService processTasksService) {
        this.guard = guard;
        this.processTasksService = processTasksService;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        var access = guard.requireRead(session);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(processTasksService.listTasks(access.user().companyId(), access.user().userId()));
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
                    processTasksService.createTask(access.user().companyId(), access.user().userId(), payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/{taskId}")
    public ResponseEntity<?> update(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long taskId,
            @RequestBody Map<String, Object> payload) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        try {
            return ResponseEntity.ok(processTasksService.updateTask(
                    access.user().companyId(), access.user().userId(), taskId, payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PatchMapping("/{taskId}/agenda-placement")
    public ResponseEntity<?> updateAgendaPlacement(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long taskId,
            @RequestBody(required = false) Map<String, Object> payload) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        try {
            return ResponseEntity.ok(processTasksService.updateAgendaPlacement(
                    access.user().companyId(),
                    access.user().userId(),
                    taskId,
                    payload == null ? Map.of() : payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/{taskId}/dependencies")
    public ResponseEntity<?> listDependencies(HttpSession session, @PathVariable long taskId) {
        var access = guard.requireRead(session);
        if (access.denied()) {
            return access.error();
        }
        try {
            return ResponseEntity.ok(processTasksService.listTaskDependencies(
                    access.user().companyId(), access.user().userId(), taskId));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/{taskId}/dependencies")
    public ResponseEntity<?> updateDependencies(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long taskId,
            @RequestBody(required = false) Map<String, Object> payload) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        try {
            return ResponseEntity.ok(processTasksService.updateTaskDependencies(
                    access.user().companyId(),
                    access.user().userId(),
                    taskId,
                    payload == null ? Map.of() : payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @DeleteMapping("/{taskId}")
    public ResponseEntity<?> delete(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long taskId) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        try {
            processTasksService.deleteTask(access.user().companyId(), access.user().userId(), taskId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/{taskId}/complete")
    public ResponseEntity<?> complete(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long taskId,
            @RequestBody(required = false) Map<String, Object> payload) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        try {
            return ResponseEntity.ok(processTasksService.completeTask(
                    access.user().companyId(), access.user().userId(), taskId, payload == null ? Map.of() : payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/{taskId}/audit")
    public ResponseEntity<?> audit(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long taskId,
            @RequestBody(required = false) Map<String, Object> payload) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        try {
            return ResponseEntity.ok(processTasksService.auditTask(
                    access.user().companyId(), access.user().userId(), taskId, payload == null ? Map.of() : payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/{taskId}/cancel")
    public ResponseEntity<?> cancel(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long taskId) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        try {
            return ResponseEntity.ok(processTasksService.cancelTask(
                    access.user().companyId(), access.user().userId(), taskId));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }
}
