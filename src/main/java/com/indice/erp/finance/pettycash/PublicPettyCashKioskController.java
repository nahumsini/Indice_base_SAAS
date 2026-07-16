package com.indice.erp.finance.pettycash;

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
@RequestMapping("/api/v1/finance/petty-cash/public-kiosk/{fundToken}")
public class PublicPettyCashKioskController {

    private final PettyCashPublicKioskService kioskService;
    private final PettyCashPublicKioskCsrf publicCsrf;

    public PublicPettyCashKioskController(
            PettyCashPublicKioskService kioskService,
            PettyCashPublicKioskCsrf publicCsrf) {
        this.kioskService = kioskService;
        this.publicCsrf = publicCsrf;
    }

    @GetMapping("/bootstrap")
    public ResponseEntity<?> bootstrap(HttpSession session, @PathVariable String fundToken) {
        try {
            return ResponseEntity.ok(publicCsrf.withToken(session, kioskService.publicBootstrap(fundToken)));
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
            @PathVariable String fundToken,
            @RequestBody Map<String, Object> payload) {
        var csrfError = publicCsrf.require(session, csrfToken);
        if (csrfError != null) {
            return csrfError;
        }
        try {
            return ResponseEntity.ok(kioskService.publicIdentify(fundToken, payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            var status = ex.getMessage() != null && ex.getMessage().contains("Too many failed PIN attempts")
                ? HttpStatus.TOO_MANY_REQUESTS
                : HttpStatus.BAD_REQUEST;
            return ResponseEntity.status(status).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/receipts")
    public ResponseEntity<?> createReceipt(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable String fundToken,
            @RequestBody Map<String, Object> payload) {
        var csrfError = publicCsrf.require(session, csrfToken);
        if (csrfError != null) {
            return csrfError;
        }
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(kioskService.publicCreateReceipt(fundToken, payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/settlement-lines/{settlementLineId}/attachments/presign-upload")
    public ResponseEntity<?> createAttachmentUpload(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable String fundToken,
            @PathVariable long settlementLineId,
            @RequestBody Map<String, Object> payload) {
        var csrfError = publicCsrf.require(session, csrfToken);
        if (csrfError != null) {
            return csrfError;
        }
        try {
            return ResponseEntity.ok(kioskService.publicCreateAttachmentUpload(fundToken, settlementLineId, payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (ObjectStorageDisabledException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/settlement-lines/{settlementLineId}/attachments")
    public ResponseEntity<?> registerAttachment(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable String fundToken,
            @PathVariable long settlementLineId,
            @RequestBody Map<String, Object> payload) {
        var csrfError = publicCsrf.require(session, csrfToken);
        if (csrfError != null) {
            return csrfError;
        }
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(
                kioskService.publicRegisterAttachment(fundToken, settlementLineId, payload)
            );
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (ObjectStorageDisabledException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/settlement-lines/{settlementLineId}/attachments/query")
    public ResponseEntity<?> listAttachments(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable String fundToken,
            @PathVariable long settlementLineId,
            @RequestBody Map<String, Object> payload) {
        var csrfError = publicCsrf.require(session, csrfToken);
        if (csrfError != null) {
            return csrfError;
        }
        try {
            return ResponseEntity.ok(kioskService.publicListAttachments(fundToken, settlementLineId, payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @DeleteMapping("/receipts/{settlementLineId}")
    public ResponseEntity<?> deleteReceipt(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable String fundToken,
            @PathVariable long settlementLineId,
            @RequestBody Map<String, Object> payload) {
        var csrfError = publicCsrf.require(session, csrfToken);
        if (csrfError != null) {
            return csrfError;
        }
        try {
            return ResponseEntity.ok(kioskService.publicDeleteReceipt(fundToken, settlementLineId, payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }
}
