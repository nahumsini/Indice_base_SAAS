package com.indice.erp.processTasks.tasks;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

/** Closed task-owner input. Fields unrelated to the selected operation are rejected. */
public record ProcessTaskOperation(String action, LocalDate agendaDate, LocalTime startTime,
        LocalTime endTime, String timeZone, String comment, LocalDate followUpDate,
        String entryType, String contributionStatus, String notes, Integer completionPercent,
        Integer weighting, List<Long> collaboratorUserCompanyIds, Long predecessorTaskId, Integer lagDays) {
    public ProcessTaskOperation(String action,LocalDate agendaDate,LocalTime startTime,LocalTime endTime,String timeZone,String comment,LocalDate followUpDate,
            String entryType,String contributionStatus,String notes,Integer completionPercent,Integer weighting,List<Long> collaborators) {
        this(action,agendaDate,startTime,endTime,timeZone,comment,followUpDate,entryType,contributionStatus,notes,completionPercent,weighting,collaborators,null,null);
    }
    public static final Set<String> ACTIONS = Set.of("schedule_task", "add_task_follow_up",
        "update_task_contribution", "share_task", "complete_task", "audit_task", "cancel_task", "update_task_dependency");

    public ProcessTaskOperation {
        if (!ACTIONS.contains(action == null ? "" : action)) throw new IllegalArgumentException("Unsupported task operation.");
        collaboratorUserCompanyIds = collaboratorUserCompanyIds == null ? null : List.copyOf(collaboratorUserCompanyIds);
        var supplied = new java.util.HashSet<String>();
        if (agendaDate != null || startTime != null || endTime != null || timeZone != null) supplied.add("schedule");
        if (comment != null || followUpDate != null || entryType != null) supplied.add("followUp");
        if (contributionStatus != null) supplied.add("contribution");
        if (notes != null) supplied.add("notes");
        if (completionPercent != null) supplied.add("completion");
        if (weighting != null) supplied.add("audit");
        if (collaboratorUserCompanyIds != null) supplied.add("team");
        if (predecessorTaskId != null || lagDays != null) supplied.add("dependency");
        var allowed = switch (action) {
            case "schedule_task" -> Set.of("schedule");
            case "add_task_follow_up" -> Set.of("followUp");
            case "update_task_contribution" -> Set.of("contribution", "notes");
            case "share_task" -> Set.of("team");
            case "complete_task" -> Set.of("completion", "notes");
            case "audit_task" -> Set.of("audit", "notes");
            case "update_task_dependency" -> Set.of("dependency");
            default -> Set.<String>of();
        };
        if (!allowed.containsAll(supplied)) throw new IllegalArgumentException("Fields do not belong to this task operation.");
    }
}
