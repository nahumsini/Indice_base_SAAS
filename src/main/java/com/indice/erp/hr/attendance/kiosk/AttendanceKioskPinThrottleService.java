package com.indice.erp.hr.attendance.kiosk;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import static com.indice.erp.hr.shared.HrPayloadUtils.isBlank;


@Service
public class AttendanceKioskPinThrottleService {

    public static final String PIN_THROTTLE_METADATA_KEY = "_pin_throttle";

    private static final int FAILURE_LIMIT = 5;
    private static final Duration LOCK_DURATION = Duration.ofMinutes(15);

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public AttendanceKioskPinThrottleService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Transactional(
        propagation = Propagation.REQUIRES_NEW,
        noRollbackFor = KioskPinThrottleException.class
    )
    public void ensureAttemptAllowed(KioskDeviceRow kioskDevice) {
        var state = loadThrottle(kioskDevice);
        if (state == null) {
            return;
        }

        var now = Instant.now();
        if (!state.isLocked(now)) {
            if (state.lockedUntil() != null) {
                clearFailures(kioskDevice);
            }
            return;
        }

        throw new KioskPinThrottleException(throttleMessage(state, now));
    }

    @Transactional(
        propagation = Propagation.REQUIRES_NEW,
        noRollbackFor = KioskPinThrottleException.class
    )
    public void recordFailure(KioskDeviceRow kioskDevice) {
        var now = Instant.now();
        var current = loadThrottle(kioskDevice);
        if (current != null && current.isLocked(now)) {
            throw new KioskPinThrottleException(throttleMessage(current, now));
        }

        var nextFailedAttempts = current == null || current.lockedUntil() != null
            ? 1
            : current.failedAttempts() + 1;
        var lockedUntil = nextFailedAttempts >= FAILURE_LIMIT
            ? now.plus(LOCK_DURATION)
            : null;
        var nextState = new PinThrottleState(nextFailedAttempts, lockedUntil);
        updateThrottle(kioskDevice, nextState);

        if (nextState.isLocked(now)) {
            throw new KioskPinThrottleException(throttleMessage(nextState, now));
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void clearFailures(KioskDeviceRow kioskDevice) {
        updateThrottle(kioskDevice, null);
    }

    private PinThrottleState loadThrottle(KioskDeviceRow kioskDevice) {
        var metadata = parseJsonMap(loadMetadataForUpdate(kioskDevice));
        var rawThrottle = metadata.get(PIN_THROTTLE_METADATA_KEY);
        if (!(rawThrottle instanceof Map<?, ?> throttleMap)) {
            return null;
        }

        var failedAttempts = parseMetadataInt(throttleMap.get("failed_attempts"));
        var lockedUntil = parseMetadataInstant(throttleMap.get("locked_until"));
        if (failedAttempts <= 0 && lockedUntil == null) {
            return null;
        }
        return new PinThrottleState(Math.max(failedAttempts, 0), lockedUntil);
    }

    private void updateThrottle(KioskDeviceRow kioskDevice, PinThrottleState state) {
        var metadata = new LinkedHashMap<String, Object>();
        metadata.putAll(parseJsonMap(loadMetadataForUpdate(kioskDevice)));

        if (state == null) {
            metadata.remove(PIN_THROTTLE_METADATA_KEY);
        } else {
            var throttleMetadata = new LinkedHashMap<String, Object>();
            throttleMetadata.put("failed_attempts", state.failedAttempts());
            if (state.lockedUntil() != null) {
                throttleMetadata.put("locked_until", state.lockedUntil().toString());
            }
            metadata.put(PIN_THROTTLE_METADATA_KEY, throttleMetadata);
        }

        jdbcTemplate.update(
            """
                UPDATE attendance_kiosk_devices
                SET metadata_json = CAST(? AS JSON)
                WHERE id = ? AND company_id = ?
                """,
            toJson(metadata),
            kioskDevice.id(),
            kioskDevice.companyId()
        );
    }

    private String loadMetadataForUpdate(KioskDeviceRow kioskDevice) {
        var rows = jdbcTemplate.query(
            """
                SELECT metadata_json
                FROM attendance_kiosk_devices
                WHERE company_id = ?
                  AND id = ?
                LIMIT 1
                FOR UPDATE
                """,
            (rs, rowNum) -> rs.getString("metadata_json"),
            kioskDevice.companyId(),
            kioskDevice.id()
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Kiosk device not found.");
        }
        return rows.getFirst();
    }

    private String throttleMessage(PinThrottleState state, Instant now) {
        var remainingSeconds = Duration.between(now, state.lockedUntil()).toSeconds();
        var remainingMinutes = Math.max(1L, (remainingSeconds + 59L) / 60L);
        return "Too many failed PIN attempts. Try again in " + remainingMinutes
            + (remainingMinutes == 1 ? " minute." : " minutes.");
    }

    private int parseMetadataInt(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        var text = metadataTextValue(value);
        if (text == null) {
            return 0;
        }
        try {
            return Integer.parseInt(text);
        } catch (NumberFormatException ex) {
            return 0;
        }
    }

    private Instant parseMetadataInstant(Object value) {
        var text = metadataTextValue(value);
        if (text == null) {
            return null;
        }
        try {
            return Instant.parse(text);
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    private String metadataTextValue(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof String text) {
            return text.isBlank() ? null : text;
        }
        return String.valueOf(value);
    }

    private Map<String, Object> parseJsonMap(String json) {
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

    private String toJson(Object value) {
        try {
            return value == null ? null : objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            throw new IllegalArgumentException("metadata must be valid JSON.");
        }
    }
}
