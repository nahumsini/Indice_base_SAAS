package com.indice.erp.hr.assistant;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public final class HrAssistantAttendanceContracts {
    private HrAssistantAttendanceContracts() { }
    public record DayRule(int dayOfWeek, String startTime, String endTime, int mealMinutes, int restMinutes,
            int lateAfterMinutes, boolean restDay) { }
    public record ScheduleChange(String name, String status, String mode, boolean enforceLocation, Long locationId, List<DayRule> days) { }
    public record ScheduleView(long id, String name, String status, String mode, boolean enforceLocation,
            Long locationId, String locationName, int assignedCount, List<DayRule> days) { }
    public record LocationChange(String name, BigDecimal latitude, BigDecimal longitude, int radiusMeters,
            LocalDate contractStartDate, LocalDate contractEndDate, String requiredStartTime, String requiredEndTime,
            BigDecimal requiredHoursPerDay, int requiredDaysPerWeek, Long unitId, Long businessId, String status) { }
    public record LocationView(long id, String name, Long unitId, String unitName, Long businessId, String businessName,
            String contractStartDate, String contractEndDate, BigDecimal latitude, BigDecimal longitude, int radiusMeters,
            BigDecimal requiredHoursPerDay, String requiredStartTime, String requiredEndTime, int requiredDaysPerWeek,
            String status, int assignedCount) { }
    public record AssignmentChange(Long templateId, Long locationId, List<Long> userCompanyIds,
            LocalDate startDate, LocalDate endDate) { }
    public record CorrectionChange(long userCompanyId, List<LocalDate> dates, String status, String notes) { }
    public record AllowedLocationsChange(long userCompanyId, List<Long> locationIds) { }
    public record ManualEventChange(long userCompanyId, LocalDate date, String kind, LocalDateTime timestamp, String notes) { }
    public record RestAssignment(long userCompanyId,List<LocalDate> dates) { }
    public record RestPlan(List<RestAssignment> assignments,String notes) { }
    public record Change(ScheduleChange schedule, LocationChange location, AssignmentChange assignment,
            CorrectionChange correction, AllowedLocationsChange allowedLocations, ManualEventChange manualEvent,RestPlan restPlan) {
        public Change(ScheduleChange schedule,LocationChange location,AssignmentChange assignment,CorrectionChange correction,AllowedLocationsChange allowedLocations,ManualEventChange manualEvent){this(schedule,location,assignment,correction,allowedLocations,manualEvent,null);}
    }
    public record Event(long id,String type,LocalDateTime timestamp,LocalDate date,String resultStatus,String kind,String notes,Long supersedesEventId) { }
    public record AssignmentView(long userCompanyId, String employeeName, Long templateId, String templateName,
            Long locationId, String locationName, String startDate, String endDate, String status) { }
    public record DayView(long userCompanyId, String employeeName, LocalDate date, String systemStatus,
            String correctedStatus, String effectiveStatus, boolean editable, String lockReason,
            String firstCheckInAt, String lastCheckOutAt, int minutesLate, String notes, ScheduleView schedule,
            LocationView workSite) { }
    public record Calendar(long userCompanyId, String employeeName, String month, List<DayView> items) { }
    public record MemberState(long userCompanyId, String employeeName, String status, List<Long> allowedLocationIds,
            List<AssignmentView> assignments) { }
    public record Candidate(long userCompanyId, String employeeName, String position, String department, String status,
            Long unitId, String unitName, Long businessId, String businessName, boolean available, String busyReason) { }
    public record Result(List<ScheduleView> schedules, List<LocationView> locations, List<DayView> days,
            List<MemberState> members, List<AssignmentView> assignments) { }
}
