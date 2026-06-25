package com.indice.erp.finance.providers;

import com.indice.erp.finance.FinanceRequestGuard;
import com.indice.erp.finance.providers.dto.CreateProviderRequest;
import com.indice.erp.finance.providers.dto.UpdateProviderRequest;
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
@RequestMapping("/api/v1/finance/providers")
public class FinanceProvidersController {

    private final FinanceRequestGuard guard;
    private final ProviderService providerService;

    public FinanceProvidersController(FinanceRequestGuard guard, ProviderService providerService) {
        this.guard = guard;
        this.providerService = providerService;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(providerService.list(access.context()));
    }

    @GetMapping("/{providerId}")
    public ResponseEntity<?> get(HttpSession session, @PathVariable long providerId) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(providerService.get(access.context(), providerId));
    }

    @PostMapping
    public ResponseEntity<?> create(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody CreateProviderRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(providerService.create(access.context(), request));
    }

    @PutMapping("/{providerId}")
    public ResponseEntity<?> update(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long providerId,
            @Valid @RequestBody UpdateProviderRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(providerService.update(access.context(), providerId, request));
    }

    @DeleteMapping("/{providerId}")
    public ResponseEntity<?> delete(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long providerId) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(providerService.delete(access.context(), providerId));
    }
}
