package com.indice.erp.kiosk.engine;

import java.util.Map;

/** Canonical execution metadata kept out of legacy response payloads. */
public record KioskDispatchResult(
        Map<String, Object> data,
        String kioskSessionId,
        String versionedCapability) {
}
