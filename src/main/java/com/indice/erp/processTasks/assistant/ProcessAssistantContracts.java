package com.indice.erp.processTasks.assistant;

import java.time.LocalDate;
import java.util.List;
import com.indice.erp.processTasks.processes.ProcessRunContracts.*;

/** Closed delegated workflow contract; authority is always resolved by domain owners. */
public final class ProcessAssistantContracts {
    private ProcessAssistantContracts() { }
    public record PageRequest(String query, String status, Long unitId, Long businessId, Integer page, Integer limit, String cursor) { }
    public record Page<T>(List<T> items, int count, long totalCount, boolean hasMore, Integer nextPage, String nextCursor) { }
    public record ProjectChange(String name, String description, String status, String priority, Long ownerUserCompanyId,
        String ownerName, Long unitId, Long businessId, LocalDate startDate, LocalDate dueDate) { }
    public record ProjectView(long id, String folio, ProjectChange configuration, String unitName, String businessName,
        int taskCount, int openTaskCount, int completedTaskCount, int overdueTaskCount, int auditedTaskCount,
        int completionPercent, String updatedAt) { }
    public record Recurrence(String weeklyDay, List<String> biWeeklyDays, LocalDate biWeeklyAnchorDate,
        List<Integer> monthlyDays, List<LocalDate> specificDates) { }
    public record Template(String title, String description, String notes, String priority, Long unitId, Long businessId,
        int stage, int scheduledOffsetDays, int deadlineOffsetDays, boolean evidenceRequired, List<Long> assigneeUserCompanyIds) { }
    public record ProcessChange(String title, String description, String frequency, String priority, Long unitId, Long businessId,
        Long responsibleUserCompanyId, Long coordinatorUserCompanyId, String distributionMode, String activationMode,
        String organizationMode, boolean includeWeekends, boolean isActive, LocalDate startDate, LocalDate endDate,
        int graceDays, int generationWindowDays, boolean evidenceRequired, Recurrence recurrence, List<Template> taskTemplates) { }
    public record ProcessView(long id, String folio, int currentVersion, ProcessChange configuration, String unitName,
        String businessName, String coordinatorName, String responsibleName, int taskCount, String updatedAt) { }
    public record RunChange(String reference, LocalDate startDate, String notes, boolean allowDuplicateReference) { }
    public record Change(Long id, ProjectChange project, ProcessChange process, RunChange run) { }
    public record PlannedTask(int position, Template template, LocalDate scheduledDate, LocalDate dueDate, List<String> assignees) { }
    public record PlannedRun(LocalDate startDate, List<PlannedTask> tasks) { }
    public record Result(ProjectView project, ProcessView process, ProcessRunView run, OccasionalPreviewResponse occasionalPlan,
        List<PlannedRun> recurringPlans, boolean archived) {
        public static Result empty() { return new Result(null,null,null,null,List.of(),false); }
    }
    public record Prepared(String action, Change change, String version, Result before, Result after) { }
    public record Collaborator(long userCompanyId, String name, Long unitId, String unitName, Long businessId, String businessName) { }
    public record VersionView(long processId, int version, String title, String description, String distributionMode,
        String activationMode, String organizationMode, boolean includeWeekends, Long coordinatorUserCompanyId,
        String frequency, Recurrence recurrence, LocalDate startDate, LocalDate endDate, List<Template> templates) { }
}
