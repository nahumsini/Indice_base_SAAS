package com.indice.erp.processTasks.processes;

import java.time.LocalDate;
import java.util.List;

public final class ProcessRunContracts {

    private ProcessRunContracts() {
    }

    public record OccasionalPreviewRequest(
            long processId,
            String reference,
            LocalDate startDate) {
    }

    public record OccasionalRunRequest(
            long processId,
            String reference,
            LocalDate startDate,
            String notes,
            boolean allowDuplicateReference) {
    }

    public record ProcessOption(
            long id,
            String folio,
            String title,
            String distributionMode,
            String organizationMode,
            int currentVersion,
            int taskCount) {
    }

    public record ProcessOptionsResponse(List<ProcessOption> items, int count) {
    }

    public record ProcessCollaborator(
            long userCompanyId,
            long userId,
            String name,
            Long unitId,
            String unitName,
            Long businessId,
            String businessName) {
    }

    public record ProcessCollaboratorsResponse(List<ProcessCollaborator> items, int count) {
    }

    public record PreviewTask(
            long templateId,
            int position,
            int stage,
            String title,
            String priority,
            LocalDate scheduledDate,
            LocalDate dueDate,
            boolean evidenceRequired,
            List<String> assignees) {
    }

    public record OccasionalPreviewResponse(
            long processId,
            int version,
            String reference,
            LocalDate startDate,
            boolean duplicateReference,
            int matchingRuns,
            List<PreviewTask> tasks) {
    }

    public record ProcessRunTask(
            long id,
            String folio,
            String title,
            String status,
            String priority,
            int stage,
            LocalDate scheduledDate,
            LocalDate dueDate,
            boolean evidenceRequired,
            int attachmentCount,
            List<String> assignees) {
    }

    public record ProcessRunView(
            long id,
            long processId,
            int version,
            String folio,
            String activationMode,
            String reference,
            String notes,
            LocalDate startDate,
            String coordinator,
            String status,
            boolean requiresAttention,
            boolean hasDelays,
            int completedTasks,
            int cancelledTasks,
            int totalTasks,
            String createdAt,
            String finalizedAt,
            List<ProcessRunTask> tasks) {
    }

    public record ProcessRunsResponse(List<ProcessRunView> items, int count) {
    }
}
