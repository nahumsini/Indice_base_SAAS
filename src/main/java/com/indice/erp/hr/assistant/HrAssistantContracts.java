package com.indice.erp.hr.assistant;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Explicit delegated HR boundary; no role, company authority, credentials or private file keys. */
public final class HrAssistantContracts {
    private HrAssistantContracts() { }
    public record EmployeeChange(String firstName, String lastName, String email, String phone, String position,
        String department, Long unitId, Long businessId, LocalDate hireDate, BigDecimal salary, String payPeriod,
        String salaryType, BigDecimal hourlyRate, String contractType, LocalDate contractStartDate, LocalDate contractEndDate,
        String registrationCountry) {
        public EmployeeChange(String firstName,String lastName,String email,String phone,String position,String department,Long unitId,Long businessId,
                LocalDate hireDate,BigDecimal salary,String payPeriod,String salaryType,BigDecimal hourlyRate,String contractType,LocalDate contractStartDate,LocalDate contractEndDate) {
            this(firstName,lastName,email,phone,position,department,unitId,businessId,hireDate,salary,payPeriod,salaryType,hourlyRate,contractType,contractStartDate,contractEndDate,null);
        }
    }
    public record AssetChange(String assetCode, String assetType, String name, String model, String serialNumber,
        Long responsibleUserCompanyId, Long unitId, String status, LocalDateTime assignedAt,
        BigDecimal valueAmount, String valueCurrency, String notes) { }
    public record AnnouncementChange(String title, String type, String content, String audienceType,
        String status, LocalDateTime scheduledFor, List<Long> unitIds, List<Long> userCompanyIds, List<String> departmentNames) { }
    public record TerminationChange(LocalDate exitDate, LocalDate lastWorkingDay, String reasonType, String specificReason, String summary) { }
    public record AssetAssignment(Long responsibleUserCompanyId, Long unitId, String status, LocalDateTime effectiveAt, String notes, String changeReason) { }
    public record Witness(Long userCompanyId, String name) { }
    public record PermissionChange(String type,String payrollTreatment,LocalDate startDate,LocalDate endDate,Boolean halfDay,String reason,String reviewNotes) { }
    public record IncentiveChange(String name,String description,String type,BigDecimal amount,String currency,String status,
        LocalDate startDate,LocalDate endDate,String applicationMode,String scopeType,List<Long> employeeIds,List<Long> unitIds,List<Long> businessIds,String sourceReferenceType,String sourceReferenceId) { }
    public record IncentiveApplication(long userCompanyId,String employeeName,BigDecimal amount,String currency,BigDecimal exchangeRate,String status) { }
    public record IncentiveView(long id,String code,String name,String description,String type,BigDecimal amount,String currency,String status,
        String startDate,String endDate,String applicationMode,String scopeSummary,long eligibleCount,long appliedCount,List<IncentiveApplication> applications) { }
    public record PermissionView(long id,String folio,long userCompanyId,String employeeName,String type,String payrollTreatment,
        String startDate,String endDate,BigDecimal days,boolean halfDay,String status,String reason,String reviewNotes,String reviewedAt,String reviewedBy,
        List<DocumentView> attachments) { }
    public record RecordChange(long userCompanyId, String type, String severity, String status, String title, String description,
        String actionsTaken, LocalDateTime eventDate, List<Witness> witnesses) { }
    public record Change(Long id, EmployeeChange employee, List<EmployeeChange> employees,
        AssetChange asset, AnnouncementChange announcement, TerminationChange termination, AssetAssignment assignment, RecordChange record, PermissionChange permission, IncentiveChange incentive,
        HrAssistantAttendanceContracts.Change attendance, com.indice.erp.hr.payroll.HrPayrollAssistantContracts.Change payroll) {
        public Change(Long id,EmployeeChange employee,List<EmployeeChange> employees,AssetChange asset,AnnouncementChange announcement,TerminationChange termination,AssetAssignment assignment,RecordChange record,PermissionChange permission,IncentiveChange incentive,HrAssistantAttendanceContracts.Change attendance) { this(id,employee,employees,asset,announcement,termination,assignment,record,permission,incentive,attendance,null); }
        public Change(Long id,EmployeeChange employee,List<EmployeeChange> employees,AssetChange asset,AnnouncementChange announcement,TerminationChange termination,AssetAssignment assignment,RecordChange record,PermissionChange permission,IncentiveChange incentive) {
            this(id,employee,employees,asset,announcement,termination,assignment,record,permission,incentive,null);
        }
        public Change(Long id, EmployeeChange employee, List<EmployeeChange> employees, AssetChange asset, AnnouncementChange announcement) {
            this(id,employee,employees,asset,announcement,null,null,null,null,null);
        }
        public Change(Long id,EmployeeChange employee,List<EmployeeChange> employees,AssetChange asset,AnnouncementChange announcement,TerminationChange termination,AssetAssignment assignment,RecordChange record) {
            this(id,employee,employees,asset,announcement,termination,assignment,record,null,null);
        }
        public Change(Long id,EmployeeChange employee,List<EmployeeChange> employees,AssetChange asset,AnnouncementChange announcement,TerminationChange termination,AssetAssignment assignment,RecordChange record,PermissionChange permission) {
            this(id,employee,employees,asset,announcement,termination,assignment,record,permission,null);
        }
    }
    public record EmployeeView(long userCompanyId, String employeeCode, String name, String email, String phone,
        String position, String department, Long unitId, String unitName, Long businessId, String businessName,
        String status, String registrationCountry, String salaryCurrency, BigDecimal salary, String payPeriod, String salaryType, BigDecimal hourlyRate,
        LocalDate hireDate, String contractType, LocalDate contractStartDate, LocalDate contractEndDate, List<DocumentView> documents) { }
    public record DocumentView(long id, String type, String fileName, String mimeType, Long sizeBytes) { }
    public record AssetView(long id, String assetCode, String name, String assetType, String model, String serialNumber,
        Long unitId, String unitName, Long responsibleUserCompanyId, String responsibleName, String status,
        BigDecimal valueAmount, String valueCurrency, String notes, long photoCount) { }
    public record AnnouncementView(long id, String title, String type, String content, String audienceType, String audienceSummary,
        String status, String scheduledFor, long deliveryCount, long readCount, boolean read, long attachmentCount) { }
    public record AnnouncementReceipt(long userCompanyId,String employeeName,String status,String deliveredAt,String readAt) { }
    public record AssetHistoryEntry(long id,String type,String fromStatus,String toStatus,Long responsibleUserCompanyId,String responsibleName,
        Long unitId,String unitName,String startedAt,String endedAt,String reason,String notes,String actorName,String endedByName) { }
    public record Result(List<EmployeeView> employees, AssetView asset, AnnouncementView announcement, RecordView record, PermissionView permission, boolean withdrawn, IncentiveView incentive,
        HrAssistantAttendanceContracts.Result attendance, com.indice.erp.hr.payroll.HrPayrollAssistantContracts.Result payroll) {
        public Result(List<EmployeeView> employees,AssetView asset,AnnouncementView announcement,RecordView record,PermissionView permission,boolean withdrawn,IncentiveView incentive,HrAssistantAttendanceContracts.Result attendance) { this(employees,asset,announcement,record,permission,withdrawn,incentive,attendance,null); }
        public Result(List<EmployeeView> employees,AssetView asset,AnnouncementView announcement,RecordView record,PermissionView permission,boolean withdrawn,IncentiveView incentive) { this(employees,asset,announcement,record,permission,withdrawn,incentive,null); }
        public Result(List<EmployeeView> employees, AssetView asset, AnnouncementView announcement) { this(employees,asset,announcement,null,null,false,null); }
        public Result(List<EmployeeView> employees,AssetView asset,AnnouncementView announcement,RecordView record) { this(employees,asset,announcement,record,null,false,null); }
        public Result(List<EmployeeView> employees,AssetView asset,AnnouncementView announcement,RecordView record,PermissionView permission,boolean withdrawn) { this(employees,asset,announcement,record,permission,withdrawn,null); }
    }
    public record Prepared(String action, Change change, String expectedVersion, Result before, Result after) { }
    public record PageRequest(String query, String status, Long unitId, Long businessId, Integer page, Integer limit, String cursor) {
        public PageRequest(String query, String status, Long unitId, Long businessId, Integer page, Integer limit) {
            this(query, status, unitId, businessId, page, limit, null);
        }
    }
    public record OrganizationView(String referenceType, long id, String name, Long unitId, String unitName) { }
    public record AnnouncementAudienceView(String referenceType, Long id, String name, Long unitId, String unitName, long activeUserCount) { }
    public record RecordView(long id, String folio, long userCompanyId, String employeeName, Long unitId, String unitName,
        Long businessId, String businessName, String type, String severity, String status, String title, String description,
        String actionsTaken, String eventDate, List<DocumentView> attachments, List<RecordActivity> history, List<Witness> witnesses) {
        public RecordView(long id,String folio,long userCompanyId,String employeeName,Long unitId,String unitName,Long businessId,String businessName,
                String type,String severity,String status,String title,String description,String actionsTaken,String eventDate,List<DocumentView> attachments,List<RecordActivity> history) {
            this(id,folio,userCompanyId,employeeName,unitId,unitName,businessId,businessName,type,severity,status,title,description,actionsTaken,eventDate,attachments,history,List.of());
        }
    }
    public record RecordActivity(String type, String fromStatus, String toStatus, String note, String actorName, String date) { }
    public record Page<T>(List<T> items, int returnedCount, long totalCount, boolean hasMore, Integer nextPage, String nextCursor) { }
}
