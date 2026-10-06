package com.indice.erp.processTasks.tasks;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Bounded task-owner contract for assistant previews and optimistic, partial edits. */
@Service
public class ProcessTaskAssistantService {
    private final ProcessTaskAssignmentCatalogService catalog;
    private final ProcessTaskAssignmentScopeService scopes;
    private final ProcessTasksService tasks;
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public ProcessTaskAssistantService(ProcessTaskAssignmentCatalogService catalog,
            ProcessTaskAssignmentScopeService scopes, ProcessTasksService tasks, JdbcTemplate jdbc, ObjectMapper mapper) {
        this.catalog = catalog;
        this.scopes = scopes;
        this.tasks = tasks;
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    public Assignment creationAssignment(long companyId, long actorId, long assigneeId) {
        var person = person(companyId, actorId, assigneeId);
        var scope = scopes.userCompanyScope(companyId, assigneeId);
        scopes.requireCanAssign(companyId, actorId, scope.unitId(), scope.businessId(), assigneeId);
        return new Assignment(assigneeId, person.name(), scope.unitId(),
            scope.unitId() == null ? null : person.unitName(), scope.businessId(),
            scope.businessId() == null ? null : person.businessName());
    }

    public Assignment assignmentForTask(long companyId, long actorId, long assigneeId, Long unitId, Long businessId) {
        var person = person(companyId, actorId, assigneeId);
        scopes.requireCanAssign(companyId, actorId, unitId, businessId, assigneeId);
        return new Assignment(assigneeId, person.name(), unitId, null, businessId, null);
    }

    /** Resolve a requested destination, never interpreting identifiers as authority. */
    public Assignment organizationAssignment(long companyId, long actorId, Long assigneeId,
            Long unitId, Long businessId, Long taskId) {
        requireActor(companyId, actorId);
        var target = scopes.targetScope(companyId, unitId, businessId);
        var unitNames = target.unitId() == null ? List.<String>of() : jdbc.queryForList(
            "SELECT name FROM units WHERE id = ? AND company_id = ? AND LOWER(status) IN ('active','activo')",
            String.class, target.unitId(), companyId);
        if (target.unitId() != null && unitNames.isEmpty()) throw new NoSuchElementException("Unit not found.");
        var businessNames = target.businessId() == null ? List.<String>of() : jdbc.queryForList(
            "SELECT name FROM businesses WHERE id = ? AND company_id = ? AND LOWER(status) IN ('active','activo')",
            String.class, target.businessId(), companyId);
        if (target.businessId() != null && businessNames.isEmpty()) throw new NoSuchElementException("Business not found.");
        scopes.requireCanAssign(companyId, actorId, target.unitId(), target.businessId(), assigneeId);
        if (taskId != null) {
            var current = snapshot(companyId, actorId, taskId).task();
            var team = current.get("assigneeUserCompanyIds");
            if (team instanceof List<?> ids) for (var id : ids) {
                var member = number(id);
                if (member != null && !Objects.equals(member, number(current.get("assignedUserCompanyId"))))
                    scopes.requireCanReceive(companyId, target.unitId(), target.businessId(), member);
            }
            var projectId = number(current.get("projectId"));
            if (projectId != null) {
                var projects = jdbc.queryForList("SELECT unit_id,business_id FROM projects WHERE company_id = ? AND id = ? AND deleted_at IS NULL", companyId, projectId);
                if (projects.isEmpty()) throw new NoSuchElementException("Project not found.");
                var project = projects.getFirst();
                if (number(project.get("unit_id")) != null && !Objects.equals(number(project.get("unit_id")), target.unitId())
                        || number(project.get("business_id")) != null && !Objects.equals(number(project.get("business_id")), target.businessId()))
                    throw new IllegalArgumentException("Task destination conflicts with its project.");
            }
        }
        var name = assigneeId == null ? "Sin responsable" : person(companyId, actorId, assigneeId).name();
        return new Assignment(assigneeId == null ? 0 : assigneeId, name, target.unitId(),
            unitNames.isEmpty() ? null : unitNames.getFirst(), target.businessId(), businessNames.isEmpty() ? null : businessNames.getFirst());
    }

    private ProcessTaskAssignmentOption person(long companyId, long actorId, long assigneeId) {
        if (assigneeId <= 0) throw new IllegalArgumentException("Invalid task assignee.");
        return assignees(companyId, actorId).stream()
            .filter(item -> item.userCompanyId() == assigneeId).findFirst()
            .orElseThrow(() -> new NoSuchElementException("Task assignee not found in the authorized scope."));
    }

    public List<ProcessTaskAssignmentOption> assignees(long companyId, long actorId) {
        requireActor(companyId, actorId);
        return catalog.list(companyId, actorId).items();
    }

    public List<OrganizationOption> organization(long companyId, long actorId) {
        requireActor(companyId, actorId);
        var scope = scopes.actorScope(companyId, actorId);
        var result = new java.util.ArrayList<OrganizationOption>();
        var units = jdbc.queryForList("SELECT id,name FROM units WHERE company_id = ? AND LOWER(status) IN ('active','activo') ORDER BY name,id", companyId);
        for (var unit : units) {
            var id = number(unit.get("id"));
            if (scope.level() == ProcessTaskAssignmentScopeService.ScopeLevel.CORPORATE || Objects.equals(scope.unitId(), id))
                result.add(new OrganizationOption("UNIT", id,
                    String.valueOf(unit.get("name")), id, String.valueOf(unit.get("name")), "active"));
        }
        var businesses = jdbc.queryForList("SELECT b.id,b.name,b.unit_id,u.name AS unit_name FROM businesses b JOIN units u ON u.id=b.unit_id AND u.company_id=b.company_id WHERE b.company_id=? AND LOWER(b.status) IN ('active','activo') AND LOWER(u.status) IN ('active','activo') ORDER BY b.name,b.id", companyId);
        for (var business : businesses) {
            var id = number(business.get("id")); var unitId = number(business.get("unit_id"));
            if (scope.level() == ProcessTaskAssignmentScopeService.ScopeLevel.CORPORATE
                    || scope.level() == ProcessTaskAssignmentScopeService.ScopeLevel.UNIT && Objects.equals(scope.unitId(), unitId)
                    || scope.level() == ProcessTaskAssignmentScopeService.ScopeLevel.BUSINESS && Objects.equals(scope.businessId(), id))
                result.add(new OrganizationOption("BUSINESS", id,
                    String.valueOf(business.get("name")), unitId, String.valueOf(business.get("unit_name")), "active"));
        }
        return List.copyOf(result);
    }

    private void requireActor(long companyId, long actorId) {
        var scope = scopes.actorScope(companyId, actorId);
        if (scope == null || scope.userCompanyId() == null) throw new SecurityException("Active task membership required.");
    }

    public Snapshot snapshot(long companyId, long actorId, long taskId) {
        if (taskId <= 0) throw new IllegalArgumentException("Invalid task identifier.");
        requireActor(companyId, actorId);
        scopes.requireTaskAccess(companyId, actorId, taskId);
        var task = tasks.getTask(companyId, taskId);
        return new Snapshot(task, version(task));
    }

    public TeamReview reviewTeam(long companyId, long actorId, Map<String, Object> task, List<Long> requested) {
        var current = new java.util.ArrayList<TeamMember>();
        if (task.get("assignees") instanceof List<?> rows) for (var item : rows) {
            if (item instanceof Map<?, ?> row && number(row.get("userCompanyId")) != null)
                current.add(new TeamMember(number(row.get("userCompanyId")), Objects.toString(row.get("name"), "")));
        }
        var next = requested.stream().map(id -> new TeamMember(id, person(companyId, actorId, id).name())).toList();
        var oldIds = current.stream().map(TeamMember::userCompanyId).toList();
        var nextIds = next.stream().map(TeamMember::userCompanyId).toList();
        return new TeamReview(List.copyOf(current), next, next.stream().filter(person -> !oldIds.contains(person.userCompanyId())).toList(),
            current.stream().filter(person -> !nextIds.contains(person.userCompanyId())).toList());
    }

    public ProcessTaskOperation prepareOperation(long companyId, long actorId, long taskId, ProcessTaskOperation op) {
        if (op == null) throw new IllegalArgumentException("Task operation is required.");
        var row = snapshot(companyId, actorId, taskId).task();
        if (op.notes() != null && op.notes().length() > 2000) throw new IllegalArgumentException("Notes exceed 2000 characters.");
        switch (op.action()) {
            case "schedule_task" -> {
                if (op.agendaDate() == null && (op.startTime() != null || op.endTime() != null || op.timeZone() != null))
                    throw new IllegalArgumentException("Agenda date is required with time fields.");
                if (op.startTime() != null && op.endTime() != null && op.endTime().isBefore(op.startTime()))
                    throw new IllegalArgumentException("End time precedes start time.");
                if (op.timeZone() != null) {
                    try { java.time.ZoneId.of(op.timeZone()); }
                    catch (java.time.DateTimeException exception) { throw new IllegalArgumentException("Invalid agenda time zone."); }
                }
            }
            case "add_task_follow_up" -> {
                if (op.comment() == null || op.comment().isBlank() || op.comment().length() > 2000 || op.followUpDate() == null)
                    throw new IllegalArgumentException("Follow-up requires a comment and a date.");
                if (op.entryType() != null && !java.util.Set.of("update", "decision", "blocker", "reminder").contains(op.entryType()))
                    throw new IllegalArgumentException("Invalid follow-up type.");
            }
            case "update_task_contribution" -> {
                if (!java.util.Set.of("pending", "working", "ready").contains(op.contributionStatus() == null ? "" : op.contributionStatus()))
                    throw new IllegalArgumentException("Invalid contribution status.");
                var memberId = scopes.actorScope(companyId, actorId).userCompanyId();
                if (!(row.get("assigneeUserCompanyIds") instanceof List<?> ids) || ids.stream().noneMatch(id -> Objects.equals(number(id), memberId)))
                    throw new SecurityException("Only assigned collaborators can change their contribution.");
            }
            case "share_task" -> {
                var team = op.collaboratorUserCompanyIds();
                if (team == null || team.isEmpty() || team.size() > 25 || team.stream().distinct().count() != team.size()
                        || !team.contains(number(row.get("assignedUserCompanyId"))))
                    throw new IllegalArgumentException("The complete team must include the current lead and at most 25 unique members.");
                for (var member : team) assignmentForTask(companyId, actorId, member, number(row.get("unitId")), number(row.get("businessId")));
            }
            case "complete_task" -> {
                if (op.completionPercent() != null && (op.completionPercent() < 0 || op.completionPercent() > 100))
                    throw new IllegalArgumentException("Completion must be between 0 and 100.");
                tasks.validateCompletion(companyId, actorId, taskId);
            }
            case "audit_task" -> {
                if (!"completed".equals(row.get("status")) || op.weighting() == null || op.weighting() < 0 || op.weighting() > 5)
                    throw new IllegalArgumentException("Audit requires a completed task and a score between 0 and 5.");
            }
            case "cancel_task" -> { }
            case "update_task_dependency" -> tasks.validateAssistantDependency(companyId,actorId,taskId,op.predecessorTaskId(),op.lagDays());
            default -> throw new IllegalArgumentException("Unsupported task operation.");
        }
        return op;
    }

    @Transactional
    public Map<String, Object> executeOperation(long companyId, long actorId, long taskId, String expectedVersion, ProcessTaskOperation op) {
        var ids = jdbc.queryForList("SELECT id FROM process_tasks WHERE company_id=? AND id=? AND deleted_at IS NULL FOR UPDATE", Long.class, companyId, taskId);
        if (ids.isEmpty()) throw new NoSuchElementException("Task not found.");
        if (!Objects.equals(expectedVersion, snapshot(companyId, actorId, taskId).version())) throw new TaskChangedException();
        prepareOperation(companyId, actorId, taskId, op);
        var payload = new LinkedHashMap<String, Object>();
        switch (op.action()) {
            case "schedule_task" -> {
                payload.put("agendaDate", op.agendaDate()); payload.put("agendaStartTime", op.startTime());
                payload.put("agendaEndTime", op.endTime()); payload.put("agendaTimeZone", op.timeZone());
                return tasks.updateAgendaPlacement(companyId, actorId, taskId, payload);
            }
            case "add_task_follow_up" -> {
                payload.put("comment", op.comment()); payload.put("followUpDate", op.followUpDate());
                if (op.entryType() != null) payload.put("entryType", op.entryType());
                tasks.createTaskFollowUp(companyId, actorId, taskId, payload);
                return tasks.getTask(companyId, taskId);
            }
            case "update_task_contribution" -> {
                payload.put("status", op.contributionStatus()); payload.put("note", op.notes());
                return tasks.updateCurrentUserContribution(companyId, actorId, taskId, payload);
            }
            case "share_task" -> {
                payload.put("assigneeUserCompanyIds", op.collaboratorUserCompanyIds());
                return tasks.patchTask(companyId, actorId, taskId, payload);
            }
            case "complete_task" -> {
                payload.put("completionNotes", op.notes()); payload.put("completionPercent", op.completionPercent());
                return tasks.completeTask(companyId, actorId, taskId, payload);
            }
            case "audit_task" -> {
                payload.put("auditNotes", op.notes()); payload.put("weighting", op.weighting());
                return tasks.auditTask(companyId, actorId, taskId, payload);
            }
            case "cancel_task" -> { return tasks.cancelTask(companyId, actorId, taskId); }
            case "update_task_dependency" -> {
                payload.put("predecessorTaskId",op.predecessorTaskId());payload.put("lagDays",op.lagDays());
                return tasks.updateTaskDependencies(companyId,actorId,taskId,payload);
            }
            default -> throw new IllegalArgumentException("Unsupported task operation.");
        }
    }

    @Transactional
    public Map<String, Object> patchConfirmed(long companyId, long actorId, long taskId,
            String expectedVersion, Map<String, Object> patch) {
        if (patch == null || patch.isEmpty() || !java.util.Set.of("title", "description", "priority", "status",
                "dueDate", "assignedUserCompanyId", "unitId", "businessId").containsAll(patch.keySet())) {
            throw new IllegalArgumentException("Unsupported task changes.");
        }
        var ids = jdbc.queryForList("SELECT id FROM process_tasks WHERE company_id = ? AND id = ? "
            + "AND deleted_at IS NULL FOR UPDATE", Long.class, companyId, taskId);
        if (ids.isEmpty()) throw new NoSuchElementException("Task not found.");
        var current = snapshot(companyId, actorId, taskId);
        if (!Objects.equals(expectedVersion, current.version())) {
            throw new TaskChangedException();
        }
        var changes = new LinkedHashMap<>(patch);
        if (changes.containsKey("unitId") || changes.containsKey("businessId")) {
            organizationAssignment(companyId, actorId,
                changes.containsKey("assignedUserCompanyId") ? number(changes.get("assignedUserCompanyId")) : number(current.task().get("assignedUserCompanyId")),
                changes.containsKey("unitId") ? number(changes.get("unitId")) : number(current.task().get("unitId")),
                changes.containsKey("businessId") ? number(changes.get("businessId")) : number(current.task().get("businessId")), taskId);
        }
        if (changes.containsKey("assignedUserCompanyId")) {
            var target = ((Number) changes.get("assignedUserCompanyId")).longValue();
            assignmentForTask(companyId, actorId, target,
                changes.containsKey("unitId") ? number(changes.get("unitId")) : number(current.task().get("unitId")),
                changes.containsKey("businessId") ? number(changes.get("businessId")) : number(current.task().get("businessId")));
            // Replace the lead, preserving other collaborators instead of dropping the team.
            var oldLead = number(current.task().get("assignedUserCompanyId"));
            var rawTeam = current.task().get("assigneeUserCompanyIds");
            var team = rawTeam instanceof List<?> list ? list : List.of();
            var nextTeam = new java.util.LinkedHashSet<Long>();
            nextTeam.add(target);
            team.stream().map(ProcessTaskAssistantService::number).filter(Objects::nonNull)
                .filter(id -> !Objects.equals(id, oldLead)).forEach(nextTeam::add);
            changes.put("assigneeUserCompanyIds", List.copyOf(nextTeam));
        }
        return tasks.patchTask(companyId, actorId, taskId, changes);
    }

    private String version(Map<String, Object> task) {
        // Includes the mutation fields and team, but excludes changing KPI/follow-up aggregates.
        var state = new LinkedHashMap<String, Object>();
        for (var field : List.of("id", "title", "description", "priority", "status", "dueDate", "startDate",
                "assignedUserCompanyId", "assigneeUserCompanyIds", "unitId", "businessId", "projectId", "processId",
                "notes", "completionPercent", "weighting", "audited", "auditNotes", "updatedAt",
                "agendaDate", "agendaStartTime", "agendaEndTime", "agendaTimeZone", "assignees",
                "evidenceRequired", "completionPolicy", "completedAt", "cancelledAt", "predecessorTaskId", "dependencyType", "dependencyLagDays")) {
            state.put(field, task.get(field));
        }
        try {
            var json = mapper.writer().with(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS).writeValueAsString(state);
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(json.getBytes(StandardCharsets.UTF_8)));
        } catch (JsonProcessingException | NoSuchAlgorithmException exception) {
            throw new IllegalStateException("Task version could not be calculated.", exception);
        }
    }

    private static Long number(Object value) { return value instanceof Number n ? n.longValue() : null; }
    public record Assignment(long userCompanyId, String name, Long unitId, String unitName,
        Long businessId, String businessName) { }
    public record OrganizationOption(String referenceType, long id, String name, Long unitId,
        String unitName, String status) { }
    public record Snapshot(Map<String, Object> task, String version) { }
    public record TeamMember(long userCompanyId, String name) { }
    public record TeamReview(List<TeamMember> before, List<TeamMember> after, List<TeamMember> added, List<TeamMember> removed) { }
    public static final class TaskChangedException extends RuntimeException {
        public TaskChangedException() { super("The task changed after the preview. Prepare it again."); }
    }
}
