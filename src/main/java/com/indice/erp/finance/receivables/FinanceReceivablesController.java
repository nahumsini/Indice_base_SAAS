package com.indice.erp.finance.receivables;

import com.indice.erp.entitlement.RequiresCapability;
import com.indice.erp.finance.FinanceRequestGuard;
import com.indice.erp.finance.receivables.ReceivablesDtos.CreateCreditPolicyRequest;
import com.indice.erp.finance.receivables.ReceivablesDtos.CreateCreditSaleRequest;
import com.indice.erp.finance.receivables.ReceivablesDtos.RegisterReceivablePaymentRequest;
import com.indice.erp.finance.receivables.ReceivablesDtos.SimulateCreditSaleRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/finance/receivables")
@RequiresCapability("receivables")
public class FinanceReceivablesController {

    private final FinanceRequestGuard guard;
    private final ReceivablesService service;
    private final ReceivableReceiptService receipts;

    public FinanceReceivablesController(FinanceRequestGuard guard, ReceivablesService service, ReceivableReceiptService receipts) {
        this.guard = guard;
        this.service = service;
        this.receipts = receipts;
    }

    @GetMapping("/workspace")
    public ResponseEntity<?> workspace(HttpSession session) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(service.workspace(access.context()));
    }

    @GetMapping("/kpis/workspace")
    public ResponseEntity<?> kpiWorkspace(HttpSession session) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(service.kpiWorkspace(access.context()));
    }

    @GetMapping("/candidate-sales")
    public ResponseEntity<?> candidateSales(HttpSession session) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(service.candidateSales(access.context()));
    }

    @GetMapping("/payment-accounts")
    public ResponseEntity<?> paymentAccounts(HttpSession session, @RequestParam long receivableId) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(service.paymentAccounts(access.context(), receivableId));
    }

    @PostMapping("/simulations")
    public ResponseEntity<?> simulations(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody SimulateCreditSaleRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(service.simulate(request));
    }

    @PostMapping("/credit-sales")
    public ResponseEntity<?> createCreditSale(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody CreateCreditSaleRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createCreditSale(access.context(), request));
    }

    @PostMapping("/payments")
    public ResponseEntity<?> registerPayment(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody RegisterReceivablePaymentRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(service.registerPayment(access.context(), request));
    }

    @PostMapping("/payment-receipts/uploads")
    public ResponseEntity<?> receiptUpload(HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestBody ReceivableReceiptService.UploadRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(receipts.presign(access.context(), request));
    }

    @GetMapping("/payments/{id}/receipt")
    public ResponseEntity<?> receipt(HttpSession session, @org.springframework.web.bind.annotation.PathVariable long id) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) return access.error();
        return ResponseEntity.status(HttpStatus.FOUND).header("Location", receipts.download(access.context(), id))
            .header("Cache-Control", "private, no-store").build();
    }

    @PostMapping("/credit-policies")
    public ResponseEntity<?> createCreditPolicy(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody CreateCreditPolicyRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createCreditPolicy(access.context(), request));
    }

    @org.springframework.web.bind.annotation.PutMapping("/credit-policies/{id}")
    public ResponseEntity<?> updateCreditPolicy(HttpSession session, @org.springframework.web.bind.annotation.PathVariable long id,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody CreateCreditPolicyRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(service.updateCreditPolicy(access.context(), id, request));
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/credit-policies/{id}")
    public ResponseEntity<?> archiveCreditPolicy(HttpSession session, @org.springframework.web.bind.annotation.PathVariable long id,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(service.archiveCreditPolicy(access.context(), id));
    }
}
