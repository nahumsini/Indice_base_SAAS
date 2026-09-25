package com.indice.erp.finance.terminalrefunds;

import com.indice.erp.finance.FinanceRequestGuard;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/finance/terminal-refund-adjustments/page")
public class TerminalRefundAdjustmentPageController {
    private final FinanceRequestGuard guard; private final TerminalRefundAdjustmentListing listing;
    public TerminalRefundAdjustmentPageController(FinanceRequestGuard guard,
            TerminalRefundAdjustmentListing listing) {
        this.guard = guard; this.listing = listing;
    }
    @GetMapping
    public ResponseEntity<?> page(HttpSession session, @RequestParam(required = false) String state,
            @RequestParam(required = false) Long beforeId, @RequestParam(required = false) Integer limit) {
        var access = guard.requireReadAccess(session);
        if (access.denied()) return access.error();
        return ResponseEntity.ok(listing.page(access.context(), state, beforeId, limit));
    }
}
