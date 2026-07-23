package com.indice.erp.kiosk.engine;

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

    private static final String ATTRIBUTE =
        KioskBrowserSessionReference.class.getName() + ".reference";

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
}
