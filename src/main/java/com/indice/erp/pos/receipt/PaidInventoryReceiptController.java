package com.indice.erp.pos.receipt;

import com.indice.erp.entitlement.RequiresCapability;
import com.indice.erp.pos.PosRequestGuard;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pos/inventory-receipts")
@RequiresCapability("pos")
public class PaidInventoryReceiptController {
    private final PosRequestGuard guard;
    private final PaidInventoryReceiptService service;

    public PaidInventoryReceiptController(PosRequestGuard guard, PaidInventoryReceiptService service) {
        this.guard = guard;
        this.service = service;
    }

    @GetMapping("/products")
    public ResponseEntity<?> products(
            HttpSession session,
            @RequestParam long cashRegisterId,
            @RequestParam(required = false, defaultValue = "") String query) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(service.products(access.context(), cashRegisterId, query));
    }

    @GetMapping("/providers")
    public ResponseEntity<?> providers(HttpSession session) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(service.providerOptions(access.context()));
    }

    @PostMapping("/providers/quick")
    public ResponseEntity<?> createProvider(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody PaidInventoryReceiptDtos.QuickProviderRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createProvider(access.context(), request));
    }

    @GetMapping("/payment-accounts")
    public ResponseEntity<?> paymentAccounts(
            HttpSession session,
            @RequestParam long cashRegisterId,
            @RequestParam long shiftId,
            @RequestParam String currencyCode) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(service.paymentAccounts(
            access.context(), cashRegisterId, shiftId, currencyCode));
    }

    @GetMapping
    public ResponseEntity<?> recent(HttpSession session, @RequestParam long shiftId) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(service.recent(access.context(), shiftId));
    }

    @PostMapping
    public ResponseEntity<?> create(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody PaidInventoryReceiptDtos.CreateRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(access.context(), request));
    }

    @PostMapping("/{receiptId}/reverse")
    public ResponseEntity<?> reverse(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long receiptId,
            @Valid @RequestBody PaidInventoryReceiptDtos.ReverseRequest request) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(service.reverse(access.context(), receiptId, request));
    }


    @PostMapping("/{receiptId}/attachments/presign-upload")
    public ResponseEntity<?> presignAttachment(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long receiptId,
            @Valid @RequestBody PaidInventoryReceiptDtos.AttachmentUploadRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(service.presignAttachment(access.context(), receiptId, request));
    }

    @PostMapping("/{receiptId}/attachments")
    public ResponseEntity<?> registerAttachment(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long receiptId,
            @Valid @RequestBody PaidInventoryReceiptDtos.AttachmentRegisterRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        return ResponseEntity.status(HttpStatus.CREATED).body(service.registerAttachment(access.context(), receiptId, request));
    }
}
