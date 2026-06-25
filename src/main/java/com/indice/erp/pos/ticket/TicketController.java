package com.indice.erp.pos.ticket;

import com.indice.erp.pos.PosRequestGuard;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pos/tickets")
public class TicketController {

    private final PosRequestGuard guard;
    private final TicketService service;

    public TicketController(PosRequestGuard guard, TicketService service) {
        this.guard = guard;
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        var access = guard.requireReadAccess(session);
        return access.denied() ? access.error() : ResponseEntity.ok(service.list(access.context()));
    }

    @GetMapping("/{ticketId}")
    public ResponseEntity<?> get(HttpSession session, @PathVariable long ticketId) {
        var access = guard.requireReadAccess(session);
        return access.denied() ? access.error() : ResponseEntity.ok(service.get(access.context(), ticketId));
    }
}
