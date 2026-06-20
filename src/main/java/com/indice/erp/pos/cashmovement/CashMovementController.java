package com.indice.erp.pos.cashmovement;

import com.indice.erp.pos.PosRequestGuard;
import com.indice.erp.pos.cashmovement.dto.CashMovementCreateRequest;
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
@RequestMapping("/api/v1/pos/cash-movements")
public class CashMovementController {

    private final PosRequestGuard guard;
    private final CashMovementService service;

    public CashMovementController(PosRequestGuard guard, CashMovementService service) {
        this.guard = guard;
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session, @RequestParam long shiftId) {
        var access = guard.requireReadAccess(session);
        return access.denied() ? access.error() : ResponseEntity.ok(service.list(access.context(), shiftId));
    }

    @PostMapping
    public ResponseEntity<?> create(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody CashMovementCreateRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(access.context(), request));
    }
}
