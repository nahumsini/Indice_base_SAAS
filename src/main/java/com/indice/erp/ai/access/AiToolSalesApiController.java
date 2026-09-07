package com.indice.erp.ai.access;

import com.indice.erp.sales.kpis.SalesKpiTodayService;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ai/tools/sales")
public class AiToolSalesApiController {

    private static final String BEARER_CHALLENGE = "Bearer realm=\"indice-ai\", error=\"invalid_token\"";

    private final AiAccessTokenService tokenService;
    private final AiToolAuthorizationService authorizationService;
    private final SalesKpiTodayService salesKpiTodayService;
    private final AiToolUsageAuditService auditService;
    private final com.indice.erp.hr.HrOperationalScopeService scopes;

    public AiToolSalesApiController(
        AiAccessTokenService tokenService,
        AiToolAuthorizationService authorizationService,
        SalesKpiTodayService salesKpiTodayService,
        AiToolUsageAuditService auditService,
        com.indice.erp.hr.HrOperationalScopeService scopes
    ) {
        this.tokenService = tokenService;
        this.authorizationService = authorizationService;
        this.salesKpiTodayService = salesKpiTodayService;
        this.auditService = auditService;
        this.scopes = scopes;
    }

    @GetMapping("/today")
    public ResponseEntity<?> today(
        @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
        @RequestParam(required = false) String preferredCurrency
    ) {
        var token = tokenService.authenticate(authorization, AiAccessTokenService.SALES_TODAY_READ);
        if (token.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .header(HttpHeaders.WWW_AUTHENTICATE, BEARER_CHALLENGE)
                .body(Map.of("message", "Invalid or expired access token."));
        }
        var storedToken = token.get();
        if (!authorizationService.canReadSalesToday(storedToken.user())) {
            auditService.recordRead(storedToken, "get_sales_today", "FAILURE", HttpStatus.FORBIDDEN.value());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "message", "The current Indice permissions do not allow this tool.",
                "code", "ai_tool_permission_required"
            ));
        }

        try {
            var response = salesKpiTodayService.today(storedToken.user().companyId(), preferredCurrency, scopes.resolve(storedToken.user()));
            auditService.recordRead(storedToken, "get_sales_today", "SUCCESS", HttpStatus.OK.value());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException exception) {
            auditService.recordRead(storedToken, "get_sales_today", "FAILURE", HttpStatus.BAD_REQUEST.value());
            return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
        }
    }
}
