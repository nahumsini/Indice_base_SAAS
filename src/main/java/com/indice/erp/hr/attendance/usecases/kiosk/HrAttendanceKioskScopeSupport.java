package com.indice.erp.hr.attendance.usecases.kiosk;

import com.indice.erp.hr.attendance.kiosk.AttendanceKioskType;
import com.indice.erp.hr.attendance.kiosk.KioskDeviceRow;
import com.indice.erp.hr.attendance.kiosk.PublicKioskContext;
import com.indice.erp.hr.attendance.models.AttendanceHrUser;
import com.indice.erp.hr.attendance.models.LocationRow;
import com.indice.erp.hr.attendance.usecases.locations.HrAttendanceLocationResolverSupport;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;

import static com.indice.erp.hr.shared.HrPayloadUtils.isBlank;
import static com.indice.erp.hr.shared.HrPayloadUtils.safe;
import static com.indice.erp.hr.shared.HrPayloadUtils.stringValue;


public abstract class HrAttendanceKioskScopeSupport extends HrAttendanceLocationResolverSupport {

    protected HrAttendanceKioskScopeSupport(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    protected String kioskTypeFromDevice(KioskDeviceRow kioskDevice) {
        return AttendanceKioskType.fromMetadata(parseJsonMap(kioskDevice.metadataJson()));
    }

    protected void validatePublicKioskScope(KioskDeviceRow kioskDevice, AttendanceHrUser user) {
        var kioskType = kioskTypeFromDevice(kioskDevice);
        if (!AttendanceKioskType.BUSINESS_UNIT.equals(kioskType)) {
            return;
        }

        if (kioskDevice.unitId() != null && !Objects.equals(kioskDevice.unitId(), user.unitId())) {
            throw new IllegalArgumentException("This kiosk is restricted to another unit.");
        }
        if (kioskDevice.businessId() != null && !Objects.equals(kioskDevice.businessId(), user.businessId())) {
            throw new IllegalArgumentException("This kiosk is restricted to another business.");
        }
    }

    protected Long publicKioskRequestedLocationId(KioskDeviceRow kioskDevice) {
        var kioskType = kioskTypeFromDevice(kioskDevice);
        if (AttendanceKioskType.BUSINESS_UNIT.equals(kioskType) || AttendanceKioskType.OPEN_ATTENDANCE.equals(kioskType)) {
            return null;
        }
        return requirePublicKioskLocation(kioskDevice).id();
    }

    protected String describeKioskScope(KioskDeviceRow kioskDevice, LocationRow location) {
        var kioskType = kioskTypeFromDevice(kioskDevice);
        if (AttendanceKioskType.OPEN_ATTENDANCE.equals(kioskType)) {
            return "All employees / location not enforced";
        }
        if (!AttendanceKioskType.BUSINESS_UNIT.equals(kioskType)) {
            return location == null ? "Kiosk location" : location.name();
        }
        if (kioskDevice.businessId() != null) {
            return safe(kioskDevice.businessName()).isBlank()
                ? "Business " + kioskDevice.businessId()
                : kioskDevice.businessName();
        }
        if (kioskDevice.unitId() != null) {
            var unitName = safe(kioskDevice.unitName()).isBlank() ? "Unit " + kioskDevice.unitId() : kioskDevice.unitName();
            return unitName + " / All businesses";
        }
        return "All units / all businesses";
    }

    protected PublicKioskContext requirePublicKioskIdentificationContext(String deviceToken, Map<String, Object> payload) {
        var kioskDevice = attendanceKioskDeviceRepository.getByPublicAccessToken(deviceToken);
        var identificationToken = stringValue(payload, "identification_token");
        var tokenClaims = attendanceKioskTokenService.verifyIdentificationToken(deviceToken, identificationToken);
        var user = attendanceUserLookupService.loadAttendanceUser(kioskDevice.companyId(), tokenClaims.userCompanyId());
        if ("terminated".equals(user.status())) {
            throw new IllegalArgumentException("This user is terminated and cannot record attendance.");
        }
        validatePublicKioskScope(kioskDevice, user);
        return new PublicKioskContext(kioskDevice, user, tokenClaims);
    }

    protected void ensureFaceVerificationSessionBelongsTo(long companyId, long userCompanyId, long sessionId) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM user_face_verification_sessions
                WHERE company_id = ?
                  AND user_company_id = ?
                  AND id = ?
                """,
            Integer.class,
            companyId,
            userCompanyId,
            sessionId
        );
        if (count == null || count == 0) {
            throw new NoSuchElementException("Face verification session not found.");
        }
    }
}
