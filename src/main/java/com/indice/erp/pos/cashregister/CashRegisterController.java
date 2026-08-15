package com.indice.erp.pos.cashregister;

import com.indice.erp.pos.PosRequestGuard;
import com.indice.erp.pos.cashregister.dto.CashRegisterCreateRequest;
import com.indice.erp.pos.cashregister.dto.CashRegisterUpdateRequest;
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
@RequestMapping("/api/v1/pos/cash-registers")
public class CashRegisterController {

    private final PosRequestGuard guard;
    private final CashRegisterService service;

    public CashRegisterController(PosRequestGuard guard, CashRegisterService service) {
        this.guard = guard;
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        var access = guard.requireReadAccess(session);
        return access.denied() ? access.error() : ResponseEntity.ok(service.list(access.context()));
    }

    @GetMapping("/{registerId}")
    public ResponseEntity<?> get(HttpSession session, @PathVariable long registerId) {
        var access = guard.requireReadAccess(session);
        return access.denied() ? access.error() : ResponseEntity.ok(service.get(access.context(), registerId));
    }

    @PostMapping
    public ResponseEntity<?> create(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody CashRegisterCreateRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(access.context(), request));
    }

    @PostMapping("/warehouses/{warehouseId}/ensure")
    public ResponseEntity<?> ensureForWarehouse(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long warehouseId) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied()
            ? access.error()
            : ResponseEntity.ok(service.ensureForWarehouse(access.context(), warehouseId));
    }

    @PutMapping("/{registerId}")
    public ResponseEntity<?> update(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long registerId,
            @Valid @RequestBody CashRegisterUpdateRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied() ? access.error() : ResponseEntity.ok(service.update(access.context(), registerId, request));
    }

    @DeleteMapping("/{registerId}")
    public ResponseEntity<?> delete(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long registerId) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied() ? access.error() : ResponseEntity.ok(service.delete(access.context(), registerId));
    }
}
