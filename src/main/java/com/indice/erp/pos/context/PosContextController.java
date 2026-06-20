package com.indice.erp.pos.context;

import com.indice.erp.pos.PosRequestGuard;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pos")
public class PosContextController {

    private final PosRequestGuard guard;
    private final PosContextService service;

    public PosContextController(PosRequestGuard guard, PosContextService service) {
        this.guard = guard;
        this.service = service;
    }

    @GetMapping("/context")
    public ResponseEntity<?> context(HttpSession session) {
        var access = guard.requireReadAccess(session);
        return access.denied() ? access.error() : ResponseEntity.ok(service.context(access.context()));
    }
}
