package com.indice.erp.processTasks.kiosk;

import com.indice.erp.storage.ObjectStorageDisabledException;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/process-tasks/public-kiosk/{deviceToken}")
public class PublicProcessTaskKioskApiController {

    private final ProcessTaskKioskService kioskService;

    public PublicProcessTaskKioskApiController(ProcessTaskKioskService kioskService) {
        this.kioskService = kioskService;
    }

    @GetMapping("/bootstrap")
    public ResponseEntity<?> bootstrap(@PathVariable String deviceToken) {
        try {
            return ResponseEntity.ok(kioskService.publicBootstrap(deviceToken));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/identify")
    public ResponseEntity<?> identify(@PathVariable String deviceToken, @RequestBody Map<String, Object> payload) {
        try {
            return ResponseEntity.ok(kioskService.publicIdentify(deviceToken, payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            var status = ex.getMessage() != null && ex.getMessage().contains("Too many failed PIN attempts")
                ? HttpStatus.TOO_MANY_REQUESTS
                : HttpStatus.BAD_REQUEST;
            return ResponseEntity.status(status).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/tasks")
    public ResponseEntity<?> tasks(@PathVariable String deviceToken, @RequestBody Map<String, Object> payload) {
        try {
            return ResponseEntity.ok(kioskService.publicTasks(deviceToken, payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/tasks/create")
    public ResponseEntity<?> createTask(@PathVariable String deviceToken, @RequestBody Map<String, Object> payload) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(kioskService.publicCreateTask(deviceToken, payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/tasks/{taskId}/complete")
    public ResponseEntity<?> complete(
        @PathVariable String deviceToken,
        @PathVariable long taskId,
        @RequestBody Map<String, Object> payload
    ) {
        try {
            return ResponseEntity.ok(kioskService.publicCompleteTask(deviceToken, taskId, payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/tasks/{taskId}/responsible")
    public ResponseEntity<?> assignResponsible(
        @PathVariable String deviceToken,
        @PathVariable long taskId,
        @RequestBody Map<String, Object> payload
    ) {
        try {
            return ResponseEntity.ok(kioskService.publicAssignTaskResponsible(deviceToken, taskId, payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/tasks/{taskId}/attachments/presign-upload")
    public ResponseEntity<?> createAttachmentUpload(
        @PathVariable String deviceToken,
        @PathVariable long taskId,
        @RequestBody Map<String, Object> payload
    ) {
        try {
            return ResponseEntity.ok(kioskService.publicCreateAttachmentUpload(deviceToken, taskId, payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (ObjectStorageDisabledException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/tasks/{taskId}/attachments")
    public ResponseEntity<?> registerAttachment(
        @PathVariable String deviceToken,
        @PathVariable long taskId,
        @RequestBody Map<String, Object> payload
    ) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(
                kioskService.publicRegisterAttachment(deviceToken, taskId, payload)
            );
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (ObjectStorageDisabledException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }
}
