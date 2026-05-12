package com.indice.erp.hr.attendance.access;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.hr.attendance.models.AccessMethodRow;
import com.indice.erp.hr.attendance.models.AccessProfileRow;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

import static com.indice.erp.hr.attendance.support.AttendancePresentation.toIsoString;
import static com.indice.erp.hr.shared.HrPayloadUtils.isBlank;


@Component
class AttendanceAccessMapper {

    private static final String PIN_METADATA_CODE_KEY = "_pin_code";

    private final ObjectMapper objectMapper;

    AttendanceAccessMapper(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    Map<String, Object> toAccessProfileMap(AccessProfileRow profile) {
        var body = new LinkedHashMap<String, Object>();
        body.put("id", profile.id());
        body.put("company_id", profile.companyId());
        body.put("user_company_id", profile.userCompanyId());
        body.put("user_code", profile.userCode());
        body.put("user_name", profile.userName());
        body.put("status", profile.status());
        body.put("default_method", profile.defaultMethod());
        body.put("last_enrolled_at", toIsoString(profile.lastEnrolledAt()));
        body.put("metadata", parseJsonMap(profile.metadataJson()));
        body.put("methods", profile.methods().stream().map(this::toAccessMethodMap).toList());
        return body;
    }

    Map<String, Object> toAccessMethodMap(AccessMethodRow method) {
        var body = new LinkedHashMap<String, Object>();
        var metadata = new LinkedHashMap<String, Object>();
        metadata.putAll(parseJsonMap(method.metadataJson()));
        var pinCode = metadataTextValue(metadata.remove(PIN_METADATA_CODE_KEY));
        body.put("id", method.id());
        body.put("company_id", method.companyId());
        body.put("access_profile_id", method.accessProfileId());
        body.put("user_company_id", method.userCompanyId());
        body.put("user_code", method.userCode());
        body.put("user_name", method.userName());
        body.put("method_type", method.methodType());
        body.put("credential_ref", "badge".equals(method.methodType()) ? method.credentialRef() : null);
        body.put("pin_code", "pin".equals(method.methodType()) ? pinCode : null);
        body.put("status", method.status());
        body.put("priority", method.priority());
        body.put("metadata", metadata);
        return body;
    }

    String toJson(Object value) {
        try {
            return value == null ? null : objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            throw new IllegalArgumentException("metadata must be valid JSON.");
        }
    }

    Map<String, Object> parseJsonMap(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {
            });
        } catch (Exception ex) {
            return Map.of();
        }
    }

    String mergePinMetadataJson(String existingJson, String requestedJson, String pin) {
        var merged = new LinkedHashMap<String, Object>();
        merged.putAll(parseJsonMap(existingJson));
        merged.putAll(parseJsonMap(requestedJson));
        if (pin != null) {
            merged.put(PIN_METADATA_CODE_KEY, pin);
            merged.put("pin_updated_at", Instant.now().toString());
        }
        return toJson(merged);
    }

    private String metadataTextValue(Object value) {
        return value == null ? null : value.toString();
    }
}
