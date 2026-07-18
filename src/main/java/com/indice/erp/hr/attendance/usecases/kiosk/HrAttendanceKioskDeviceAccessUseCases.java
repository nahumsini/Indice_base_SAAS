package com.indice.erp.hr.attendance.usecases.kiosk;

import com.indice.erp.hr.attendance.usecases.control.HrAttendanceControlOverviewUseCase;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import java.time.LocalDate;
import java.util.Map;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import org.springframework.transaction.annotation.Transactional;


public abstract class HrAttendanceKioskDeviceAccessUseCases extends HrAttendanceControlOverviewUseCase {

    protected HrAttendanceKioskDeviceAccessUseCases(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    public Map<String, Object> scheduleCandidates(
        long companyId,
        LocalDate startDate,
        LocalDate endDate,
        int page,
        int size,
        String search,
        Long unitId,
        Long businessId,
        boolean availableOnly
    ) {
        return attendanceScheduleCandidateService.scheduleCandidates(
            companyId,
            startDate,
            endDate,
            page,
            size,
            search,
            unitId,
            businessId,
            availableOnly
        );
    }

    public Map<String, Object> listKioskDevices(long companyId) {
        return attendanceKioskDeviceService.listDevices(companyId);
    }

    @Transactional
    public void deleteKioskDevice(long companyId, long kioskDeviceId) {
        attendanceKioskDeviceService.deleteDevice(companyId, kioskDeviceId);
    }

    @Transactional
    public void deleteKioskDevice(long companyId, long actorId, long kioskDeviceId) {
        attendanceKioskDeviceService.deleteDevice(companyId, actorId, kioskDeviceId);
    }

    @Transactional
    public Map<String, Object> saveKioskDevice(long companyId, long userId, Long kioskDeviceId, Map<String, Object> payload) {
        return attendanceKioskDeviceService.saveDevice(companyId, userId, kioskDeviceId, payload);
    }

    @Transactional
    public Map<String, Object> rotateKioskPublicAccessToken(long companyId, long kioskDeviceId) {
        return attendanceKioskDeviceService.rotatePublicAccessToken(companyId, kioskDeviceId);
    }

    @Transactional
    public Map<String, Object> rotateKioskPublicAccessToken(long companyId, long actorId, long kioskDeviceId) {
        return attendanceKioskDeviceService.rotatePublicAccessToken(companyId, actorId, kioskDeviceId);
    }

    @Transactional
    public Map<String, Object> transitionKioskDevice(
            long companyId,
            long actorId,
            long kioskDeviceId,
            KioskDefinitionStatus status,
            String reason) {
        return attendanceKioskDeviceService.transitionDevice(
            companyId, actorId, kioskDeviceId, status, reason);
    }

    public Map<String, Object> listAccessProfiles(long companyId) {
        return attendanceAccessService.listAccessProfiles(companyId);
    }

    @Transactional
    public Map<String, Object> saveAccessProfile(long companyId, long userId, Long profileId, Map<String, Object> payload) {
        return attendanceAccessService.saveAccessProfile(companyId, userId, profileId, payload);
    }

    public Map<String, Object> listAccessMethods(long companyId) {
        return attendanceAccessService.listAccessMethods(companyId);
    }

    @Transactional
    public Map<String, Object> saveAccessMethod(long companyId, Long methodId, Map<String, Object> payload) {
        return attendanceAccessService.saveAccessMethod(companyId, methodId, payload);
    }

    @Transactional
    public void ensureDefaultAccessProfile(long companyId, long userCompanyId, long createdBy) {
        attendanceAccessService.ensureDefaultAccessProfile(companyId, userCompanyId, createdBy);
    }
}
