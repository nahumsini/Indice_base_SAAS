package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.terminal.PaymentTerminalRequestGuard;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/pos/mercado-pago/registers/{registerId}/terminal")
public class MpTerminalAssignmentController {
    private final PaymentTerminalRequestGuard guard;
    private final MpTerminalAssignment assignments;

    @PostMapping
    public ResponseEntity<?> assign(@PathVariable long registerId, HttpSession session,
        @RequestHeader(name="X-CSRF-Token", required=false) String csrf, @Valid @RequestBody MpSetupDtos.Assignment request) {
        var access = guard.adminWrite(session, csrf);
        return access.denied() ? access.error() : ResponseEntity.ok(assignments.assign(access.context(), registerId, request.terminalId()));
    }
    @DeleteMapping
    public ResponseEntity<?> unassign(@PathVariable long registerId, HttpSession session,
        @RequestHeader(name="X-CSRF-Token", required=false) String csrf) {
        var access = guard.adminWrite(session, csrf);
        if (access.denied()) return access.error();
        assignments.unassign(access.context(), registerId);
        return ResponseEntity.noContent().build();
    }
}
