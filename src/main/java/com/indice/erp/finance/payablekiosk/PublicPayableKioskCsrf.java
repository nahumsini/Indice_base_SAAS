package com.indice.erp.finance.payablekiosk;

import com.indice.erp.auth.SessionCsrfService;
import jakarta.servlet.http.HttpSession;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

@Component
public class PublicPayableKioskCsrf {

    private final SessionCsrfService sessionCsrfService;

    public PublicPayableKioskCsrf(SessionCsrfService sessionCsrfService) {
        this.sessionCsrfService = sessionCsrfService;
    }

    public Map<String, Object> withToken(HttpSession session, Map<String, Object> payload) {
        var response = new LinkedHashMap<String, Object>(payload);
        response.put("csrfToken", sessionCsrfService.ensureCsrf(session));
        return response;
    }

    public ResponseEntity<?> require(HttpSession session, String csrfToken) {
        try {
            sessionCsrfService.requireCsrf(session, csrfToken);
            return null;
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", ex.getMessage()));
        }
    }
}
