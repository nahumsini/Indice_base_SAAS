package com.indice.erp.processTasks.kiosk;

import com.indice.erp.storage.ObjectStorageDisabledException;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/process-tasks/public-kiosk/{deviceToken}")
public class PublicProcessTaskKioskApiController {

    private final ProcessTaskKioskService kioskService;
    private final PublicProcessTaskKioskCsrf publicCsrf;

    public PublicProcessTaskKioskApiController(
            ProcessTaskKioskService kioskService,
            PublicProcessTaskKioskCsrf publicCsrf) {
        this.kioskService = kioskService;
        this.publicCsrf = publicCsrf;
    }

    @GetMapping("/bootstrap")
    public ResponseEntity<?> bootstrap(HttpSession session, @PathVariable String deviceToken) {
        try {
            return ResponseEntity.ok(publicCsrf.withToken(session, kioskService.publicBootstrap(deviceToken)));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/identify")
    public ResponseEntity<?> identify(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable String deviceToken,
            @RequestBody Map<String, Object> payload) {
        var csrfError = publicCsrf.require(session, csrfToken);
        if (csrfError != null) {
            return csrfError;
        }
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
    public ResponseEntity<?> tasks(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable String deviceToken,
            @RequestBody Map<String, Object> payload) {
        var csrfError = publicCsrf.require(session, csrfToken);
        if (csrfError != null) {
            return csrfError;
        }
        try {
            return ResponseEntity.ok(kioskService.publicTasks(deviceToken, payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/tasks/create")
    public ResponseEntity<?> createTask(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable String deviceToken,
            @RequestBody Map<String, Object> payload) {
        var csrfError = publicCsrf.require(session, csrfToken);
        if (csrfError != null) {
            return csrfError;
        }
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
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable String deviceToken,
            @PathVariable long taskId,
            @RequestBody Map<String, Object> payload) {
        var csrfError = publicCsrf.require(session, csrfToken);
        if (csrfError != null) {
            return csrfError;
        }
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
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable String deviceToken,
            @PathVariable long taskId,
            @RequestBody Map<String, Object> payload) {
        var csrfError = publicCsrf.require(session, csrfToken);
        if (csrfError != null) {
            return csrfError;
        }
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
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable String deviceToken,
            @PathVariable long taskId,
            @RequestBody Map<String, Object> payload) {
        var csrfError = publicCsrf.require(session, csrfToken);
        if (csrfError != null) {
            return csrfError;
        }
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
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable String deviceToken,
            @PathVariable long taskId,
            @RequestBody Map<String, Object> payload) {
        var csrfError = publicCsrf.require(session, csrfToken);
        if (csrfError != null) {
            return csrfError;
        }
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
