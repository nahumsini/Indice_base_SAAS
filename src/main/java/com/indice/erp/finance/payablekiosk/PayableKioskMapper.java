package com.indice.erp.finance.payablekiosk;

import java.util.LinkedHashMap;
import java.util.Map;

final class PayableKioskMapper {

    private PayableKioskMapper() {
    }

    static Map<String, Object> toMap(PayableKioskRow row) {
        var map = new LinkedHashMap<String, Object>();
        map.put("id", row.id());
        map.put("unitId", row.unitId());
        map.put("businessId", row.businessId());
        map.put("providerId", row.providerId());
        map.put("code", row.code());
        map.put("name", row.name());
        map.put("status", row.status());
        map.put("accessType", row.accessType());
        map.put("publicAccessToken", row.publicAccessToken());
        map.put("currencyCode", row.currencyCode());
        map.put("allowProviderRegistration", row.allowProviderRegistration());
        return map;
    }

    static Map<String, Object> toPublicMap(PayableKioskRow row) {
        var map = toMap(row);
        map.remove("id");
        map.remove("publicAccessToken");
        return map;
    }
}
