package com.indice.erp.hr.attendance.kiosk;

import com.indice.erp.hr.attendance.models.AttendanceHrUser;


public record PublicKioskContext(
    KioskDeviceRow kioskDevice,
    AttendanceHrUser user,
    PublicKioskIdentificationToken tokenClaims
) {
}
