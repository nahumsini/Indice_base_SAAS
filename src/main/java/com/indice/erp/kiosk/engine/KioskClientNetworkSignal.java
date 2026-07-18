package com.indice.erp.kiosk.engine;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Produces the network boundary used by public-kiosk throttling. The edge proxy owns
 * {@code remoteAddr}; request headers and user-agent are deliberately excluded because callers
 * can rotate them to evade a bucket or place secrets in operational telemetry.
 */
public final class KioskClientNetworkSignal {

    private KioskClientNetworkSignal() {
    }

    public static String from(HttpServletRequest request) {
        if (request == null || request.getRemoteAddr() == null
                || request.getRemoteAddr().isBlank()) {
            return "unknown";
        }
        return request.getRemoteAddr().trim();
    }
}
