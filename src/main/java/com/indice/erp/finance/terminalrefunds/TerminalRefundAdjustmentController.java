package com.indice.erp.finance.terminalrefunds;
import com.indice.erp.finance.FinanceRequestGuard;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/finance/terminal-refund-adjustments")
public class TerminalRefundAdjustmentController {
    private final FinanceRequestGuard guard;
    private final TerminalRefundAdjustmentService service;
    public TerminalRefundAdjustmentController(FinanceRequestGuard guard, TerminalRefundAdjustmentService service) {
        this.guard = guard; this.service = service;
    }
    @GetMapping
    public ResponseEntity<?> list(HttpSession session, @RequestParam(required = false) String state) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(service.list(access.context(), state).stream()
            .map(TerminalRefundAdjustmentResponse::from).toList());
    }
    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approve(HttpSession session, @PathVariable long id,
            @RequestHeader(name="X-CSRF-Token", required=false) String csrf,
            @Valid @RequestBody ApproveTerminalRefundAdjustmentRequest request) {
        var access = guard.requireWriteAccess(session, csrf);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(TerminalRefundAdjustmentResponse.from(service.approve(
            access.context(), id, request.reason(), request.version())));
    }
    @PostMapping("/{id}/post")
    public ResponseEntity<?> post(HttpSession session, @PathVariable long id,
            @RequestHeader(name="X-CSRF-Token", required=false) String csrf,
            @Valid @RequestBody PostTerminalRefundAdjustmentRequest request) {
        var access = guard.requireWriteAccess(session, csrf);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(TerminalRefundAdjustmentResponse.from(
            service.post(access.context(), id, request.version())));
    }
    @PostMapping("/{id}/resolve")
    public ResponseEntity<?> resolve(HttpSession session, @PathVariable long id,
            @RequestHeader(name="X-CSRF-Token", required=false) String csrf,
            @Valid @RequestBody ResolveTerminalRefundAdjustmentRequest request) {
        var access = guard.requireWriteAccess(session, csrf);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(TerminalRefundAdjustmentResponse.from(service.resolve(
            access.context(), id, request.reason(), request.version())));
    }
}
