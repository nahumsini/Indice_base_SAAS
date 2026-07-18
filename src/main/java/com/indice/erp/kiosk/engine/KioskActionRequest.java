package com.indice.erp.kiosk.engine;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

public record KioskActionRequest(
        String capabilityKey,
        int capabilityVersion,
        Long resourceId,
        Map<String, Object> payload) {

    public KioskActionRequest {
        if (capabilityKey == null || capabilityKey.isBlank()) {
            throw new IllegalArgumentException("capabilityKey is required.");
        }
        capabilityKey = capabilityKey.trim();
        if (capabilityVersion < 1) {
            throw new IllegalArgumentException("capabilityVersion must be at least 1.");
        }
        payload = payload == null
            ? Map.of()
            : Collections.unmodifiableMap(new LinkedHashMap<>(payload));
    }

    public static KioskActionRequest of(String capabilityKey, Map<String, Object> payload) {
        return new KioskActionRequest(capabilityKey, 1, null, payload);
    }

    public static KioskActionRequest forResource(
            String capabilityKey,
            long resourceId,
            Map<String, Object> payload) {
        return new KioskActionRequest(capabilityKey, 1, resourceId, payload);
    }

    public String versionedCapabilityKey() {
        return capabilityKey + "@" + capabilityVersion;
    }
}
