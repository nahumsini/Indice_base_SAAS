package com.indice.erp.processTasks.tasks;

import com.indice.erp.processTasks.ProcessTasksRequestGuard;
import com.indice.erp.storage.ObjectStorageDisabledException;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/process-tasks")
public class ProcessTaskAttachmentsApiController {

    private final ProcessTasksRequestGuard guard;
    private final ProcessTasksService processTasksService;

    public ProcessTaskAttachmentsApiController(
            ProcessTasksRequestGuard guard,
            ProcessTasksService processTasksService) {
        this.guard = guard;
        this.processTasksService = processTasksService;
    }

    @GetMapping("/{taskId}/attachments")
    public ResponseEntity<?> listAttachments(HttpSession session, @PathVariable long taskId) {
        var access = guard.requireRead(session);
        if (access.denied()) {
            return access.error();
        }
        try {
            return ResponseEntity.ok(processTasksService.listAttachments(
                    access.user().companyId(), access.user().userId(), taskId));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/{taskId}/attachments/presign-upload")
    public ResponseEntity<?> createAttachmentUpload(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long taskId,
            @RequestBody Map<String, Object> payload) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        try {
            return ResponseEntity.ok(processTasksService.createAttachmentUpload(
                    access.user().companyId(), access.user().userId(), taskId, payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (ObjectStorageDisabledException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/{taskId}/attachments")
    public ResponseEntity<?> registerAttachment(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long taskId,
            @RequestBody Map<String, Object> payload) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(processTasksService.registerAttachment(
                    access.user().companyId(), access.user().userId(), taskId, payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (ObjectStorageDisabledException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @DeleteMapping("/{taskId}/attachments/{attachmentId}")
    public ResponseEntity<?> deleteAttachment(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long taskId,
            @PathVariable long attachmentId) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        try {
            processTasksService.deleteAttachment(
                    access.user().companyId(), access.user().userId(), taskId, attachmentId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }
}
