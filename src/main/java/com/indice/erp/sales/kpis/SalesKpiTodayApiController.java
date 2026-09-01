package com.indice.erp.sales.kpis;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.entitlement.RequiresCapability;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/sales/kpis")
@RequiresCapability("sales")
public class SalesKpiTodayApiController {

    private final SessionAuthService sessionAuthService;
    private final SalesKpiTodayService service;

    public SalesKpiTodayApiController(SessionAuthService sessionAuthService, SalesKpiTodayService service) {
        this.sessionAuthService = sessionAuthService;
        this.service = service;
    }

    @GetMapping("/today")
    public ResponseEntity<?> today(
        HttpSession session,
        @RequestParam(required = false) String preferredCurrency
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.ok(service.today(user.get().companyId(), preferredCurrency));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
        }
    }
}
