package com.indice.erp.access.tab;

import com.indice.erp.pos.terminal.ProviderPublicRoutes;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
class PaymentProviderTabPolicy {
    Optional<TabPermissionRequirement> classify(String method, String path) {
        if (ProviderPublicRoutes.matches(method, path)) return Optional.empty();
        if (path.startsWith("/api/v1/finance/terminal-refund-adjustments"))
            return one("expenses.payment-accounts");
        if (path.startsWith("/api/v1/pos/returns")) return one("pos.cortes");
        if (path.startsWith("/api/v1/pos/payment-terminals")) return one("pos.sale");
        if (path.startsWith("/api/v1/pos/mercado-pago/terminal-payments"))
            return path.contains("/refunds") || path.endsWith("/merchant-review")
                ? one("pos.cortes") : one("pos.sale");
        if (path.startsWith("/api/v1/pos/mercado-pago/status")) return any();
        if ("GET".equals(method) && (path.equals("/api/v1/pos/mercado-pago/terminals")
                || path.equals("/api/v1/pos/mercado-pago/terminals/"))) return any();
        if (path.startsWith("/api/v1/pos/mercado-pago")) return one("pos.cortes");
        if (path.startsWith("/api/v1/pos/square/terminal-payments"))
            return path.contains("/refunds") ? one("pos.cortes") : one("pos.sale");
        if (path.startsWith("/api/v1/pos/square/status") || "GET".equals(method)
                && (path.startsWith("/api/v1/pos/square/locations")
                    || path.startsWith("/api/v1/pos/square/terminals"))) return any();
        if (path.startsWith("/api/v1/pos/square")) return one("pos.cortes");
        return Optional.empty();
    }
    private Optional<TabPermissionRequirement> one(String key) {
        return Optional.of(TabPermissionRequirement.one(key));
    }
    private Optional<TabPermissionRequirement> any() {
        return Optional.of(TabPermissionRequirement.any("pos.sale", "pos.cortes"));
    }
}
