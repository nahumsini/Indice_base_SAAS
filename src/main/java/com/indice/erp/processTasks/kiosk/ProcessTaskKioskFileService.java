package com.indice.erp.processTasks.kiosk;

import com.indice.erp.processTasks.tasks.ProcessTasksService;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Module-side adoption boundary; technical policy is declared in the capability descriptor. */
@Service
class ProcessTaskKioskFileService {

    private final JdbcTemplate jdbcTemplate;
    private final ProcessTasksService processTasksService;
    private final ProcessTaskKioskQueryService queries;
    private final ProcessTaskKioskModuleAuditService audit;

    ProcessTaskKioskFileService(
            JdbcTemplate jdbcTemplate,
            ProcessTasksService processTasksService,
            ProcessTaskKioskQueryService queries,
            ProcessTaskKioskModuleAuditService audit) {
        this.jdbcTemplate = jdbcTemplate;
        this.processTasksService = processTasksService;
        this.queries = queries;
        this.audit = audit;
    }

    @Transactional
    Map<String, Object> presign(
            ProcessTaskPublicKioskContext context,
            long taskId,
            Map<String, Object> payload) {
        queries.completableTask(context.kiosk(), context.employee(), taskId);
        lockTaskAndRequireEvidenceCapacity(
            context.kiosk().companyId(), context.employee().userCompanyId(), taskId);
        return processTasksService.createAttachmentUpload(context.kiosk().companyId(), taskId, payload);
    }

    @Transactional
    Map<String, Object> register(
            ProcessTaskPublicKioskContext context,
            long taskId,
            Map<String, Object> payload) {
        queries.completableTask(context.kiosk(), context.employee(), taskId);
        // Serialize adoption against the task row. This prevents two concurrent
        // registrations from both observing the last available evidence slot.
        lockTaskAndRequireEvidenceCapacity(
            context.kiosk().companyId(), context.employee().userCompanyId(), taskId);
        var result = processTasksService.registerAttachment(
            context.kiosk().companyId(), context.employee().userId(), taskId, payload);
        audit.record(context, taskId, "TASK_EVIDENCE_ADOPTED", Map.of(
            "attachment_id", String.valueOf(result.getOrDefault("id", "")),
            "mime_type", String.valueOf(payload.getOrDefault("mime_type", "")),
            "size_bytes", payload.get("size_bytes") instanceof Number size ? size.longValue() : 0L
        ));
        return result;
    }

    private void lockTaskAndRequireEvidenceCapacity(long companyId, long employeeId, long taskId) {
        var task = jdbcTemplate.queryForList(
            "SELECT id FROM process_tasks WHERE company_id = ? AND id = ?"
                + " AND EXISTS (SELECT 1 FROM process_task_assignees assignment"
                + " WHERE assignment.company_id = process_tasks.company_id"
                + " AND assignment.task_id = process_tasks.id"
                + " AND assignment.user_company_id = ? AND assignment.removed_at IS NULL)"
                + " AND status IN ('pending', 'in_progress', 'paused') FOR UPDATE",
            Long.class, companyId, taskId, employeeId);
        if (task.isEmpty()) {
            throw new IllegalArgumentException("Task not found.");
        }
        var attachments = jdbcTemplate.queryForList(
            "SELECT id FROM process_task_attachments"
                + " WHERE company_id = ? AND task_id = ? AND deleted_at IS NULL FOR UPDATE",
            Long.class, companyId, taskId);
        if (attachments.size() >= 5) {
            throw new IllegalArgumentException("A task supports at most 5 kiosk evidence files.");
        }
    }
}
