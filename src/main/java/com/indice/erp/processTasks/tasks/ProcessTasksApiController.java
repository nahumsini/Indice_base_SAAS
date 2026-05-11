package com.indice.erp.processTasks.tasks;

import com.indice.erp.auth.SessionAuthService;
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
@RequestMapping("/api/v1/process-tasks")
public class ProcessTasksApiController {

    private final SessionAuthService sessionAuthService;
    private final ProcessTasksService processTasksService;

    public ProcessTasksApiController(
            SessionAuthService sessionAuthService,
            ProcessTasksService processTasksService) {
        this.sessionAuthService = sessionAuthService;
        this.processTasksService = processTasksService;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        return ResponseEntity.ok(processTasksService.listTasks(user.get().companyId()));
    }

    @PostMapping
    public ResponseEntity<?> create(HttpSession session, @RequestBody Map<String, Object> payload) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(processTasksService.createTask(user.get().companyId(), user.get().userId(), payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/{taskId}")
    public ResponseEntity<?> update(
            HttpSession session,
            @PathVariable long taskId,
            @RequestBody Map<String, Object> payload) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.ok(
                    processTasksService.updateTask(user.get().companyId(), user.get().userId(), taskId, payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @DeleteMapping("/{taskId}")
    public ResponseEntity<?> delete(HttpSession session, @PathVariable long taskId) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            processTasksService.deleteTask(user.get().companyId(), taskId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/{taskId}/complete")
    public ResponseEntity<?> complete(
            HttpSession session,
            @PathVariable long taskId,
            @RequestBody(required = false) Map<String, Object> payload) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.ok(processTasksService.completeTask(
                    user.get().companyId(),
                    user.get().userId(),
                    taskId,
                    payload == null ? Map.of() : payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/{taskId}/cancel")
    public ResponseEntity<?> cancel(HttpSession session, @PathVariable long taskId) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.ok(processTasksService.cancelTask(user.get().companyId(), taskId));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }
}
