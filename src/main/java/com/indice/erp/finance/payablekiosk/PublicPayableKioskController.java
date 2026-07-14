package com.indice.erp.finance.payablekiosk;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.expenses.attachments.dto.ExpenseAttachmentUploadRequest;
import com.indice.erp.finance.expenses.attachments.dto.RegisterExpenseAttachmentRequest;
import com.indice.erp.finance.payablekiosk.dto.PayableKioskPinRequest;
import com.indice.erp.finance.payablekiosk.dto.PublicPayableRequest;
import com.indice.erp.finance.payablekiosk.dto.PublicProviderRegistrationRequest;
import com.indice.erp.storage.ObjectStorageDisabledException;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
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
@RequestMapping("/api/v1/finance/public-payable-kiosks/{token}")
public class PublicPayableKioskController {

    private final PayableKioskService service;
    private final PublicPayableKioskCsrf csrf;

    public PublicPayableKioskController(PayableKioskService service, PublicPayableKioskCsrf csrf) {
        this.service = service;
        this.csrf = csrf;
    }

    @GetMapping("/bootstrap")
    public ResponseEntity<?> bootstrap(HttpSession session, @PathVariable String token) {
        return ResponseEntity.ok(csrf.withToken(session, service.publicBootstrap(token)));
    }

    @PostMapping("/authenticate")
    public ResponseEntity<?> authenticate(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable String token,
            @Valid @RequestBody PayableKioskPinRequest request) {
        var csrfError = csrf.require(session, csrfToken);
        if (csrfError != null) {
            return csrfError;
        }
        return ResponseEntity.ok(service.publicAuthenticate(session, token, request));
    }

    @PostMapping("/provider-registrations")
    public ResponseEntity<?> registerProvider(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable String token,
            @Valid @RequestBody PublicProviderRegistrationRequest request) {
        var csrfError = csrf.require(session, csrfToken);
        if (csrfError != null) {
            return csrfError;
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(service.registerProvider(token, request));
    }

    @PostMapping("/payables")
    public ResponseEntity<?> createPayable(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable String token,
            @Valid @RequestBody PublicPayableRequest request) {
        var csrfError = csrf.require(session, csrfToken);
        if (csrfError != null) {
            return csrfError;
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createPayable(session, token, request));
    }

    @PostMapping("/payables/{expenseId}/attachments/presign-upload")
    public ResponseEntity<?> presignAttachment(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable String token,
            @PathVariable long expenseId,
            @Valid @RequestBody ExpenseAttachmentUploadRequest request) {
        var csrfError = csrf.require(session, csrfToken);
        if (csrfError != null) {
            return csrfError;
        }
        try {
            return ResponseEntity.ok(service.presignPayableAttachment(session, token, expenseId, request));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (ObjectStorageDisabledException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", ex.getMessage()));
        } catch (FinanceApiException ex) {
            return ResponseEntity.status(ex.status()).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/payables/{expenseId}/attachments")
    public ResponseEntity<?> registerAttachment(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable String token,
            @PathVariable long expenseId,
            @Valid @RequestBody RegisterExpenseAttachmentRequest request) {
        var csrfError = csrf.require(session, csrfToken);
        if (csrfError != null) {
            return csrfError;
        }
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(service.registerPayableAttachment(session, token, expenseId, request));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (ObjectStorageDisabledException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", ex.getMessage()));
        } catch (FinanceApiException ex) {
            return ResponseEntity.status(ex.status()).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }
}
