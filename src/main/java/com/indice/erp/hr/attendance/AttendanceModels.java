package com.indice.erp.hr.attendance;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

record AttendanceEmployee(
    long id,
    String employeeNumber,
    String fullName,
    String positionTitle,
    String department,
    LocalDate hireDate,
    String status,
    Long unitId,
    String unitName,
    Long businessId,
    String businessName
) {
}

record EmailMatchedAttendanceEmployee(
    AttendanceEmployee employee,
    Long linkedUserId
) {
}

record AttendanceSessionUser(
    long userId,
    String email,
    String fullName
) {
}

record AttendanceNameParts(
    String firstName,
    String lastName
) {
}

record AttendanceEmployeeNumberSequence(
    String prefix,
    int padding,
    long nextNumber
) {
}

record ScheduleRule(
    long employeeId,
    long templateId,
    String scheduleMode,
    boolean blockAfterGracePeriod,
    boolean enforceLocation,
    Long locationId,
    String locationName,
    LocalTime startTime,
    LocalTime endTime,
    int mealMinutes,
    int restMinutes,
    int lateAfterMinutes,
    boolean isRestDay
) {
}

record ScheduleWindow(
    long templateId,
    LocalDate effectiveStartDate,
    LocalDate effectiveEndDate,
    String scheduleMode,
    boolean blockAfterGracePeriod,
    boolean enforceLocation,
    Long locationId,
    String locationName,
    int dayOfWeek,
    LocalTime startTime,
    LocalTime endTime,
    int mealMinutes,
    int restMinutes,
    int lateAfterMinutes,
    boolean isRestDay
) {
}

record CurrentScheduleAssignment(
    long employeeId,
    long templateId,
    String templateName,
    LocalDate effectiveStartDate,
    LocalDate effectiveEndDate
) {
}

record ScheduleTemplateJoinRow(
    long templateId,
    String templateName,
    String templateStatus,
    String scheduleMode,
    boolean blockAfterGracePeriod,
    boolean enforceLocation,
    Long locationId,
    String locationName,
    Integer dayOfWeek,
    LocalTime startTime,
    LocalTime endTime,
    Integer mealMinutes,
    Integer restMinutes,
    Integer lateAfterMinutes,
    Boolean isRestDay
) {
}

record ScheduleTemplateAccumulator(
    long templateId,
    String templateName,
    String templateStatus,
    String scheduleMode,
    boolean blockAfterGracePeriod,
    boolean enforceLocation,
    Long locationId,
    String locationName,
    List<ScheduleTemplateDayDefinition> days
) {
}

record ScheduleTemplateDefinition(
    long templateId,
    String templateName,
    String status,
    String scheduleMode,
    boolean blockAfterGracePeriod,
    boolean enforceLocation,
    Long locationId,
    String locationName,
    List<ScheduleTemplateDayDefinition> days
) {
}

record ScheduleTemplateDayDefinition(
    int dayOfWeek,
    LocalTime startTime,
    LocalTime endTime,
    int mealMinutes,
    int restMinutes,
    int lateAfterMinutes,
    boolean isRestDay
) {
}

record LocationRow(
    long id,
    Long unitId,
    String unitName,
    Long businessId,
    String businessName,
    LocalDate contractStartDate,
    LocalDate contractEndDate,
    String name,
    BigDecimal latitude,
    BigDecimal longitude,
    int radiusMeters,
    BigDecimal requiredHoursPerDay,
    LocalTime requiredStartTime,
    LocalTime requiredEndTime,
    Integer requiredDaysPerWeek,
    String managedSource,
    String status,
    int assignedEmployeeCount,
    String assignedEmployeeNames
) {
    LocationRow(
        long id,
        Long unitId,
        String unitName,
        Long businessId,
        String businessName,
        LocalDate contractStartDate,
        LocalDate contractEndDate,
        String name,
        BigDecimal latitude,
        BigDecimal longitude,
        int radiusMeters,
        BigDecimal requiredHoursPerDay,
        LocalTime requiredStartTime,
        LocalTime requiredEndTime,
        Integer requiredDaysPerWeek,
        String status,
        int assignedEmployeeCount,
        String assignedEmployeeNames
    ) {
        this(
            id,
            unitId,
            unitName,
            businessId,
            businessName,
            contractStartDate,
            contractEndDate,
            name,
            latitude,
            longitude,
            radiusMeters,
            requiredHoursPerDay,
            requiredStartTime,
            requiredEndTime,
            requiredDaysPerWeek,
            "",
            status,
            assignedEmployeeCount,
            assignedEmployeeNames
        );
    }
}

