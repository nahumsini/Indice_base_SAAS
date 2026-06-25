package com.indice.erp.pos.customerdisplay;

import com.indice.erp.pos.PosRequestGuard;
import com.indice.erp.pos.customerdisplay.dto.CustomerDisplayPairRequest;
import com.indice.erp.pos.customerdisplay.dto.CustomerDisplayPairingCodeRequest;
import com.indice.erp.pos.customerdisplay.dto.CustomerDisplaySnapshotRequest;
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

    public CustomerDisplayController(PosRequestGuard guard, CustomerDisplayService service) {
        this.guard = guard;
        this.service = service;
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

    @PostMapping("/public/pair")
    public ResponseEntity<?> pair(@Valid @RequestBody CustomerDisplayPairRequest request) {
        return ResponseEntity.ok(service.pair(request));
    }

    @GetMapping("/public/{deviceToken}/state")
    public ResponseEntity<?> publicState(@PathVariable String deviceToken) {
        return ResponseEntity.ok(service.publicState(deviceToken));
    }
}
