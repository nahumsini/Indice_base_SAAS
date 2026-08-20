package com.indice.erp.pos.cashclosing;

import com.indice.erp.pos.PosRequestGuard;
import jakarta.servlet.http.HttpSession;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pos/cash-closings")
public class CashClosingController {

    private final PosRequestGuard guard;
    private final CashClosingHistoryService service;

    public CashClosingController(PosRequestGuard guard, CashClosingHistoryService service) {
        this.guard = guard;
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<?> list(
            HttpSession session,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) Long cashRegisterId,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) Long shiftId,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) {
            return access.error();
        }
        var filter = new CashClosingQueryFilter(
            dateFrom, dateTo, cashRegisterId, warehouseId, shiftId, userId, search, limit, offset
        );
        return ResponseEntity.ok(service.list(access.context(), filter));
    }

    @GetMapping("/{closingId}")
    public ResponseEntity<?> detail(HttpSession session, @PathVariable long closingId) {
        var access = guard.requireReadAccess(session);
        return access.denied() ? access.error() : ResponseEntity.ok(service.detail(access.context(), closingId));
    }
}
