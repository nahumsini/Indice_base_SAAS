package com.indice.erp.hr.attendance.kiosk;

import com.indice.erp.hr.attendance.HrAttendanceService;
import com.indice.erp.kiosk.engine.KioskLifecycleHandler;
import com.indice.erp.kiosk.engine.KioskLifecycleTransition;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import java.util.Set;
import org.springframework.stereotype.Component;

/** Functional lifecycle authority for Human Resources attendance kiosks. */
@Component
public class AttendanceKioskLifecycleHandler implements KioskLifecycleHandler {

    private static final Set<String> KIOSK_TYPES = Set.of(
        AttendanceKioskType.BUSINESS_UNIT,
        AttendanceKioskType.CONTRACT_SITE,
        AttendanceKioskType.HEAD_OFFICE,
        AttendanceKioskType.OPEN_ATTENDANCE
    );
    private final HrAttendanceService attendance;

    public AttendanceKioskLifecycleHandler(HrAttendanceService attendance) {
        this.attendance = attendance;
    }

    @Override
    public boolean supports(KioskResolvedDefinition definition) {
        return AttendanceKioskCapabilities.OWNER_MODULE.equals(definition.ownerModule())
            && KIOSK_TYPES.contains(definition.kioskType());
    }

    @Override
    public void transition(KioskLifecycleTransition transition) {
        attendance.transitionKioskDevice(
            transition.companyId(), transition.actorId(), transition.legacyReferenceId(),
            transition.target(), transition.reason());
    }
}
