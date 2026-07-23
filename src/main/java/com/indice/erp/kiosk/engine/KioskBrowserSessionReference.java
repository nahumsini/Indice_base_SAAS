package com.indice.erp.kiosk.engine;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Provides an opaque browser-session reference that survives servlet session ID rotation.
 *
 * <p>Authentication may rotate {@code JSESSIONID} to prevent session fixation. Kiosk sessions
 * still need to remain bound to the same browser after that safe rotation, while a completely new
 * or invalidated HTTP session must receive a different reference.
 */
@Component
public class KioskBrowserSessionReference {

    public static final String HEADER = "X-Kiosk-Browser-Session";
    private static final String ATTRIBUTE =
        KioskBrowserSessionReference.class.getName() + ".reference";
    private static final int MIN_REFERENCE_LENGTH = 32;
    private static final int MAX_REFERENCE_LENGTH = 128;

    /**
     * Resolves the kiosk tab reference supplied by the public client.
     *
     * <p>Public kiosks may coexist with authenticated ERP tabs on the same origin. A reference
     * stored in {@code sessionStorage} keeps the controlled kiosk session bound to the exact tab,
     * even if another tab renews or invalidates the shared servlet session.
     */
    public String resolve(HttpServletRequest request, HttpSession session) {
        var explicitReference = request == null ? null : request.getHeader(HEADER);
        if (explicitReference != null && !explicitReference.isBlank()) {
            var normalized = explicitReference.trim();
            if (!isValid(normalized)) {
                throw new SecurityException("Kiosk browser validation failed.");
            }
            return normalized;
        }
        return resolve(session);
    }

    public String resolve(HttpSession session) {
        synchronized (session) {
            var current = session.getAttribute(ATTRIBUTE);
            if (current instanceof String value && !value.isBlank()) {
                return value;
            }
            var created = UUID.randomUUID().toString();
            session.setAttribute(ATTRIBUTE, created);
            return created;
        }
    }

    private boolean isValid(String value) {
        if (value.length() < MIN_REFERENCE_LENGTH || value.length() > MAX_REFERENCE_LENGTH) {
            return false;
        }
        for (int index = 0; index < value.length(); index++) {
            var character = value.charAt(index);
            if (!Character.isLetterOrDigit(character)
                    && character != '-' && character != '_') {
                return false;
            }
        }
        return true;
    }
}
