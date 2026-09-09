package com.indice.erp.finance.providers;

import com.indice.erp.finance.FinanceRequestGuard;
import com.indice.erp.finance.providers.dto.CreateProviderRequest;
import com.indice.erp.finance.providers.dto.UpdateProviderRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
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
    private final ProviderCenterReviewService providerCenterReview;

    @Autowired
    public FinanceProvidersController(
            FinanceRequestGuard guard,
            ProviderService providerService,
            ProviderCenterReviewService providerCenterReview) {
        this.guard = guard;
        this.providerService = providerService;
        this.providerCenterReview = providerCenterReview;
    }

    public FinanceProvidersController(FinanceRequestGuard guard, ProviderService providerService) {
        this(guard, providerService, null);
    }

    @GetMapping("/provider-center/inbox")
    public ResponseEntity<?> providerCenterInbox(HttpSession session) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(requireProviderCenterReview().financeInbox(access.context()));
    }

    @PostMapping("/provider-center/registrations/{requestId}/approve")
    public ResponseEntity<?> approveProviderRegistration(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long requestId,
            @RequestBody Map<String, Object> payload) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(requireProviderCenterReview().approveRegistration(
            access.context(), requestId, requiredLong(payload, "unit_id"),
            requiredLong(payload, "business_id"), text(payload, "review_note")));
    }

    @PostMapping("/provider-center/registrations/{requestId}/reject")
    public ResponseEntity<?> rejectProviderRegistration(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long requestId,
            @RequestBody(required = false) Map<String, Object> payload) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(requireProviderCenterReview().rejectRegistration(
            access.context(), requestId, text(payload, "review_note")));
    }

    @PostMapping("/provider-center/changes/{requestId}/{action:approve|reject}")
    public ResponseEntity<?> reviewProviderChange(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long requestId,
            @PathVariable String action,
            @RequestBody(required = false) Map<String, Object> payload) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(requireProviderCenterReview().reviewFinanceChange(
            access.context(), requestId, "approve".equals(action), text(payload, "review_note")));
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

    private ProviderCenterReviewService requireProviderCenterReview() {
        if (providerCenterReview == null) throw new IllegalStateException("Provider Center review is unavailable.");
        return providerCenterReview;
    }

    private long requiredLong(Map<String, Object> payload, String field) {
        try {
            var raw = payload == null ? null : payload.get(field);
            var value = raw instanceof Number number ? number.longValue() : Long.parseLong(String.valueOf(raw));
            if (value > 0) return value;
        } catch (RuntimeException ignored) { }
        throw new IllegalArgumentException(field + " is required.");
    }

    private String text(Map<String, Object> payload, String field) {
        var value = payload == null ? null : payload.get(field);
        return value == null ? "" : String.valueOf(value).trim();
    }
}
