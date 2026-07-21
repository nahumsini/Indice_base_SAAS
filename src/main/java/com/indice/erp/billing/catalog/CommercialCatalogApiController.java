package com.indice.erp.billing.catalog;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.tenant.TenantContextResolver;
import jakarta.servlet.http.HttpSession;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/platform")
public class CommercialCatalogApiController {

    private final SessionAuthService sessionAuthService;
    private final TenantContextResolver tenantContextResolver;
    private final CommercialCatalogService commercialCatalogService;

    public CommercialCatalogApiController(
        SessionAuthService sessionAuthService,
        TenantContextResolver tenantContextResolver,
        CommercialCatalogService commercialCatalogService
    ) {
        this.sessionAuthService = sessionAuthService;
        this.tenantContextResolver = tenantContextResolver;
        this.commercialCatalogService = commercialCatalogService;
    }

    @GetMapping("/context")
    public ResponseEntity<?> context(HttpSession httpSession) {
        var session = sessionAuthService.currentSession(httpSession);
        if (session.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        var body = new LinkedHashMap<String, Object>();
        body.put("tenant", tenantContextResolver.resolve(session.get()));
        body.put("catalog", commercialCatalogService.activeCatalog(session.get()));
        return ResponseEntity.ok(body);
    }
}
