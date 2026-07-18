package com.indice.erp.finance.payablekiosk;

import com.indice.erp.finance.FinanceRequestGuard;
import com.indice.erp.finance.payablekiosk.dto.PayableKioskRequest;
import com.indice.erp.finance.payablekiosk.dto.PayableKioskProviderAccessRequest;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskIdentityBiometricService;
import java.util.Map;
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
@RequestMapping("/api/v1/finance/payable-kiosks")
public class FinancePayableKioskController {

    private final FinanceRequestGuard guard;
    private final PayableKioskService service;
    private final KioskIdentityBiometricService biometrics;

    public FinancePayableKioskController(
            FinanceRequestGuard guard,
            PayableKioskService service,
            KioskIdentityBiometricService biometrics) {
        this.guard = guard;
        this.service = service;
        this.biometrics = biometrics;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(service.list(access.context()));
    }

    @PostMapping
    public ResponseEntity<?> create(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody PayableKioskRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(access.context(), request));
    }

    @PutMapping("/{kioskId}")
    public ResponseEntity<?> update(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @Valid @RequestBody PayableKioskRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(service.update(access.context(), kioskId, request));
    }

    @PostMapping("/{kioskId}/rotate-public-access-token")
    public ResponseEntity<?> rotatePublicAccessToken(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(service.rotatePublicToken(access.context(), kioskId));
    }

    @PostMapping("/{kioskId}/disable")
    public ResponseEntity<?> disable(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @RequestBody(required = false) Map<String, Object> payload) {
        return transition(session, csrfToken, kioskId, payload, KioskDefinitionStatus.DISABLED);
    }

    @PostMapping("/{kioskId}/enable")
    public ResponseEntity<?> enable(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @RequestBody(required = false) Map<String, Object> payload) {
        return transition(session, csrfToken, kioskId, payload, KioskDefinitionStatus.ACTIVE);
    }

    @PostMapping("/{kioskId}/revoke")
    public ResponseEntity<?> revoke(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @RequestBody(required = false) Map<String, Object> payload) {
        return transition(session, csrfToken, kioskId, payload, KioskDefinitionStatus.REVOKED);
    }

    @GetMapping("/biometric-policy")
    public ResponseEntity<?> biometricPolicy(HttpSession session) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(biometrics.companyPolicy(access.context().companyId()));
    }

    @PutMapping("/biometric-policy")
    public ResponseEntity<?> updateBiometricPolicy(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestBody Map<String, Object> payload) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        if (payload == null || !(payload.get("enabled") instanceof Boolean enabled)) {
            throw new IllegalArgumentException("enabled must be boolean.");
        }
        return ResponseEntity.ok(biometrics.updateCompanyPolicy(
            access.context().companyId(), access.context().userId(), enabled));
    }

    @GetMapping("/provider-accesses")
    public ResponseEntity<?> listProviderAccesses(HttpSession session) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(service.listProviderAccesses(access.context()));
    }

    @PostMapping("/provider-accesses")
    public ResponseEntity<?> issueProviderAccess(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody PayableKioskProviderAccessRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(service.issueProviderAccess(access.context(), request));
    }

    @PostMapping("/provider-accesses/{accessId}/rotate-pin")
    public ResponseEntity<?> rotateProviderPin(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long accessId) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(service.rotateProviderPin(access.context(), accessId));
    }

    @DeleteMapping("/provider-accesses/{accessId}")
    public ResponseEntity<?> revokeProviderAccess(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long accessId) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(service.revokeProviderAccess(access.context(), accessId));
    }

    @DeleteMapping("/{kioskId}")
    public ResponseEntity<?> delete(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(service.delete(access.context(), kioskId));
    }

    private ResponseEntity<?> transition(
            HttpSession session,
            String csrfToken,
            long kioskId,
            Map<String, Object> payload,
            KioskDefinitionStatus target) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        var reason = payload == null ? null : String.valueOf(payload.getOrDefault("reason", ""));
        return ResponseEntity.ok(service.transition(access.context(), kioskId, target, reason));
    }
}
