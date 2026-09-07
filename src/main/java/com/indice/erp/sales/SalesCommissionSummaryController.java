package com.indice.erp.sales;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.entitlement.RequiresCapability;
import com.indice.erp.kpis.KpiRequestAccessService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiresCapability("sales")
@RequestMapping("/api/v1/sales/commission-summary")
public class SalesCommissionSummaryController {
    private final SessionAuthService auth;
    private final KpiRequestAccessService access;
    private final SalesCommissionSummaryService service;
    public SalesCommissionSummaryController(SessionAuthService auth, KpiRequestAccessService access, SalesCommissionSummaryService service) {
        this.auth=auth; this.access=access; this.service=service;
    }
    /** Filter-only POST; no mutations, amounts and ownership are always loaded server-side. */
    @PostMapping
    public ResponseEntity<?> summarize(HttpSession session, @Valid @RequestBody SalesCommissionSummaryService.Query query) {
        var user = auth.currentUser(session);
        if (user.isEmpty()) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        try {
            return ResponseEntity.ok(service.summarize(user.get().companyId(), access.monetary(user.get(), "SALES_COMMISSION"), query));
        } catch (NoSuchElementException missing) {
            return ResponseEntity.status(404).body(Map.of("message", missing.getMessage()));
        } catch (IllegalArgumentException invalid) {
            return ResponseEntity.badRequest().body(Map.of("message", invalid.getMessage()));
        }
    }
}
