package com.indice.erp.exchange;

import com.indice.erp.auth.SessionAuthService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/exchange-rates")
public class BusinessExchangeRatesController {

    private final SessionAuthService sessionAuthService;
    private final BusinessExchangeRateService businessExchangeRateService;

    public BusinessExchangeRatesController(
        SessionAuthService sessionAuthService,
        BusinessExchangeRateService businessExchangeRateService
    ) {
        this.sessionAuthService = sessionAuthService;
        this.businessExchangeRateService = businessExchangeRateService;
    }

    @GetMapping("/daily")
    public ResponseEntity<?> dailyExchangeRates(
        @RequestParam(defaultValue = "false") boolean refresh,
        HttpSession session
    ) {
        if (sessionAuthService.currentUser(session).isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "User is not authenticated"));
        }

        return ResponseEntity.ok(businessExchangeRateService.loadDailyRates(refresh));
    }
}
