package com.indice.erp.hr.attendance.kiosk;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

import static com.indice.erp.hr.shared.HrPayloadUtils.isBlank;


@Component
public class AttendanceKioskDeviceMapper {

    private final ObjectMapper objectMapper;

    public AttendanceKioskDeviceMapper(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> toMap(KioskDeviceRow device) {
        var body = new LinkedHashMap<String, Object>();
        body.put("id", device.id());
        body.put("company_id", device.companyId());
        body.put("unit_id", device.unitId());
        body.put("unit_name", device.unitName());
        body.put("business_id", device.businessId());
        body.put("business_name", device.businessName());
        body.put("location_id", device.locationId());
        body.put("location_name", device.locationName());
        body.put("code", device.code());
        body.put("name", device.name());
        body.put("status", device.status());
        body.put("public_access_token", device.publicAccessToken());
        var metadata = new LinkedHashMap<String, Object>();
        metadata.putAll(parseJsonMap(device.metadataJson()));
        metadata.remove(AttendanceKioskPinThrottleService.PIN_THROTTLE_METADATA_KEY);
        body.put("metadata", metadata);
        return body;
    }

    public Map<String, Object> parseJsonMap(String json) {
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

    public String toJson(Object value) {
        try {
            return value == null ? null : objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            throw new IllegalArgumentException("metadata must be valid JSON.");
        }
    }

    public String mergeInternalMetadata(String candidateJson, String existingJson) {
        var candidate = new LinkedHashMap<String, Object>();
        candidate.putAll(parseJsonMap(candidateJson));
        var existing = parseJsonMap(existingJson);
        if (existing.containsKey(AttendanceKioskPinThrottleService.PIN_THROTTLE_METADATA_KEY)) {
            candidate.put(
                AttendanceKioskPinThrottleService.PIN_THROTTLE_METADATA_KEY,
                existing.get(AttendanceKioskPinThrottleService.PIN_THROTTLE_METADATA_KEY)
            );
        }
        return toJson(candidate);
    }
}
