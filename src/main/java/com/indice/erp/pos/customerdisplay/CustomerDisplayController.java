package com.indice.erp.pos.customerdisplay;

import com.indice.erp.pos.PosRequestGuard;
import com.indice.erp.pos.customerdisplay.dto.CustomerDisplayPairRequest;
import com.indice.erp.pos.customerdisplay.dto.CustomerDisplayPairingCodeRequest;
import com.indice.erp.pos.customerdisplay.dto.CustomerDisplaySnapshotRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pos/customer-displays")
public class CustomerDisplayController {

    private final PosRequestGuard guard;
    private final CustomerDisplayService service;
    private final CustomerDisplayKioskGateway kioskGateway;

    public CustomerDisplayController(
            PosRequestGuard guard,
            CustomerDisplayService service,
            CustomerDisplayKioskGateway kioskGateway) {
        this.guard = guard;
        this.service = service;
        this.kioskGateway = kioskGateway;
    }

    @PostMapping("/pairing-code")
    public ResponseEntity<?> createPairingCode(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody CustomerDisplayPairingCodeRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createPairingCode(access.context(), request));
    }

    @PutMapping("/state")
    public ResponseEntity<?> publishState(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody CustomerDisplaySnapshotRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(service.publishSnapshot(access.context(), request));
    }

    @GetMapping("/public/pairing-bootstrap")
    public ResponseEntity<?> pairingBootstrap(
            HttpServletRequest request,
            HttpSession session) {
        return ResponseEntity.ok(kioskGateway.pairingBootstrap(request, session));
    }

    @PostMapping("/public/pair")
    public ResponseEntity<?> pair(
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody CustomerDisplayPairRequest requestBody,
            HttpServletRequest request,
            HttpSession session) {
        return ResponseEntity.ok(kioskGateway.pair(
            requestBody, csrfToken, idempotencyKey, request, session));
    }

    @GetMapping("/public/{deviceToken}/state")
    public ResponseEntity<?> publicState(
            @PathVariable String deviceToken,
            HttpServletRequest request,
            HttpSession session) {
        return ResponseEntity.ok(kioskGateway.state(deviceToken, request, session));
    }
}
