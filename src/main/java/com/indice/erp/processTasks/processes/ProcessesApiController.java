package com.indice.erp.processTasks.processes;

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
@RequestMapping("/api/v1/processes")
public class ProcessesApiController {

    private final SessionAuthService sessionAuthService;
    private final ProcessesService processesService;

    public ProcessesApiController(
            SessionAuthService sessionAuthService,
            ProcessesService processesService) {
        this.sessionAuthService = sessionAuthService;
        this.processesService = processesService;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        return ResponseEntity.ok(processesService.listProcesses(user.get().companyId(), user.get().userId()));
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
                    .body(processesService.createProcess(
                            user.get().companyId(),
                            user.get().userId(),
                            user.get().userName(),
                            payload));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/{processId}")
    public ResponseEntity<?> update(
            HttpSession session,
            @PathVariable long processId,
            @RequestBody Map<String, Object> payload) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.ok(
                    processesService.updateProcess(user.get().companyId(), user.get().userId(), processId, payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @DeleteMapping("/{processId}")
    public ResponseEntity<?> delete(HttpSession session, @PathVariable long processId) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            processesService.deleteProcess(user.get().companyId(), user.get().userId(), processId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/{processId}/materialize")
    public ResponseEntity<?> materialize(HttpSession session, @PathVariable long processId) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.ok(
                    processesService.materializeProcess(user.get().companyId(), user.get().userId(), processId));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }
}
