package com.indice.erp.pos.returns;

import com.indice.erp.entitlement.RequiresCapability;
import com.indice.erp.pos.PosRequestGuard;
import com.indice.erp.pos.terminal.PaymentTerminalRequestGuard;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import static com.indice.erp.pos.returns.PosReturnDtos.*;

@RestController
@RequiresCapability("pos")
@RequestMapping("/api/v1/pos/returns")
public class PosReturnController {
    private final PosRequestGuard guard;
    private final PaymentTerminalRequestGuard terminalGuard;
    private final PosReturnService service;
    private final PosReturnRepository repository;
    private final PosReturnCoordinator coordinator;
    private final PosReturnReviewService reviews;

    @Autowired
    public PosReturnController(PosRequestGuard guard, PaymentTerminalRequestGuard terminalGuard,
            PosReturnService service, PosReturnRepository repository, PosReturnCoordinator coordinator,
            PosReturnReviewService reviews) {
        this.guard = guard;
        this.terminalGuard = terminalGuard;
        this.service = service;
        this.repository = repository;
        this.coordinator = coordinator;
        this.reviews = reviews;
    }

    PosReturnController(PosRequestGuard guard, PosReturnService service,
            PosReturnRepository repository, PosReturnCoordinator coordinator) {
        this(guard, null, service, repository, coordinator, null);
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
        return access.denied() ? access.error()
            : ResponseEntity.ok(repository.candidates(access.context(), shiftId, search));
    }

    @GetMapping("/ticket/{ticketId}")
    public ResponseEntity<?> active(HttpSession session, @PathVariable long ticketId) {
        var access = guard.requireAdminReadAccess(session);
        return access.denied() ? access.error()
            : ResponseEntity.ok(repository.activeForTicket(access.context(), ticketId));
    }

    @GetMapping("/{id:\\d+}")
    public ResponseEntity<?> get(HttpSession session, @PathVariable long id) {
        var access = guard.requireAdminReadAccess(session);
        return access.denied() ? access.error() : ResponseEntity.ok(repository.get(access.context(), id));
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<?> confirm(HttpSession session, @PathVariable long id,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrf,
            @Valid @RequestBody ConfirmRequest request) {
        var access = guard.requireAdminWriteAccess(session, csrf);
        return access.denied() ? access.error()
            : ResponseEntity.ok(coordinator.confirm(access.context(), id, request));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(HttpSession session, @PathVariable long id,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrf) {
        var access = guard.requireAdminWriteAccess(session, csrf);
        return access.denied() ? access.error()
            : ResponseEntity.ok(service.cancelPreparation(access.context(), id));
    }

    @GetMapping("/{reference:.*\\D.*}")
    public ResponseEntity<?> find(@PathVariable String reference, HttpSession session) {
        var access = terminalGuard.adminRead(session);
        return access.denied() ? access.error() : ResponseEntity.ok(service.find(access.context(), reference));
    }

    @PostMapping("/{reference}/refunds")
    public ResponseEntity<?> refund(@PathVariable String reference, HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrf,
            @Valid @RequestBody PosReturnRefundRequest request) {
        var access = terminalGuard.adminWrite(session, csrf);
        return access.denied() ? access.error()
            : ResponseEntity.ok(service.refund(access.context(), reference, request));
    }

    @PostMapping("/{reference}/refresh")
    public ResponseEntity<?> refresh(@PathVariable String reference, HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrf) {
        var access = terminalGuard.adminWrite(session, csrf);
        return access.denied() ? access.error()
            : ResponseEntity.ok(service.refresh(access.context(), reference));
    }

    @PostMapping("/{reference}/refunds/recheck")
    public ResponseEntity<?> recheck(@PathVariable String reference, HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrf,
            @Valid @RequestBody PosReturnReviewRequest request) {
        var access = terminalGuard.adminWrite(session, csrf);
        return access.denied() ? access.error()
            : ResponseEntity.ok(reviews.recheck(access.context(), reference, request));
    }
}
