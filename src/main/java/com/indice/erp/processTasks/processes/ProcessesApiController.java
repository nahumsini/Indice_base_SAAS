package com.indice.erp.processTasks.processes;

import com.indice.erp.entitlement.RequiresCapability;
import com.indice.erp.processTasks.ProcessTasksRequestGuard;
import com.indice.erp.processTasks.processes.ProcessRunContracts.OccasionalPreviewRequest;
import com.indice.erp.processTasks.processes.ProcessRunContracts.OccasionalRunRequest;
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
@RequestMapping("/api/v1/processes")
@RequiresCapability("processes")
public class ProcessesApiController {

    private final ProcessTasksRequestGuard guard;
    private final ProcessesService processesService;
    private final ProcessRunsService processRunsService;

    public ProcessesApiController(
            ProcessTasksRequestGuard guard,
            ProcessesService processesService,
            ProcessRunsService processRunsService) {
        this.guard = guard;
        this.processesService = processesService;
        this.processRunsService = processRunsService;
    }

    @GetMapping("/occasional")
    public ResponseEntity<?> listOccasional(HttpSession session) {
        var access = guard.requireRead(session);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(processRunsService.listOccasionalProcesses(access.user().companyId()));
    }

    @GetMapping("/collaborators")
    public ResponseEntity<?> listCollaborators(HttpSession session) {
        var access = guard.requireRead(session);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(processesService.listCollaborators(access.user().companyId()));
    }

    @PostMapping("/occasional/preview")
    public ResponseEntity<?> previewOccasional(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestBody OccasionalPreviewRequest request) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        try {
            return ResponseEntity.ok(processRunsService.previewOccasionalRun(access.user().companyId(), request));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/occasional/runs")
    public ResponseEntity<?> createOccasionalRun(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestBody OccasionalRunRequest request) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(processRunsService.createOccasionalRun(
                    access.user().companyId(), access.user().userId(), request, idempotencyKey));
        } catch (DuplicateProcessReferenceException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "message", ex.getMessage(),
                    "code", "duplicate_reference",
                    "matchingRuns", ex.matchingRuns()));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/{processId}/runs")
    public ResponseEntity<?> listRuns(HttpSession session, @PathVariable long processId) {
        var access = guard.requireRead(session);
        if (access.denied()) {
            return access.error();
        }
        try {
            return ResponseEntity.ok(processRunsService.listRuns(access.user().companyId(), processId));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/runs/{runId}")
    public ResponseEntity<?> getRun(HttpSession session, @PathVariable long runId) {
        var access = guard.requireRead(session);
        if (access.denied()) {
            return access.error();
        }
        try {
            return ResponseEntity.ok(processRunsService.getRun(access.user().companyId(), runId));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        var access = guard.requireRead(session);
        if (access.denied()) {
            return access.error();
        }

        return ResponseEntity.ok(processesService.listProcesses(access.user().companyId(), access.user().userId()));
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
            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(processesService.createProcess(
                            access.user().companyId(),
                            access.user().userId(),
                            access.user().userName(),
                            payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/{processId}")
    public ResponseEntity<?> update(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long processId,
            @RequestBody Map<String, Object> payload) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }

        try {
            return ResponseEntity.ok(
                    processesService.updateProcess(access.user().companyId(), access.user().userId(), processId, payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @DeleteMapping("/{processId}")
    public ResponseEntity<?> delete(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long processId) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }

        try {
            processesService.deleteProcess(access.user().companyId(), access.user().userId(), processId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/{processId}/materialize")
    public ResponseEntity<?> materialize(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long processId) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }

        try {
            return ResponseEntity.ok(
                    processesService.materializeProcess(access.user().companyId(), access.user().userId(), processId));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }
}
