package com.indice.erp.pos.terminal;

public final class ProviderPublicRoutes {
    private ProviderPublicRoutes() {
    }

    public static boolean matches(String method, String path) {
        if ("POST".equals(method)) {
            return path.equals("/api/v1/pos/mercado-pago/webhook")
                || path.equals("/api/v1/pos/square/webhook");
        }
        return "GET".equals(method) && (
            path.equals("/api/v1/pos/mercado-pago/oauth/callback")
            || path.equals("/api/v1/pos/square/oauth/callback"));
    }
}
