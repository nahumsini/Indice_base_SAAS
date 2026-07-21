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
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/finance/receivables")
@RequiresCapability("receivables")
public class FinanceReceivablesController {

    private final FinanceRequestGuard guard;
    private final ReceivablesService service;

    public FinanceReceivablesController(FinanceRequestGuard guard, ReceivablesService service) {
        this.guard = guard;
        this.service = service;
    }

    @GetMapping("/workspace")
    public ResponseEntity<?> workspace(HttpSession session) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(service.workspace(access.context()));
    }

    @GetMapping("/candidate-sales")
    public ResponseEntity<?> candidateSales(HttpSession session) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(service.candidateSales(access.context()));
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
}
