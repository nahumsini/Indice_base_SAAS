package com.indice.erp.processTasks.kiosk;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

/** Public/admin DTO mapping kept outside module commands and persistence queries. */
@Component
class ProcessTaskKioskViewMapper {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};
    private final ObjectMapper objectMapper;

    ProcessTaskKioskViewMapper(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    Map<String, Object> admin(ProcessTaskKioskRow kiosk) {
        var row = new LinkedHashMap<String, Object>();
        row.put("id", kiosk.id());
        row.put("company_id", kiosk.companyId());
        row.put("unit_id", kiosk.unitId());
        row.put("unit_name", kiosk.unitName());
        row.put("business_id", kiosk.businessId());
        row.put("business_name", kiosk.businessName());
        row.put("code", kiosk.code());
        row.put("name", kiosk.name());
        row.put("status", kiosk.status());
        row.put("engine_status", kiosk.engineStatus());
        row.put("expires_at", kiosk.expiresAt());
        row.put("public_access_token", kiosk.legacyTokenRecoverable() ? kiosk.publicAccessToken() : "");
        row.put("public_token_hint", kiosk.publicTokenHint());
        row.put("token_display_once", false);
        row.put("metadata", metadata(kiosk.metadataJson()));
        row.put("scope_label", scopeLabel(kiosk));
        row.put("created_at", kiosk.createdAt());
        row.put("updated_at", kiosk.updatedAt());
        return row;
    }

    Map<String, Object> issued(ProcessTaskKioskRow kiosk, String publicToken) {
        var row = new LinkedHashMap<>(admin(kiosk));
        row.put("public_access_token", publicToken);
        row.put("issued_public_token", publicToken);
        row.put("public_token_hint", publicToken.substring(Math.max(0, publicToken.length() - 8)));
        row.put("token_display_once", true);
        return row;
    }

    Map<String, Object> publicKiosk(ProcessTaskKioskRow kiosk) {
        var row = new LinkedHashMap<String, Object>();
        row.put("id", kiosk.id());
        row.put("code", kiosk.code());
        row.put("name", kiosk.name());
        row.put("status", kiosk.status());
        row.put("expires_at", kiosk.expiresAt());
        return row;
    }

    Map<String, Object> employee(ProcessTaskKioskEmployee employee) {
        var row = new LinkedHashMap<String, Object>();
        row.put("id", employee.userCompanyId());
        row.put("user_id", employee.userId());
        row.put("user_code", employee.userCode());
        row.put("full_name", employee.fullName());
        row.put("position_title", employee.positionTitle());
        row.put("department", employee.department());
        return row;
    }

    Map<String, Object> metadata(String value) {
        if (value == null || value.isBlank()) return new LinkedHashMap<>();
        try {
            var parsed = objectMapper.readValue(value, MAP_TYPE);
            return parsed == null ? new LinkedHashMap<>() : new LinkedHashMap<>(parsed);
        } catch (Exception ignored) {
            return new LinkedHashMap<>();
        }
    }

    String scopeLabel(ProcessTaskKioskRow kiosk) {
        if (kiosk.businessId() != null) {
            return fallback(kiosk.businessName(), "Business " + kiosk.businessId());
        }
        if (kiosk.unitId() != null) {
            return fallback(kiosk.unitName(), "Unit " + kiosk.unitId());
        }
        return "Assigned tasks";
    }

    private String fallback(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
