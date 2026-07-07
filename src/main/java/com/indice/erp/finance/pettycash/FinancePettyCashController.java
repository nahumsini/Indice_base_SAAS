package com.indice.erp.finance.pettycash;

import com.indice.erp.finance.FinanceRequestGuard;
import com.indice.erp.finance.pettycash.dto.ClosePettyCashStatementRequest;
import com.indice.erp.finance.pettycash.dto.CreatePettyCashFundRequest;
import com.indice.erp.finance.pettycash.dto.CreatePettyCashMovementRequest;
import com.indice.erp.finance.pettycash.dto.CreatePettyCashSettlementLineRequest;
import com.indice.erp.finance.pettycash.dto.UpdatePettyCashFundRequest;
import com.indice.erp.storage.ObjectStorageDisabledException;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
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
@RequestMapping("/api/v1/finance/petty-cash")
public class FinancePettyCashController {

    private final FinanceRequestGuard guard;
    private final PettyCashService service;
    private final PettyCashAttachmentService attachmentService;

    public FinancePettyCashController(
            FinanceRequestGuard guard,
            PettyCashService service,
            PettyCashAttachmentService attachmentService) {
        this.guard = guard;
        this.service = service;
        this.attachmentService = attachmentService;
    }

    @GetMapping
    public ResponseEntity<?> workspace(HttpSession session) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(service.workspace(access.context()));
    }

    @GetMapping("/funds/{fundId}")
    public ResponseEntity<?> getFund(HttpSession session, @PathVariable long fundId) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(service.getFund(access.context(), fundId));
    }

    @PostMapping("/funds")
    public ResponseEntity<?> createFund(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody CreatePettyCashFundRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createFund(access.context(), request));
    }

    @PutMapping("/funds/{fundId}")
    public ResponseEntity<?> updateFund(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long fundId,
            @Valid @RequestBody UpdatePettyCashFundRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(service.updateFund(access.context(), fundId, request));
    }

    @DeleteMapping("/funds/{fundId}")
    public ResponseEntity<?> deleteFund(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long fundId) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(service.deleteFund(access.context(), fundId));
    }

    @PostMapping("/funds/{fundId}/rotate-kiosk-token")
    public ResponseEntity<?> rotateFundKioskToken(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long fundId) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(service.rotateKioskPublicToken(access.context(), fundId));
    }

    @PostMapping("/funds/{fundId}/movements")
    public ResponseEntity<?> createMovement(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long fundId,
            @Valid @RequestBody CreatePettyCashMovementRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createMovement(access.context(), fundId, request));
    }

    @PostMapping("/funds/{fundId}/settlement-lines")
    public ResponseEntity<?> createSettlementLine(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long fundId,
            @Valid @RequestBody CreatePettyCashSettlementLineRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createSettlementLine(access.context(), fundId, request));
    }

    @PostMapping("/funds/{fundId}/settlement-lines/{settlementLineId}/create-expense")
    public ResponseEntity<?> createExpenseFromSettlementLine(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long fundId,
            @PathVariable long settlementLineId) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(service.createExpenseFromSettlementLine(access.context(), fundId, settlementLineId));
    }

    @PostMapping("/funds/{fundId}/statements/{statementId}/close")
    public ResponseEntity<?> closeStatement(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long fundId,
            @PathVariable long statementId,
            @Valid @RequestBody ClosePettyCashStatementRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(service.closeStatement(access.context(), fundId, statementId, request));
    }

    @GetMapping("/funds/{fundId}/settlement-lines/{settlementLineId}/attachments")
    public ResponseEntity<?> listSettlementLineAttachments(
            HttpSession session,
            @PathVariable long fundId,
            @PathVariable long settlementLineId) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) {
            return access.error();
        }
        try {
            return ResponseEntity.ok(attachmentService.listAttachments(access.context(), fundId, settlementLineId));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/funds/{fundId}/settlement-lines/{settlementLineId}/attachments/presign-upload")
    public ResponseEntity<?> createSettlementLineAttachmentUpload(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long fundId,
            @PathVariable long settlementLineId,
            @RequestBody Map<String, Object> payload) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        try {
            return ResponseEntity.ok(attachmentService.createAttachmentUpload(
                access.context(), fundId, settlementLineId, payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (ObjectStorageDisabledException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/funds/{fundId}/settlement-lines/{settlementLineId}/attachments")
    public ResponseEntity<?> registerSettlementLineAttachment(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long fundId,
            @PathVariable long settlementLineId,
            @RequestBody Map<String, Object> payload) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(attachmentService.registerAttachment(
                access.context(), fundId, settlementLineId, payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (ObjectStorageDisabledException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @DeleteMapping("/funds/{fundId}/settlement-lines/{settlementLineId}/attachments/{attachmentId}")
    public ResponseEntity<?> deleteSettlementLineAttachment(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long fundId,
            @PathVariable long settlementLineId,
            @PathVariable long attachmentId) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        try {
            attachmentService.deleteAttachment(access.context(), fundId, settlementLineId, attachmentId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }
}