record WorkSiteAssignmentRow(
    long id,
    long employeeId,
    LocationRow location,
    LocalDate effectiveStartDate,
    LocalDate effectiveEndDate,
    String status
) {
}

record ExistingAssignmentRow(
    long id,
    long assignmentTargetId,
    LocalDate effectiveStartDate,
    LocalDate effectiveEndDate
) {
}

record KioskDeviceRow(
    long id,
    long companyId,
    Long unitId,
    String unitName,
    Long businessId,
    String businessName,
    Long locationId,
    String locationName,
    String code,
    String name,
    String status,
    String publicAccessToken,
    String metadataJson
) {
}

record PinThrottleState(
    int failedAttempts,
    Instant lockedUntil
) {
    boolean isLocked(Instant now) {
        return lockedUntil != null && lockedUntil.isAfter(now);
    }
}

record AccessProfileRow(
    long id,
    long companyId,
    long employeeId,
    String status,
    String defaultMethod,
    LocalDateTime lastEnrolledAt,
    String metadataJson,
    String employeeNumber,
    String employeeName,
    List<AccessMethodRow> methods
) {
}

record AccessMethodRow(
    long id,
    long companyId,
    long accessProfileId,
    String methodType,
    String credentialRef,
    String secretHash,
    String status,
    int priority,
    String metadataJson,
    long employeeId,
    String employeeNumber,
    String employeeName
) {
}

record ControlActivityRow(
    long id,
    long employeeId,
    String employeeNumber,
    String employeeName,
    Long kioskDeviceId,
    String kioskDeviceName,
    Long locationId,
    String locationName,
    String eventType,
    String eventKind,
    String authMethod,
    String resultStatus,
    LocalDateTime eventTimestamp,
    String notes,
    String metadataJson
) {
}

record ScopeBusinessRow(
    long id,
    Long unitId
) {
}

record AttendanceEventRow(
    long id,
    String eventType,
    LocalDateTime eventTimestamp,
    LocalDate attendanceDate,
    Long locationId,
    Long kioskDeviceId,
    String authMethod,
    String resultStatus,
    String eventKind,
    String notes,
    String metadataJson,
    Long supersedesEventId
) {
}

record AutoCheckoutCandidate(
    long companyId,
    long employeeId,
    LocalDate attendanceDate,
    LocalDateTime firstCheckInAt,
    Long firstLocationId
) {
}

record AttendanceOperationalState(
    boolean checkedIn,
    boolean onBreak
) {
}

record PublicKioskIdentificationToken(
    long employeeId,
    String authMethod,
    long expiresAtEpochSeconds
) {
}

record PublicKioskContext(
    KioskDeviceRow kioskDevice,
    AttendanceEmployee employee,
    PublicKioskIdentificationToken tokenClaims
) {
}

record DailyRecordRow(
    long id,
    long employeeId,
    LocalDate attendanceDate,
    String systemStatus,
    String correctedStatus,
    LocalDateTime firstCheckInAt,
    LocalDateTime lastCheckOutAt,
    int minutesLate,
    String notes,
    String firstPhotoObjectKey,
    String lastPhotoObjectKey,
    LocationRow firstLocation,
    LocationRow lastLocation
) {
}

record EffectiveDailyRecord(
    String effectiveStatus,
    LocalDateTime firstCheckInAt,
    LocalDateTime lastCheckOutAt
) {
}
