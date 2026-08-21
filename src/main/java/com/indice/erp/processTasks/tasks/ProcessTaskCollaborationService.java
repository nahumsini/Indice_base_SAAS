package com.indice.erp.processTasks.tasks;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProcessTaskCollaborationService {

    private static final int MAX_TEAM_SIZE = 25;
    private static final List<String> CONTRIBUTION_STATUSES = List.of("pending", "working", "ready");

    private final JdbcTemplate jdbcTemplate;
    private final ProcessTaskAssignmentScopeService assignmentScopeService;

    public ProcessTaskCollaborationService(
            JdbcTemplate jdbcTemplate,
            ProcessTaskAssignmentScopeService assignmentScopeService) {
        this.jdbcTemplate = jdbcTemplate;
        this.assignmentScopeService = assignmentScopeService;
    }

    public List<Long> assigneeIds(Map<String, Object> payload, Long leadUserCompanyId) {
        var assigneeIds = new LinkedHashSet<Long>();
        if (leadUserCompanyId != null) {
            assigneeIds.add(leadUserCompanyId);
        }

        if (payload != null && payload.containsKey("assigneeUserCompanyIds")) {
            addAssigneeValues(assigneeIds, payload.get("assigneeUserCompanyIds"));
        }

        if (assigneeIds.size() > MAX_TEAM_SIZE) {
            throw new IllegalArgumentException("A task team cannot contain more than " + MAX_TEAM_SIZE + " people.");
        }

        return List.copyOf(assigneeIds);
    }

    @Transactional
    public void syncAssignments(
            long companyId,
            long actorUserId,
            long taskId,
            Long leadUserCompanyId,
            List<Long> assigneeIds,
            Long unitId,
            Long businessId) {
        var normalizedIds = new LinkedHashSet<Long>();
        if (leadUserCompanyId != null) {
            normalizedIds.add(leadUserCompanyId);
        }
        if (assigneeIds != null) {
            normalizedIds.addAll(assigneeIds);
        }
        if (normalizedIds.size() > MAX_TEAM_SIZE) {
            throw new IllegalArgumentException("A task team cannot contain more than " + MAX_TEAM_SIZE + " people.");
        }

        normalizedIds.forEach(userCompanyId -> assignmentScopeService.requireCanAssign(
                companyId,
                actorUserId,
                unitId,
                businessId,
                userCompanyId));

        var actorUserCompanyId = userCompanyIdForUser(companyId, actorUserId);
        var existing = jdbcTemplate.query(
                """
                    SELECT user_company_id, assignment_role, contribution_status, removed_at
                    FROM process_task_assignees
                    WHERE company_id = ? AND task_id = ?
                    """,
                (rs, rowNum) -> new ExistingAssignment(
                        rs.getLong("user_company_id"),
                        rs.getString("assignment_role"),
                        rs.getString("contribution_status"),
                        rs.getTimestamp("removed_at") != null),
                companyId,
                taskId);
        var existingByUserCompany = new LinkedHashMap<Long, ExistingAssignment>();
        existing.forEach(assignment -> existingByUserCompany.put(assignment.userCompanyId(), assignment));

        existing.stream()
                .filter(assignment -> !assignment.removed() && !normalizedIds.contains(assignment.userCompanyId()))
                .forEach(assignment -> {
                    jdbcTemplate.update(
                            """
                                UPDATE process_task_assignees
                                SET removed_at = CURRENT_TIMESTAMP,
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE company_id = ? AND task_id = ? AND user_company_id = ? AND removed_at IS NULL
                                """,
                            companyId,
                            taskId,
                            assignment.userCompanyId());
                    recordEvent(companyId, taskId, "assignee_removed", actorUserCompanyId, assignment.userCompanyId(), null);
                });

        normalizedIds.forEach(userCompanyId -> {
            var role = userCompanyId.equals(leadUserCompanyId) ? "lead" : "collaborator";
            var previous = existingByUserCompany.get(userCompanyId);
            if (previous == null) {
                jdbcTemplate.update(
                        """
                            INSERT INTO process_task_assignees
                            (company_id, task_id, user_company_id, assignment_role, contribution_status,
                             required_for_completion, assigned_by_user_company_id)
                            VALUES (?, ?, ?, ?, 'pending', 1, ?)
                            """,
                        companyId,
                        taskId,
                        userCompanyId,
                        role,
                        actorUserCompanyId);
                recordEvent(companyId, taskId, "assignee_added", actorUserCompanyId, userCompanyId, role);
                return;
            }

            jdbcTemplate.update(
                    """
                        UPDATE process_task_assignees
                        SET assignment_role = ?,
                            contribution_status = CASE WHEN removed_at IS NULL THEN contribution_status ELSE 'pending' END,
                            ready_at = CASE WHEN removed_at IS NULL THEN ready_at ELSE NULL END,
                            assigned_by_user_company_id = CASE WHEN removed_at IS NULL THEN assigned_by_user_company_id ELSE ? END,
                            assigned_at = CASE WHEN removed_at IS NULL THEN assigned_at ELSE CURRENT_TIMESTAMP END,
                            removed_at = NULL,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE company_id = ? AND task_id = ? AND user_company_id = ?
                        """,
                    role,
                    actorUserCompanyId,
                    companyId,
                    taskId,
                    userCompanyId);
            if (previous.removed()) {
                recordEvent(companyId, taskId, "assignee_added", actorUserCompanyId, userCompanyId, role);
            } else if (!role.equals(previous.role())) {
                recordEvent(companyId, taskId, "assignee_role_changed", actorUserCompanyId, userCompanyId, role);
            }
        });
    }

    public void enrichTasks(long companyId, Long viewerUserId, List<Map<String, Object>> tasks) {
        if (tasks == null || tasks.isEmpty()) {
            return;
        }

        var taskIds = tasks.stream()
                .map(task -> number(task.get("id")))
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();
        if (taskIds.isEmpty()) {
            return;
        }

        var placeholders = String.join(",", Collections.nCopies(taskIds.size(), "?"));
        var params = new ArrayList<Object>();
        params.add(companyId);
        params.addAll(taskIds);
        var rows = jdbcTemplate.query(
                """
                    SELECT assignment.task_id,
                           assignment.user_company_id,
                           user_company.user_id,
                           COALESCE(NULLIF(TRIM(user_account.full_name), ''), NULLIF(TRIM(user_account.email), ''), CONCAT('User #', assignment.user_company_id)) AS resolved_name,
                           user_account.email,
                           assignment.assignment_role,
                           assignment.contribution_status,
                           assignment.required_for_completion,
                           assignment.assigned_at,
                           assignment.ready_at
                    FROM process_task_assignees assignment
                    JOIN user_companies user_company
                      ON user_company.id = assignment.user_company_id
                     AND user_company.company_id = assignment.company_id
                    JOIN users user_account ON user_account.id = user_company.user_id
                    WHERE assignment.company_id = ?
                      AND assignment.task_id IN (%s)
                      AND assignment.removed_at IS NULL
                    ORDER BY assignment.task_id,
                             CASE WHEN assignment.assignment_role = 'lead' THEN 0 ELSE 1 END,
                             assignment.id
                    """.formatted(placeholders),
                (rs, rowNum) -> {
                    var member = new LinkedHashMap<String, Object>();
                    member.put("userCompanyId", rs.getLong("user_company_id"));
                    member.put("userId", rs.getLong("user_id"));
                    member.put("name", rs.getString("resolved_name"));
                    member.put("email", rs.getString("email"));
                    member.put("role", rs.getString("assignment_role"));
                    member.put("contributionStatus", rs.getString("contribution_status"));
                    member.put("requiredForCompletion", rs.getBoolean("required_for_completion"));
                    member.put("assignedAt", toDateTimeString(rs.getTimestamp("assigned_at")));
                    member.put("readyAt", toDateTimeString(rs.getTimestamp("ready_at")));
                    member.put("isCurrentUser", viewerUserId != null && viewerUserId.equals(rs.getLong("user_id")));
                    return new AssignmentRow(rs.getLong("task_id"), member);
                },
                params.toArray());

        var membersByTask = new LinkedHashMap<Long, List<Map<String, Object>>>();
        rows.forEach(row -> membersByTask.computeIfAbsent(row.taskId(), ignored -> new ArrayList<>()).add(row.member()));

        tasks.forEach(task -> {
            var taskId = number(task.get("id"));
            var members = new ArrayList<>(membersByTask.getOrDefault(taskId, List.of()));
            if (members.isEmpty() && number(task.get("assignedUserCompanyId")) != null) {
                var fallbackMember = new LinkedHashMap<String, Object>();
                fallbackMember.put("userCompanyId", number(task.get("assignedUserCompanyId")));
                fallbackMember.put("userId", number(task.get("assignedUserId")));
                fallbackMember.put("name", task.get("assignedName"));
                fallbackMember.put("email", null);
                fallbackMember.put("role", "lead");
                fallbackMember.put("contributionStatus", "pending");
                fallbackMember.put("requiredForCompletion", true);
                fallbackMember.put("assignedAt", task.get("createdAt"));
                fallbackMember.put("readyAt", null);
                fallbackMember.put("isCurrentUser", viewerUserId != null && viewerUserId.equals(number(task.get("assignedUserId"))));
                members.add(fallbackMember);
            }

            var readyCount = members.stream()
                    .filter(member -> "ready".equals(member.get("contributionStatus")))
                    .count();
            var currentUserStatus = members.stream()
                    .filter(member -> Boolean.TRUE.equals(member.get("isCurrentUser")))
                    .map(member -> member.get("contributionStatus"))
                    .findFirst()
                    .orElse(null);
            task.put("assignees", members);
            task.put("assigneeUserCompanyIds", members.stream().map(member -> member.get("userCompanyId")).toList());
            task.put("assignmentMode", members.size() > 1 ? "team" : "individual");
            task.put("completionPolicy", members.size() > 1 ? "all_assignees" : "lead");
            task.put("teamSize", members.size());
            task.put("teamReadyCount", readyCount);
            task.put("teamAllReady", !members.isEmpty() && readyCount == members.size());
            task.put("currentUserContributionStatus", currentUserStatus);
            task.put("isAssignedToCurrentUser", currentUserStatus != null);
        });
    }

    @Transactional
    public Map<String, Object> updateCurrentUserContribution(
            long companyId,
            long actorUserId,
            long taskId,
            String requestedStatus,
            String note) {
        assignmentScopeService.requireTaskAccess(companyId, actorUserId, taskId);
        var status = requestedStatus == null ? "" : requestedStatus.trim().toLowerCase();
        if (!CONTRIBUTION_STATUSES.contains(status)) {
            throw new IllegalArgumentException("Contribution status must be pending, working, or ready.");
        }
        var actorUserCompanyId = userCompanyIdForUser(companyId, actorUserId);
        if (actorUserCompanyId == null) {
            throw new NoSuchElementException("Current collaborator was not found.");
        }

        var updated = jdbcTemplate.update(
                """
                    UPDATE process_task_assignees
                    SET contribution_status = ?,
                        ready_at = CASE WHEN ? = 'ready' THEN CURRENT_TIMESTAMP ELSE NULL END,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE company_id = ?
                      AND task_id = ?
                      AND user_company_id = ?
                      AND removed_at IS NULL
                    """,
                status,
                status,
                companyId,
                taskId,
                actorUserCompanyId);
        if (updated == 0) {
            throw new IllegalArgumentException("Only assigned team members can update their contribution.");
        }

        recordEvent(
                companyId,
                taskId,
                "ready".equals(status) ? "contribution_ready" : "contribution_" + status,
                actorUserCompanyId,
                actorUserCompanyId,
                normalizedDetail(note));

        var body = new LinkedHashMap<String, Object>();
        body.put("taskId", taskId);
        body.put("userCompanyId", actorUserCompanyId);
        body.put("contributionStatus", status);
        body.put("team", assignmentSummary(companyId, taskId));
        return body;
    }

    public void requireTeamReadyForCompletion(long companyId, long actorUserId, long taskId) {
        var assignments = activeAssignments(companyId, taskId);
        if (assignments.size() <= 1) {
            return;
        }

        var actorUserCompanyId = userCompanyIdForUser(companyId, actorUserId);
        var lead = assignments.stream().filter(assignment -> "lead".equals(assignment.role())).findFirst().orElse(null);
        if (lead == null || actorUserCompanyId == null || !actorUserCompanyId.equals(lead.userCompanyId())) {
            throw new IllegalArgumentException("Only the task coordinator can close a team task.");
        }

        var pendingMembers = assignments.stream()
                .filter(assignment -> !actorUserCompanyId.equals(assignment.userCompanyId()))
                .filter(assignment -> assignment.required() && !"ready".equals(assignment.status()))
                .count();
        if (pendingMembers > 0) {
            throw new IllegalArgumentException(
                    pendingMembers + " team member(s) must mark their contribution as ready before this task can close.");
        }

        jdbcTemplate.update(
                """
                    UPDATE process_task_assignees
                    SET contribution_status = 'ready', ready_at = COALESCE(ready_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
                    WHERE company_id = ? AND task_id = ? AND user_company_id = ? AND removed_at IS NULL
                    """,
                companyId,
                taskId,
                actorUserCompanyId);
    }

    public void resetContributions(long companyId, long taskId, Long actorUserCompanyId) {
        jdbcTemplate.update(
                """
                    UPDATE process_task_assignees
                    SET contribution_status = 'pending', ready_at = NULL, updated_at = CURRENT_TIMESTAMP
                    WHERE company_id = ? AND task_id = ? AND removed_at IS NULL
                    """,
                companyId,
                taskId);
        recordEvent(companyId, taskId, "task_reopened", actorUserCompanyId, null, null);
    }

    public void recordEvent(
            long companyId,
            long taskId,
            String eventType,
            Long actorUserCompanyId,
            Long subjectUserCompanyId,
            String detail) {
        jdbcTemplate.update(
                """
                    INSERT INTO process_task_events
                    (company_id, task_id, event_type, actor_user_company_id, subject_user_company_id, detail)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                companyId,
                taskId,
                eventType,
                actorUserCompanyId,
                subjectUserCompanyId,
                normalizedDetail(detail));
    }

    public Map<String, Object> listEvents(long companyId, long actorUserId, long taskId) {
        assignmentScopeService.requireTaskAccess(companyId, actorUserId, taskId);
        var rows = jdbcTemplate.query(
                """
                    SELECT event.id,
                           event.event_type,
                           event.actor_user_company_id,
                           COALESCE(NULLIF(TRIM(actor.full_name), ''), NULLIF(TRIM(actor.email), ''), 'Sistema') AS actor_name,
                           event.subject_user_company_id,
                           COALESCE(NULLIF(TRIM(subject.full_name), ''), NULLIF(TRIM(subject.email), ''), NULL) AS subject_name,
                           event.detail,
                           event.created_at
                    FROM process_task_events event
                    LEFT JOIN user_companies actor_company ON actor_company.id = event.actor_user_company_id
                    LEFT JOIN users actor ON actor.id = actor_company.user_id
                    LEFT JOIN user_companies subject_company ON subject_company.id = event.subject_user_company_id
                    LEFT JOIN users subject ON subject.id = subject_company.user_id
                    WHERE event.company_id = ? AND event.task_id = ?
                    ORDER BY event.created_at DESC, event.id DESC
                    LIMIT 200
                    """,
                (rs, rowNum) -> {
                    var row = new LinkedHashMap<String, Object>();
                    row.put("id", rs.getLong("id"));
                    row.put("eventType", rs.getString("event_type"));
                    row.put("actorUserCompanyId", rs.getObject("actor_user_company_id", Long.class));
                    row.put("actorName", rs.getString("actor_name"));
                    row.put("subjectUserCompanyId", rs.getObject("subject_user_company_id", Long.class));
                    row.put("subjectName", rs.getString("subject_name"));
                    row.put("detail", rs.getString("detail"));
                    row.put("createdAt", toDateTimeString(rs.getTimestamp("created_at")));
                    return row;
                },
                companyId,
                taskId);
        var body = new LinkedHashMap<String, Object>();
        body.put("items", rows);
        body.put("count", rows.size());
        return body;
    }

    public Long userCompanyIdForUser(long companyId, long userId) {
        var rows = jdbcTemplate.query(
                """
                    SELECT id
                    FROM user_companies
                    WHERE company_id = ? AND user_id = ?
                      AND LOWER(COALESCE(status, 'active')) IN ('active', 'activo')
                    ORDER BY id ASC
                    LIMIT 1
                    """,
                (rs, rowNum) -> rs.getLong("id"),
                companyId,
                userId);
        return rows.isEmpty() ? null : rows.getFirst();
    }

    public List<Long> activeAssigneeIds(long companyId, long taskId) {
        return activeAssignments(companyId, taskId).stream()
                .map(ActiveAssignment::userCompanyId)
                .toList();
    }

    private List<ActiveAssignment> activeAssignments(long companyId, long taskId) {
        return jdbcTemplate.query(
                """
                    SELECT user_company_id, assignment_role, contribution_status, required_for_completion
                    FROM process_task_assignees
                    WHERE company_id = ? AND task_id = ? AND removed_at IS NULL
                    ORDER BY CASE WHEN assignment_role = 'lead' THEN 0 ELSE 1 END, id
                    """,
                (rs, rowNum) -> new ActiveAssignment(
                        rs.getLong("user_company_id"),
                        rs.getString("assignment_role"),
                        rs.getString("contribution_status"),
                        rs.getBoolean("required_for_completion")),
                companyId,
                taskId);
    }

    private Map<String, Object> assignmentSummary(long companyId, long taskId) {
        var assignments = activeAssignments(companyId, taskId);
        var ready = assignments.stream().filter(assignment -> "ready".equals(assignment.status())).count();
        var summary = new LinkedHashMap<String, Object>();
        summary.put("size", assignments.size());
        summary.put("ready", ready);
        summary.put("allReady", !assignments.isEmpty() && ready == assignments.size());
        return summary;
    }

    private void addAssigneeValues(LinkedHashSet<Long> assigneeIds, Object rawValue) {
        if (rawValue == null) {
            return;
        }
        if (rawValue instanceof Collection<?> values) {
            values.forEach(value -> addAssigneeValue(assigneeIds, value));
            return;
        }
        if (rawValue instanceof String text && text.contains(",")) {
            for (String value : text.split(",")) {
                addAssigneeValue(assigneeIds, value);
            }
            return;
        }
        addAssigneeValue(assigneeIds, rawValue);
    }

    private void addAssigneeValue(LinkedHashSet<Long> assigneeIds, Object rawValue) {
        if (rawValue == null) {
            return;
        }
        try {
            var value = rawValue instanceof Number number
                    ? number.longValue()
                    : Long.parseLong(rawValue.toString().trim());
            if (value <= 0) {
                throw new NumberFormatException();
            }
            assigneeIds.add(value);
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("assigneeUserCompanyIds must contain valid positive integers.");
        }
    }

    private Long number(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value == null) {
            return null;
        }
        try {
            return Long.parseLong(value.toString());
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private String normalizedDetail(String detail) {
        if (detail == null || detail.trim().isEmpty()) {
            return null;
        }
        var normalized = detail.trim();
        return normalized.length() <= 500 ? normalized : normalized.substring(0, 500);
    }

    private String toDateTimeString(Timestamp value) {
        return value != null ? value.toLocalDateTime().toString() : null;
    }

    private record ExistingAssignment(long userCompanyId, String role, String status, boolean removed) {
    }

    private record ActiveAssignment(long userCompanyId, String role, String status, boolean required) {
    }

    private record AssignmentRow(long taskId, Map<String, Object> member) {
    }
}
