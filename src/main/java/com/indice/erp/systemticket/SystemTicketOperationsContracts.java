package com.indice.erp.systemticket;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class SystemTicketOperationsContracts {

    private SystemTicketOperationsContracts() {
    }

    public record Filters(
        String query,
        String status,
        String type,
        String priority,
        String assignee,
        String module,
        String distributor,
        boolean overdue,
        Instant from,
        Instant to
    ) {
    }

    public record Workspace(
        Summary summary,
        List<Ticket> tickets,
        int matching_tickets,
        List<Assignee> assignees,
        List<String> modules,
        List<FilterOption> distributors
    ) {
    }

    public record Summary(
        int total,
        int active,
        int in_review,
        int planned,
        int completed,
        int unassigned,
        int critical,
        int overdue,
        int waiting_on_reporter,
        int resolved_today,
        Long average_first_response_minutes,
        Long average_resolution_minutes,
        Double sla_compliance_percent,
        int reopened
    ) {
    }

    public record Ticket(
        long id,
        String folio,
        long distributor_company_id,
        String distributor_name,
        long reported_by_user_id,
        String reporter_name,
        String reporter_email,
        Long assigned_to_user_id,
        String assignee_name,
        String assignee_email,
        String type,
        String priority,
        String module,
        String title,
        String description,
        String status,
        String root_response,
        Instant first_responded_at,
        Instant target_resolution_at,
        int reopened_count,
        boolean overdue,
        Long minutes_to_target,
        Instant resolved_at,
        Instant created_at,
        Instant updated_at
    ) {
    }

    public record Detail(Ticket ticket, List<Event> events, List<Attachment> attachments) {
    }

    public record Event(
        long id,
        String event_type,
        String visibility,
        String actor_name,
        String actor_email,
        String previous_status,
        String new_status,
        String note,
        Instant created_at
    ) {
    }

    public record Attachment(
        long id,
        String original_filename,
        String mime_type,
        long size_bytes,
        String download_url,
        String uploaded_by,
        Instant created_at
    ) {
    }

    public record Assignee(long user_id, String name, String email) {
    }

    public record FilterOption(String value, String label) {
    }

    public record UpdateRequest(
        String status,
        String priority,
        String root_response,
        Instant target_resolution_at
    ) {
    }

    public record AssignRequest(Long assigned_to_user_id) {
    }

    public record MessageRequest(String message, String visibility) {
    }

    public record PresignAttachmentRequest(String file_name, String content_type, long size_bytes) {
    }

    public record PresignAttachmentResponse(
        String object_key,
        String upload_url,
        Instant expires_at,
        Map<String, String> upload_headers
    ) {
    }

    public record RegisterAttachmentRequest(
        String object_key,
        String original_filename,
        String mime_type,
        long size_bytes
    ) {
    }
}
