package com.indice.erp.pos.shift;

import com.indice.erp.pos.PosRequestGuard;
import com.indice.erp.pos.shift.dto.ShiftCancelRequest;
import com.indice.erp.pos.shift.dto.ShiftCloseRequest;
import com.indice.erp.pos.shift.dto.ShiftOpenRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pos/shifts")
public class ShiftController {

    private final PosRequestGuard guard;
    private final ShiftService service;

    public ShiftController(PosRequestGuard guard, ShiftService service) {
        this.guard = guard;
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        var access = guard.requireReadAccess(session);
        return access.denied() ? access.error() : ResponseEntity.ok(service.list(access.context()));
    }

    @GetMapping("/{shiftId}")
    public ResponseEntity<?> get(HttpSession session, @PathVariable long shiftId) {
        var access = guard.requireReadAccess(session);
        return access.denied() ? access.error() : ResponseEntity.ok(service.get(access.context(), shiftId));
    }

    @GetMapping("/{shiftId}/closing-summary")
    public ResponseEntity<?> closingSummary(HttpSession session, @PathVariable long shiftId) {
        var access = guard.requireReadAccess(session);
        return access.denied() ? access.error() : ResponseEntity.ok(service.closingSummary(access.context(), shiftId));
    }

    @PostMapping("/open")
    public ResponseEntity<?> open(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @Valid @RequestBody ShiftOpenRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(service.open(access.context(), request));
    }

    @PostMapping("/{shiftId}/close")
    public ResponseEntity<?> close(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long shiftId,
            @Valid @RequestBody ShiftCloseRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied() ? access.error() : ResponseEntity.ok(service.close(access.context(), shiftId, request));
    }

    @PostMapping("/{shiftId}/cancel")
    public ResponseEntity<?> cancel(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long shiftId,
            @Valid @RequestBody ShiftCancelRequest request) {
        var access = guard.requireWriteAccess(session, csrfToken);
        return access.denied() ? access.error() : ResponseEntity.ok(service.cancel(access.context(), shiftId, request));
    }
}
