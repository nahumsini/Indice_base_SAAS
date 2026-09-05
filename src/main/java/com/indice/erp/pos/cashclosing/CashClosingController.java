package com.indice.erp.pos.cashclosing;

import com.indice.erp.pos.PosRequestGuard;
import com.indice.erp.pos.settlement.CashClosingSettlementService;
import com.indice.erp.pos.settlement.ConfirmSettlementRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.beans.factory.annotation.Autowired;

@RestController
@RequestMapping("/api/v1/pos/cash-closings")
public class CashClosingController {

    private final PosRequestGuard guard;
    private final CashClosingHistoryService service;
    private final CashClosingSettlementService settlementService;

    public CashClosingController(PosRequestGuard guard, CashClosingHistoryService service) {
        this(guard, service, null);
    }

    @Autowired
    public CashClosingController(
            PosRequestGuard guard,
            CashClosingHistoryService service,
            CashClosingSettlementService settlementService) {
        this.guard = guard;
        this.service = service;
        this.settlementService = settlementService;
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

    @GetMapping("/{closingId}/settlements")
    public ResponseEntity<?> settlements(HttpSession session, @PathVariable long closingId) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) {
            return access.error();
        }
        if (settlementService == null) {
            return ResponseEntity.ok(java.util.List.of());
        }
        service.detail(access.context(), closingId);
        return ResponseEntity.ok(settlementService.list(access.context(), closingId));
    }

    @PostMapping("/{closingId}/settlements/{settlementId}/confirm")
    public ResponseEntity<?> confirmSettlement(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long closingId,
            @PathVariable long settlementId,
            @Valid @RequestBody ConfirmSettlementRequest request) {
        var access = guard.requireAdminWriteAccess(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        service.detail(access.context(), closingId);
        return ResponseEntity.ok(settlementService.confirm(access.context(), closingId, settlementId, request));
    }
}
