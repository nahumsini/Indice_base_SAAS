package com.indice.erp.finance.paymentaccounts;

import com.indice.erp.finance.FinanceRequestGuard;
import com.indice.erp.finance.paymentaccounts.dto.CreatePaymentAccountRequest;
import com.indice.erp.finance.paymentaccounts.dto.UpdatePaymentAccountRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
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
@RequestMapping("/api/v1/finance/payment-accounts")
public class FinancePaymentAccountsController {

    private final FinanceRequestGuard guard;
    private final PaymentAccountService accountService;

    public FinancePaymentAccountsController(FinanceRequestGuard guard, PaymentAccountService accountService) {
        this.guard = guard;
        this.accountService = accountService;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(accountService.list(access.context()));
    }

    @GetMapping("/{accountId}")
    public ResponseEntity<?> get(HttpSession session, @PathVariable long accountId) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(accountService.get(access.context(), accountId));
    }

    @PostMapping
    public ResponseEntity<?> create(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody CreatePaymentAccountRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(accountService.create(access.context(), request));
    }

    @PutMapping("/{accountId}")
    public ResponseEntity<?> update(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long accountId,
            @Valid @RequestBody UpdatePaymentAccountRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(accountService.update(access.context(), accountId, request));
    }

    @DeleteMapping("/{accountId}")
    public ResponseEntity<?> delete(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long accountId) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(accountService.delete(access.context(), accountId));
    }
}
