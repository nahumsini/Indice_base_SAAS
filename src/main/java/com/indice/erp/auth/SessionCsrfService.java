package com.indice.erp.auth;

import jakarta.servlet.http.HttpSession;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class SessionCsrfService {

    public String ensureCsrf(HttpSession session) {
        var existing = session.getAttribute(SessionAuthService.SESSION_LOGIN_CSRF);
        if (existing instanceof String token && !token.isBlank()) {
            return token;
        }
        var token = UUID.randomUUID().toString().replace("-", "");
        session.setAttribute(SessionAuthService.SESSION_LOGIN_CSRF, token);
        return token;
    }

    public void requireCsrf(HttpSession session, String csrfToken) {
        var sessionCsrf = ensureCsrf(session);
        var providedToken = csrfToken == null ? "" : csrfToken.trim();
        if (providedToken.isBlank() || !sessionCsrf.equals(providedToken)) {
            throw new IllegalArgumentException("Invalid CSRF token.");
        }
    }
}
