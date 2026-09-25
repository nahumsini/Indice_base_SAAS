package com.indice.erp.pos.returns;

import com.indice.erp.entitlement.RequiresCapability;
import com.indice.erp.pos.PosRequestGuard;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import static com.indice.erp.pos.returns.PosReturnDtos.*;

@RestController
@RequestMapping("/api/v1/pos/returns")
@RequiresCapability("pos")
public class PosReturnController {
    private final PosRequestGuard guard;
    private final PosReturnService service;
    private final PosReturnRepository repository;
    private final PosReturnCoordinator coordinator;
    public PosReturnController(PosRequestGuard guard, PosReturnService service,
            PosReturnRepository repository, PosReturnCoordinator coordinator) {
        this.guard = guard; this.service = service; this.repository = repository; this.coordinator = coordinator;
    }
    @PostMapping
    public ResponseEntity<?> prepare(HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrf,
            @Valid @RequestBody PrepareRequest request) {
        var access = guard.requireAdminWriteAccess(session, csrf);
        return access.denied() ? access.error() : ResponseEntity.ok(service.prepare(access.context(), request));
    }
    @GetMapping("/tickets")
    public ResponseEntity<?> candidates(HttpSession session, @RequestParam long shiftId,
            @RequestParam(defaultValue = "") String search) {
        var access = guard.requireAdminReadAccess(session);
        return access.denied() ? access.error() : ResponseEntity.ok(repository.candidates(access.context(), shiftId, search));
    }
    @GetMapping("/ticket/{ticketId}")
    public ResponseEntity<?> active(HttpSession session, @PathVariable long ticketId) {
        var access = guard.requireAdminReadAccess(session);
        return access.denied() ? access.error() : ResponseEntity.ok(repository.activeForTicket(access.context(), ticketId));
    }
    @GetMapping("/{id}")
    public ResponseEntity<?> get(HttpSession session, @PathVariable long id) {
        var access = guard.requireAdminReadAccess(session);
        return access.denied() ? access.error() : ResponseEntity.ok(repository.get(access.context(), id));
    }
    @PostMapping("/{id}/confirm")
    public ResponseEntity<?> confirm(HttpSession session, @PathVariable long id,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrf,
            @Valid @RequestBody ConfirmRequest request) {
        var access = guard.requireAdminWriteAccess(session, csrf);
        return access.denied() ? access.error() : ResponseEntity.ok(coordinator.confirm(access.context(), id, request));
    }
    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(HttpSession session, @PathVariable long id,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrf) {
        var access = guard.requireAdminWriteAccess(session, csrf);
        return access.denied() ? access.error() : ResponseEntity.ok(service.cancelPreparation(access.context(), id));
    }
}
