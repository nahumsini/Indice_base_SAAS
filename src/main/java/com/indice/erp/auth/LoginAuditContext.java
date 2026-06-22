package com.indice.erp.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

public record LoginAuditContext(String ipAddress, String userAgent, String sessionId) {

    public static LoginAuditContext empty() {
        return new LoginAuditContext("", "", "");
    }

    public static LoginAuditContext from(HttpServletRequest request, HttpSession session) {
        return new LoginAuditContext(clientIp(request), header(request, "User-Agent"), session == null ? "" : session.getId());
    }

    private static String clientIp(HttpServletRequest request) {
        var forwardedFor = header(request, "X-Forwarded-For");
        if (!forwardedFor.isBlank()) {
            return forwardedFor.split(",", 2)[0].trim();
        }
        return request == null || request.getRemoteAddr() == null ? "" : request.getRemoteAddr().trim();
    }

    private static String header(HttpServletRequest request, String name) {
        if (request == null) {
            return "";
        }
        var value = request.getHeader(name);
        return value == null ? "" : value.trim();
    }
}
