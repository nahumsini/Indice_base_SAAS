package com.indice.erp.hr.attendance.usecases.kiosk;

import com.indice.erp.hr.attendance.kiosk.KioskPinThrottleException;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.transaction.annotation.Transactional;

import static com.indice.erp.hr.attendance.support.AttendanceLocationPresentation.toLocationMap;
import static com.indice.erp.hr.shared.HrPayloadUtils.isBlank;
import static com.indice.erp.hr.shared.HrPayloadUtils.nullable;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseDateTime;
import static com.indice.erp.hr.shared.HrPayloadUtils.stringValue;


public abstract class HrAttendancePublicKioskIdentityUseCases extends HrAttendanceKioskDeviceAccessUseCases {

    protected HrAttendancePublicKioskIdentityUseCases(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    public Map<String, Object> publicKioskBootstrap(String deviceToken) {
        var kioskDevice = attendanceKioskDeviceRepository.getByPublicAccessToken(deviceToken);
        var location = loadPublicKioskLocation(kioskDevice);
        var authMethods = attendanceAccessService.determinePublicKioskAuthMethods(kioskDevice.companyId());

        var body = new LinkedHashMap<String, Object>();
        body.put("kiosk_device", Map.of(
            "id", kioskDevice.id(),
            "code", kioskDevice.code(),
            "name", kioskDevice.name()
        ));
        body.put("location", location == null ? null : toLocationMap(location));
        body.put("scope_label", describeKioskScope(kioskDevice, location));
        body.put("auth_methods", authMethods);
        body.put("inactivity_timeout_seconds", kioskInactivityTimeoutSeconds);
        return body;
    }

    @Transactional(noRollbackFor = { IllegalArgumentException.class, KioskPinThrottleException.class })
    public Map<String, Object> publicKioskIdentify(String deviceToken, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var kioskDevice = attendanceKioskDeviceRepository.getByPublicAccessToken(deviceToken);
        var location = loadPublicKioskLocation(kioskDevice);
        var requestedAuthMethod = stringValue(payload, "auth_method", "method_type");
        var authMethod = attendanceAccessService.normalizePublicKioskAuthMethod(requestedAuthMethod.isBlank() ? "pin" : requestedAuthMethod);
        var credentialPayload = nullable(stringValue(payload, "credential_payload", "credential", "pin", "badge_code"));
        if (credentialPayload == null || credentialPayload.isBlank()) {
            throw new IllegalArgumentException("credential_payload is required.");
        }

        attendanceKioskPinThrottleService.ensureAttemptAllowed(kioskDevice);
        var resolvedMethod = attendanceAccessService.resolvePublicKioskAccessMethod(kioskDevice.companyId(), authMethod, credentialPayload);
        if (resolvedMethod == null) {
            attendanceKioskPinThrottleService.recordFailure(kioskDevice);
            throw new IllegalArgumentException("Credential validation failed.");
        }
        attendanceKioskPinThrottleService.clearFailures(kioskDevice);

        var user = attendanceUserLookupService.loadAttendanceUser(kioskDevice.companyId(), resolvedMethod.userCompanyId());
        if ("terminated".equals(user.status())) {
            throw new IllegalArgumentException("This user is terminated and cannot record attendance.");
        }
        validatePublicKioskScope(kioskDevice, user);

        var eventTimestamp = parseDateTime(payload, "event_timestamp", "recorded_at");
        if (eventTimestamp == null) {
            eventTimestamp = LocalDateTime.now();
        }

        var authAttemptMetadata = mergeMetadataJson(
            toJson(payload.get("metadata")),
            Map.of(
                "public_kiosk", true,
                "user_company_id", user.id(),
                "event_kind", "auth_attempt"
            )
        );
        var authAttemptId = appendAttendanceEvent(
            kioskDevice.companyId(),
            user.id(),
            "auth_attempt",
            eventTimestamp,
            eventTimestamp.toLocalDate(),
            location == null ? null : location.id(),
            kioskDevice.id(),
            location == null ? null : location.latitude(),
            location == null ? null : location.longitude(),
            null,
            "kiosk_public",
            authMethod,
            "success",
            "auth_attempt",
            authAttemptMetadata,
            null,
            null,
            0L
        );

        var expiresAtEpochSeconds = attendanceKioskTokenService.nextIdentificationExpiryEpochSeconds();
        var activityDate = resolveOperationalAttendanceDate(kioskDevice.companyId(), user.id(), eventTimestamp, "check_out");
        var scheduleRule = loadScheduleRule(kioskDevice.companyId(), user.id(), activityDate);
        var dailyRecord = attendanceDailyRecordRepository.loadDailyRecord(kioskDevice.companyId(), user.id(), activityDate);
        var openDailyRecord = attendanceDailyRecordRepository.loadOpenDailyRecord(kioskDevice.companyId(), user.id(), eventTimestamp.toLocalDate());
        if (openDailyRecord != null) {
            activityDate = openDailyRecord.attendanceDate();
            scheduleRule = loadScheduleRule(kioskDevice.companyId(), user.id(), activityDate);
            dailyRecord = openDailyRecord;
        }
        var body = new LinkedHashMap<String, Object>();
        body.put("auth_attempt_event_id", authAttemptId);
        body.put("auth_method", authMethod);
        body.put("user", Map.of(
            "id", user.id(),
            "user_code", user.userCode(),
            "full_name", user.fullName(),
            "position_title", user.positionTitle(),
            "department", user.department()
        ));
        body.put(
            "identification_token",
            attendanceKioskTokenService.createIdentificationToken(deviceToken, user.id(), authMethod, expiresAtEpochSeconds)
        );
        body.put("expires_at", Instant.ofEpochSecond(expiresAtEpochSeconds).toString());
        body.put("today_activity", toPublicKioskDayActivity(activityDate, dailyRecord, scheduleRule));
        return body;
    }
}
