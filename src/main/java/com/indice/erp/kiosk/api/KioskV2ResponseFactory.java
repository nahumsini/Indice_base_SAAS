package com.indice.erp.kiosk.api;

import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;

@Component
public class KioskV2ResponseFactory {

    public Map<String, Object> success(
            Object data,
            String kioskSessionId,
            String capability) {
        var meta = new LinkedHashMap<String, Object>();
        meta.put("requestId", requestId());
        if (kioskSessionId != null && !kioskSessionId.isBlank()) {
            meta.put("kioskSessionId", kioskSessionId);
        }
        if (capability != null && !capability.isBlank()) {
            meta.put("capability", capability);
        }
        return Map.of("data", data == null ? Map.of() : data, "meta", meta);
    }

    public Map<String, Object> error(String code, String message, boolean retryable) {
        return Map.of(
            "error", Map.of("code", code, "message", message, "retryable", retryable),
            "meta", Map.of("requestId", requestId())
        );
    }

    private String requestId() {
        var requestId = MDC.get("requestId");
        return requestId == null || requestId.isBlank() ? "unavailable" : requestId;
    }
}
