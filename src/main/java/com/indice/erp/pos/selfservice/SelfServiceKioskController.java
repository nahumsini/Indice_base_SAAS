package com.indice.erp.pos.selfservice;

import com.indice.erp.pos.PosRequestGuard;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.CreateRequest;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.StatusRequest;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.UpdateRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pos/self-service-kiosks")
public class SelfServiceKioskController {

    private final PosRequestGuard guard;
    private final SelfServiceKioskService service;

    public SelfServiceKioskController(PosRequestGuard guard, SelfServiceKioskService service) {
        this.guard = guard;
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        var access = guard.requireAdminReadAccess(session);
        return access.denied() ? access.error() : ResponseEntity.ok(service.list(access.context()));
    }

    @PostMapping
    public ResponseEntity<?> create(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody CreateRequest request) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        return access.denied() ? access.error() : ResponseEntity.status(HttpStatus.CREATED)
            .body(service.create(access.context(), request));
    }

    @PutMapping("/{kioskId}")
    public ResponseEntity<?> update(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @Valid @RequestBody UpdateRequest request) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        return access.denied() ? access.error()
            : ResponseEntity.ok(service.update(access.context(), kioskId, request));
    }

    @PostMapping("/{kioskId}/status")
    public ResponseEntity<?> status(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @Valid @RequestBody StatusRequest request) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        return access.denied() ? access.error()
            : ResponseEntity.ok(service.transition(access.context(), kioskId, request));
    }

    @PostMapping("/{kioskId}/rotate-link")
    public ResponseEntity<?> rotateLink(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        return access.denied() ? access.error()
            : ResponseEntity.ok(service.rotateLink(access.context(), kioskId));
    }

    @DeleteMapping("/{kioskId}")
    public ResponseEntity<?> delete(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @RequestBody(required = false) StatusRequest request) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        if (access.denied()) return access.error();
        service.delete(access.context(), kioskId, request == null ? null : request.reason());
        return ResponseEntity.ok(java.util.Map.of("deleted", true));
    }

    @GetMapping("/pretickets")
    public ResponseEntity<?> pending(
            HttpSession session,
            @RequestParam long cashRegisterId) {
        var access = guard.requireReadAccess(session);
        return access.denied() ? access.error()
            : ResponseEntity.ok(service.pending(access.context(), cashRegisterId));
    }

    @PostMapping("/pretickets/{preticketId}/claim")
    public ResponseEntity<?> claim(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long preticketId,
            @RequestParam long cashRegisterId) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied() ? access.error()
            : ResponseEntity.ok(service.claim(access.context(), preticketId, cashRegisterId));
    }

    @PostMapping("/pretickets/{preticketId}/release")
    public ResponseEntity<?> releaseClaim(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long preticketId,
            @RequestParam long cashRegisterId) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied() ? access.error()
            : ResponseEntity.ok(service.releaseClaim(access.context(), preticketId, cashRegisterId));
    }
}
