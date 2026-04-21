package com.indice.erp.hr.assets;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HrAssetService {

    private static final Set<String> VALID_STATUSES = Set.of("available", "assigned", "maintenance", "custody", "inactive");
    private static final Set<String> ASSIGNABLE_STATUSES = Set.of("assigned", "custody");
    private static final Set<String> ACTIVE_EMPLOYEE_STATUSES = Set.of("active", "activo");
    private static final Set<String> ACTIVE_UNIT_STATUSES = Set.of("active", "activo");
    private static final Pattern ASSET_CODE_PATTERN = Pattern.compile("^[A-Z0-9][A-Z0-9._-]{1,79}$");
    private static final Pattern ASSET_TYPE_PATTERN = Pattern.compile("^[a-z0-9][a-z0-9 _-]{0,49}$");
    private static final DateTimeFormatter DATE_TIME_OUTPUT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter DATE_TIME_INPUT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;

    private final JdbcTemplate jdbcTemplate;

    public HrAssetService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> listAssets(long companyId, Map<String, Object> filters) {
        var page = parsePage(filters);
        var size = parseSize(filters);
        var query = buildListQuery(companyId, filters);
        var offset = (page - 1) * size;

        var rows = jdbcTemplate.query(
            """
                SELECT a.id,
                       a.asset_code,
                       a.asset_type,
                       a.name,
                       a.model,
                       a.serial_number,
                       a.responsible_employee_id,
                       e.first_name,
                       e.last_name,
                       e.email AS responsible_email,
                       a.unit_id,
                       u.name AS unit_name,
                       a.status,
                       a.assigned_at,
                       a.value_amount,
                       a.notes,
                       a.created_by_user_id,
                       created_by.full_name AS created_by_name,
                       a.updated_by_user_id,
                       updated_by.full_name AS updated_by_name,
                       a.created_at,
                       a.updated_at
                FROM hr_assets a
                LEFT JOIN hr_employees e ON e.id = a.responsible_employee_id
                LEFT JOIN units u ON u.id = a.unit_id
                LEFT JOIN users created_by ON created_by.id = a.created_by_user_id
                LEFT JOIN users updated_by ON updated_by.id = a.updated_by_user_id
                """
                + query.whereClause()
                + """
                    ORDER BY a.updated_at DESC, a.id DESC
                    LIMIT ? OFFSET ?
                    """,
            (rs, rowNum) -> mapAssetRow(
                rs.getLong("id"),
                rs.getString("asset_code"),
                rs.getString("asset_type"),
                rs.getString("name"),
                rs.getString("model"),
                rs.getString("serial_number"),
                nullableLong(rs.getObject("responsible_employee_id")),
                fullName(rs.getString("first_name"), rs.getString("last_name")),
                rs.getString("responsible_email"),
                nullableLong(rs.getObject("unit_id")),
                rs.getString("unit_name"),
                rs.getString("status"),
                asLocalDateTime(rs.getTimestamp("assigned_at")),
                rs.getBigDecimal("value_amount"),
                rs.getString("notes"),
                nullableLong(rs.getObject("created_by_user_id")),
                rs.getString("created_by_name"),
                nullableLong(rs.getObject("updated_by_user_id")),
                rs.getString("updated_by_name"),
                asLocalDateTime(rs.getTimestamp("created_at")),
                asLocalDateTime(rs.getTimestamp("updated_at"))
            ),
            withPaging(query.params(), size, offset)
        );

        var totalCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM hr_assets a " + query.whereClause(),
            Long.class,
            query.params().toArray()
        );

        var summary = jdbcTemplate.query(
            """
                SELECT COUNT(*) AS total_count,
                       SUM(CASE WHEN a.status = 'available' THEN 1 ELSE 0 END) AS available_count,
                       SUM(CASE WHEN a.status = 'assigned' THEN 1 ELSE 0 END) AS assigned_count,
                       SUM(CASE WHEN a.status = 'maintenance' THEN 1 ELSE 0 END) AS maintenance_count,
                       SUM(CASE WHEN a.status = 'custody' THEN 1 ELSE 0 END) AS custody_count,
                       SUM(CASE WHEN a.status = 'inactive' THEN 1 ELSE 0 END) AS inactive_count,
                       COALESCE(SUM(a.value_amount), 0) AS total_value_amount
                FROM hr_assets a
                """
                + query.whereClause(),
            (rs, rowNum) -> {
                var result = new LinkedHashMap<String, Object>();
                result.put("total_count", rs.getLong("total_count"));
                result.put("available_count", rs.getLong("available_count"));
                result.put("assigned_count", rs.getLong("assigned_count"));
                result.put("maintenance_count", rs.getLong("maintenance_count"));
                result.put("custody_count", rs.getLong("custody_count"));
                result.put("inactive_count", rs.getLong("inactive_count"));
                result.put("total_value_amount", rs.getBigDecimal("total_value_amount"));
                return result;
            },
            query.params().toArray()
        );

        var totalRows = totalCount == null ? 0L : totalCount;
        var totalPages = totalRows == 0 ? 0 : (int) Math.ceil((double) totalRows / size);

        var result = new LinkedHashMap<String, Object>();
        result.put("rows", rows);
        result.put("page", page);
        result.put("size", size);
        result.put("total_count", totalRows);
        result.put("total_pages", totalPages);
        result.put("summary", summary.isEmpty() ? defaultSummary() : summary.getFirst());
        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> assetDetails(long companyId, long assetId) {
        return Map.of(
            "asset_id",
            assetId,
            "asset",
            loadAssetDetail(companyId, assetId)
        );
    }

    @Transactional
    public Map<String, Object> createAsset(long companyId, long actorUserId, Map<String, Object> payload) {
        var draft = normalizeCreatePayload(companyId, payload);
        ensureUniqueAssetCode(companyId, draft.assetCode(), null);
        ensureUniqueSerialNumber(companyId, draft.serialNumber(), null);

        KeyHolder keyHolder = new GeneratedKeyHolder();
        try {
            jdbcTemplate.update(connection -> {
                var statement = connection.prepareStatement(
                    """
                        INSERT INTO hr_assets
                        (company_id, asset_code, asset_type, name, model, serial_number, responsible_employee_id, unit_id, status, assigned_at,
                         value_amount, notes, created_by_user_id, updated_by_user_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                    new String[] {"id"}
                );
                statement.setLong(1, companyId);
                statement.setString(2, draft.assetCode());
                statement.setString(3, draft.assetType());
                statement.setString(4, draft.name());
                statement.setString(5, nullable(draft.model()));
                statement.setString(6, nullable(draft.serialNumber()));
                setNullableLong(statement, 7, draft.responsibleEmployeeId());
                setNullableLong(statement, 8, draft.unitId());
                statement.setString(9, draft.status());
                setNullableDateTime(statement, 10, draft.assignedAt());
                setNullableBigDecimal(statement, 11, draft.valueAmount());
                statement.setString(12, nullable(draft.notes()));
                setNullableLong(statement, 13, actorUserId);
                setNullableLong(statement, 14, actorUserId);
                return statement;
            }, keyHolder);
        } catch (DataIntegrityViolationException ex) {
            throw new IllegalArgumentException("Asset code or serial number already exists for this company.");
        }

        var assetId = keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
        if (assetId <= 0) {
            throw new IllegalArgumentException("Unable to create asset.");
        }

        var changedAt = draft.assignedAt() != null ? draft.assignedAt() : LocalDateTime.now();
        insertStatusHistory(
            companyId,
            assetId,
            null,
            draft.status(),
            "created",
            null,
            actorUserId,
            changedAt
        );

        if (ASSIGNABLE_STATUSES.contains(draft.status())) {
            insertAssignmentHistory(
                companyId,
                assetId,
                draft.responsibleEmployeeId(),
                draft.unitId(),
                draft.status(),
                draft.assignedAt(),
                draft.assignmentNotes(),
                actorUserId
            );
        }

        return assetDetails(companyId, assetId);
    }

    @Transactional
    public Map<String, Object> updateAsset(long companyId, long actorUserId, long assetId, Map<String, Object> payload) {
        rejectLifecycleFields(payload);
        var current = requireAssetState(companyId, assetId);

        var assetCode = current.assetCode();
        if (hasAnyKey(payload, "asset_code", "assetCode", "id")) {
            assetCode = normalizeAssetCode(requiredString(payload, "asset_code", "assetCode", "id"));
        }

        var assetType = current.assetType();
        if (hasAnyKey(payload, "asset_type", "assetType")) {
            assetType = normalizeAssetType(requiredString(payload, "asset_type", "assetType"));
        }

        var name = current.name();
        if (hasAnyKey(payload, "name", "asset_name", "assetName")) {
            name = normalizeRequiredText(requiredString(payload, "name", "asset_name", "assetName"), "name", 160);
        }

        var model = current.model();
        if (hasAnyKey(payload, "model")) {
            model = normalizeOptionalText(stringValue(payload, "model"), "model", 160);
        }

        var serialNumber = current.serialNumber();
        if (hasAnyKey(payload, "serial_number", "serialNumber")) {
            serialNumber = normalizeOptionalText(stringValue(payload, "serial_number", "serialNumber"), "serial_number", 160);
        }

        var unitId = current.unitId();
        if (hasAnyKey(payload, "unit_id", "unitId", "unit")) {
            var requestedUnitId = resolveUnitId(companyId, payload);
            if (ASSIGNABLE_STATUSES.contains(current.status()) && !Objects.equals(requestedUnitId, current.unitId())) {
                throw new IllegalArgumentException("Assigned or custody assets must change unit through the reassign endpoint.");
            }
            unitId = requestedUnitId;
        }

        var valueAmount = current.valueAmount();
        if (hasAnyKey(payload, "value", "value_amount", "valueAmount")) {
            valueAmount = parseFlexibleBigDecimal(payload, "value", "value_amount", "valueAmount");
        }

        var notes = current.notes();
        if (hasAnyKey(payload, "notes")) {
            notes = normalizeOptionalText(stringValue(payload, "notes"), "notes", 4000);
        }

        ensureUniqueAssetCode(companyId, assetCode, assetId);
        ensureUniqueSerialNumber(companyId, serialNumber, assetId);

        var rowsUpdated = jdbcTemplate.update(
            """
                UPDATE hr_assets
                SET asset_code = ?,
                    asset_type = ?,
                    name = ?,
                    model = ?,
                    serial_number = ?,
                    unit_id = ?,
                    value_amount = ?,
                    notes = ?,
                    updated_by_user_id = ?
                WHERE id = ? AND company_id = ?
                """,
            assetCode,
            assetType,
            name,
            nullable(model),
            nullable(serialNumber),
            unitId,
            valueAmount,
            nullable(notes),
            actorUserId,
            assetId,
            companyId
        );

        if (rowsUpdated == 0) {
            throw new NoSuchElementException("Asset not found.");
        }

        return assetDetails(companyId, assetId);
    }

    @Transactional
    public Map<String, Object> reassignAsset(long companyId, long actorUserId, long assetId, Map<String, Object> payload) {
        prevalidateAssignmentStatus(payload, "assigned");
        var current = requireAssetState(companyId, assetId);
        var command = normalizeAssignmentCommand(companyId, payload, current.unitId(), "assigned");
        return applyAssignmentChange(companyId, actorUserId, current, command);
    }

    @Transactional
    public Map<String, Object> changeStatus(long companyId, long actorUserId, long assetId, Map<String, Object> payload) {
        var current = requireAssetState(companyId, assetId);
        var targetStatus = normalizeStatus(requiredString(payload, "status", "to_status", "toStatus"));

        if (ASSIGNABLE_STATUSES.contains(targetStatus)) {
            var command = normalizeAssignmentCommand(companyId, payload, current.unitId(), targetStatus);
            return applyAssignmentChange(companyId, actorUserId, current, command);
        }

        if (containsAnyKey(payload, "responsible_employee_id", "responsibleEmployeeId", "employee_id", "responsible", "responsible_name")) {
            throw new IllegalArgumentException("responsible_employee_id can only be set for assigned or custody assets.");
        }

        if (current.status().equals(targetStatus)) {
            throw new IllegalArgumentException("Asset is already in " + targetStatus + " status.");
        }

        var effectiveUnitId = hasAnyKey(payload, "unit_id", "unitId", "unit")
            ? resolveUnitId(companyId, payload)
            : current.unitId();
        var changedAt = parseDateTime(payload, "changed_at", "changedAt", "effective_at", "effectiveAt");
        if (changedAt == null) {
            changedAt = LocalDateTime.now();
        }
        var notes = normalizeOptionalText(stringValue(payload, "notes"), "notes", 4000);
        var changeReason = normalizeChangeReason(stringValue(payload, "change_reason", "changeReason"), defaultChangeReason(targetStatus));

        closeOpenAssignments(companyId, assetId, changedAt, actorUserId);

        var rowsUpdated = jdbcTemplate.update(
            """
                UPDATE hr_assets
                SET responsible_employee_id = NULL,
                    unit_id = ?,
                    status = ?,
                    assigned_at = NULL,
                    updated_by_user_id = ?
                WHERE id = ? AND company_id = ?
                """,
            effectiveUnitId,
            targetStatus,
            actorUserId,
            assetId,
            companyId
        );

        if (rowsUpdated == 0) {
            throw new NoSuchElementException("Asset not found.");
        }

        insertStatusHistory(
            companyId,
            assetId,
            current.status(),
            targetStatus,
            changeReason,
            notes,
            actorUserId,
            changedAt
        );

        return assetDetails(companyId, assetId);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> assetHistory(long companyId, long assetId) {
        var asset = loadAssetDetail(companyId, assetId);

        var assignmentHistory = jdbcTemplate.query(
            """
                SELECT h.id,
                       h.assignment_status,
                       h.responsible_employee_id,
                       e.first_name,
                       e.last_name,
                       e.email AS responsible_email,
                       h.unit_id,
                       u.name AS unit_name,
                       h.started_at,
                       h.ended_at,
                       h.notes,
                       h.created_by_user_id,
                       created_by.full_name AS created_by_name,
                       h.ended_by_user_id,
                       ended_by.full_name AS ended_by_name,
                       h.created_at,
                       h.updated_at
                FROM hr_asset_assignments h
                LEFT JOIN hr_employees e ON e.id = h.responsible_employee_id
                LEFT JOIN units u ON u.id = h.unit_id
                LEFT JOIN users created_by ON created_by.id = h.created_by_user_id
                LEFT JOIN users ended_by ON ended_by.id = h.ended_by_user_id
                WHERE h.company_id = ?
                  AND h.asset_id = ?
                ORDER BY h.started_at DESC, h.id DESC
                """,
            (rs, rowNum) -> {
                var item = new LinkedHashMap<String, Object>();
                item.put("id", rs.getLong("id"));
                item.put("assignment_status", safe(rs.getString("assignment_status")));
                item.put("responsible_employee_id", nullableLong(rs.getObject("responsible_employee_id")));
                item.put("responsible_name", fullName(rs.getString("first_name"), rs.getString("last_name")));
                item.put("responsible_email", safe(rs.getString("responsible_email")));
                item.put("unit_id", nullableLong(rs.getObject("unit_id")));
                item.put("unit_name", safe(rs.getString("unit_name")));
                item.put("started_at", formatDateTime(asLocalDateTime(rs.getTimestamp("started_at"))));
                item.put("ended_at", formatDateTime(asLocalDateTime(rs.getTimestamp("ended_at"))));
                item.put("notes", safe(rs.getString("notes")));
                item.put("created_by_user_id", nullableLong(rs.getObject("created_by_user_id")));
                item.put("created_by_name", safe(rs.getString("created_by_name")));
                item.put("ended_by_user_id", nullableLong(rs.getObject("ended_by_user_id")));
                item.put("ended_by_name", safe(rs.getString("ended_by_name")));
                item.put("created_at", formatDateTime(asLocalDateTime(rs.getTimestamp("created_at"))));
                item.put("updated_at", formatDateTime(asLocalDateTime(rs.getTimestamp("updated_at"))));
                return item;
            },
            companyId,
            assetId
        );

        var statusHistory = jdbcTemplate.query(
            """
                SELECT h.id,
                       h.from_status,
                       h.to_status,
                       h.change_reason,
                       h.notes,
                       h.changed_by_user_id,
                       changed_by.full_name AS changed_by_name,
                       h.changed_at,
                       h.created_at
                FROM hr_asset_status_history h
                LEFT JOIN users changed_by ON changed_by.id = h.changed_by_user_id
                WHERE h.company_id = ?
                  AND h.asset_id = ?
                ORDER BY h.changed_at DESC, h.id DESC
                """,
            (rs, rowNum) -> {
                var item = new LinkedHashMap<String, Object>();
                item.put("id", rs.getLong("id"));
                item.put("from_status", safe(rs.getString("from_status")));
                item.put("to_status", safe(rs.getString("to_status")));
                item.put("change_reason", safe(rs.getString("change_reason")));
                item.put("notes", safe(rs.getString("notes")));
                item.put("changed_by_user_id", nullableLong(rs.getObject("changed_by_user_id")));
                item.put("changed_by_name", safe(rs.getString("changed_by_name")));
                item.put("changed_at", formatDateTime(asLocalDateTime(rs.getTimestamp("changed_at"))));
                item.put("created_at", formatDateTime(asLocalDateTime(rs.getTimestamp("created_at"))));
                return item;
            },
            companyId,
            assetId
        );

        var timeline = new ArrayList<TimelineEntry>();
        for (var item : assignmentHistory) {
            timeline.add(new TimelineEntry(
                parseTimelineDate((String) item.get("started_at")),
                timelineAssignmentItem(item)
            ));
        }
        for (var item : statusHistory) {
            timeline.add(new TimelineEntry(
                parseTimelineDate((String) item.get("changed_at")),
                timelineStatusItem(item)
            ));
        }
        timeline.sort(Comparator.comparing(TimelineEntry::occurredAt).reversed());

        var result = new LinkedHashMap<String, Object>();
        result.put("asset", asset);
        result.put("assignment_history", assignmentHistory);
        result.put("status_history", statusHistory);
        result.put("timeline", timeline.stream().map(TimelineEntry::payload).toList());
        return result;
    }

    private Map<String, Object> applyAssignmentChange(
        long companyId,
        long actorUserId,
        AssetState current,
        AssignmentCommand command
    ) {
        if (Objects.equals(current.responsibleEmployeeId(), command.responsibleEmployeeId())
            && Objects.equals(current.unitId(), command.unitId())
            && current.status().equals(command.status())) {
            throw new IllegalArgumentException("Asset is already assigned to this responsible employee with the same status.");
        }

        closeOpenAssignments(companyId, current.id(), command.assignedAt(), actorUserId);

        var rowsUpdated = jdbcTemplate.update(
            """
                UPDATE hr_assets
                SET responsible_employee_id = ?,
                    unit_id = ?,
                    status = ?,
                    assigned_at = ?,
                    updated_by_user_id = ?
                WHERE id = ? AND company_id = ?
                """,
            command.responsibleEmployeeId(),
            command.unitId(),
            command.status(),
            Timestamp.valueOf(command.assignedAt()),
            actorUserId,
            current.id(),
            companyId
        );

        if (rowsUpdated == 0) {
            throw new NoSuchElementException("Asset not found.");
        }

        insertAssignmentHistory(
            companyId,
            current.id(),
            command.responsibleEmployeeId(),
            command.unitId(),
            command.status(),
            command.assignedAt(),
            command.notes(),
            actorUserId
        );

        if (!current.status().equals(command.status())) {
            insertStatusHistory(
                companyId,
                current.id(),
                current.status(),
                command.status(),
                command.changeReason(),
                command.notes(),
                actorUserId,
                command.assignedAt()
            );
        }

        return assetDetails(companyId, current.id());
    }

    private AssetCreatePayload normalizeCreatePayload(long companyId, Map<String, Object> payload) {
        var assetCode = normalizeAssetCode(requiredString(payload, "asset_code", "assetCode", "id"));
        var assetType = normalizeAssetType(requiredString(payload, "asset_type", "assetType"));
        var name = normalizeRequiredText(requiredString(payload, "name", "asset_name", "assetName"), "name", 160);
        var model = normalizeOptionalText(stringValue(payload, "model"), "model", 160);
        var serialNumber = normalizeOptionalText(stringValue(payload, "serial_number", "serialNumber"), "serial_number", 160);
        var responsibleEmployeeId = resolveEmployeeId(companyId, payload, false);
        var unitId = resolveUnitId(companyId, payload);
        var statusValue = stringValue(payload, "status", "state");
        var status = statusValue.isBlank()
            ? (responsibleEmployeeId != null ? "assigned" : "available")
            : normalizeStatus(statusValue);
        var assignedAt = parseDateTime(payload, "assigned_at", "assignedAt", "assigned_date", "assignedDate");
        var valueAmount = parseFlexibleBigDecimal(payload, "value", "value_amount", "valueAmount");
        var notes = normalizeOptionalText(stringValue(payload, "notes"), "notes", 4000);
        var assignmentNotes = normalizeOptionalText(
            stringValue(payload, "assignment_notes", "assignmentNotes"),
            "assignment_notes",
            4000
        );

        if (ASSIGNABLE_STATUSES.contains(status)) {
            if (responsibleEmployeeId == null) {
                throw new IllegalArgumentException("responsible_employee_id is required for assigned or custody assets.");
            }
            if (assignedAt == null) {
                assignedAt = LocalDateTime.now();
            }
        } else {
            if (responsibleEmployeeId != null) {
                throw new IllegalArgumentException("responsible_employee_id can only be set when the asset status is assigned or custody.");
            }
            if (assignedAt != null) {
                throw new IllegalArgumentException("assigned_at can only be set when the asset status is assigned or custody.");
            }
        }

        return new AssetCreatePayload(
            assetCode,
            assetType,
            name,
            model,
            serialNumber,
            responsibleEmployeeId,
            unitId,
            status,
            assignedAt,
            valueAmount,
            notes,
            assignmentNotes
        );
    }

    private AssignmentCommand normalizeAssignmentCommand(
        long companyId,
        Map<String, Object> payload,
        Long fallbackUnitId,
        String defaultStatus
    ) {
        var statusValue = stringValue(payload, "status", "assignment_status", "to_status", "toStatus");
        var status = statusValue.isBlank() ? defaultStatus : normalizeStatus(statusValue);
        if (!ASSIGNABLE_STATUSES.contains(status)) {
            throw new IllegalArgumentException("Reassign endpoint only supports assigned or custody status.");
        }

        var responsibleEmployeeId = resolveEmployeeId(companyId, payload, true);
        var unitId = hasAnyKey(payload, "unit_id", "unitId", "unit")
            ? resolveUnitId(companyId, payload)
            : fallbackUnitId;
        var assignedAt = parseDateTime(payload, "assigned_at", "assignedAt", "assigned_date", "assignedDate");
        if (assignedAt == null) {
            assignedAt = LocalDateTime.now();
        }
        var notes = normalizeOptionalText(
            stringValue(payload, "notes", "assignment_notes", "assignmentNotes"),
            "notes",
            4000
        );
        var changeReason = normalizeChangeReason(
            stringValue(payload, "change_reason", "changeReason"),
            "reassigned"
        );

        return new AssignmentCommand(
            responsibleEmployeeId,
            unitId,
            status,
            assignedAt,
            notes,
            changeReason
        );
    }

    private void prevalidateAssignmentStatus(Map<String, Object> payload, String defaultStatus) {
        var statusValue = stringValue(payload, "status", "assignment_status", "to_status", "toStatus");
        if (statusValue.isBlank()) {
            statusValue = defaultStatus;
        }
        var normalized = normalizeStatus(statusValue);
        if (!ASSIGNABLE_STATUSES.contains(normalized)) {
            throw new IllegalArgumentException("Reassign endpoint only supports assigned or custody status.");
        }
    }

    private Map<String, Object> loadAssetDetail(long companyId, long assetId) {
        var rows = jdbcTemplate.query(
            """
                SELECT a.id,
                       a.asset_code,
                       a.asset_type,
                       a.name,
                       a.model,
                       a.serial_number,
                       a.responsible_employee_id,
                       e.first_name,
                       e.last_name,
                       e.email AS responsible_email,
                       a.unit_id,
                       u.name AS unit_name,
                       a.status,
                       a.assigned_at,
                       a.value_amount,
                       a.notes,
                       a.created_by_user_id,
                       created_by.full_name AS created_by_name,
                       a.updated_by_user_id,
                       updated_by.full_name AS updated_by_name,
                       a.created_at,
                       a.updated_at
                FROM hr_assets a
                LEFT JOIN hr_employees e ON e.id = a.responsible_employee_id
                LEFT JOIN units u ON u.id = a.unit_id
                LEFT JOIN users created_by ON created_by.id = a.created_by_user_id
                LEFT JOIN users updated_by ON updated_by.id = a.updated_by_user_id
                WHERE a.company_id = ?
                  AND a.id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> mapAssetRow(
                rs.getLong("id"),
                rs.getString("asset_code"),
                rs.getString("asset_type"),
                rs.getString("name"),
                rs.getString("model"),
                rs.getString("serial_number"),
                nullableLong(rs.getObject("responsible_employee_id")),
                fullName(rs.getString("first_name"), rs.getString("last_name")),
                rs.getString("responsible_email"),
                nullableLong(rs.getObject("unit_id")),
                rs.getString("unit_name"),
                rs.getString("status"),
                asLocalDateTime(rs.getTimestamp("assigned_at")),
                rs.getBigDecimal("value_amount"),
                rs.getString("notes"),
                nullableLong(rs.getObject("created_by_user_id")),
                rs.getString("created_by_name"),
                nullableLong(rs.getObject("updated_by_user_id")),
                rs.getString("updated_by_name"),
                asLocalDateTime(rs.getTimestamp("created_at")),
                asLocalDateTime(rs.getTimestamp("updated_at"))
            ),
            companyId,
            assetId
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Asset not found.");
        }

        return rows.getFirst();
    }

    private AssetState requireAssetState(long companyId, long assetId) {
        var rows = jdbcTemplate.query(
            """
                SELECT id,
                       company_id,
                       asset_code,
                       asset_type,
                       name,
                       model,
                       serial_number,
                       responsible_employee_id,
                       unit_id,
                       status,
                       assigned_at,
                       value_amount,
                       notes
                FROM hr_assets
                WHERE company_id = ?
                  AND id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new AssetState(
                rs.getLong("id"),
                rs.getLong("company_id"),
                safe(rs.getString("asset_code")),
                safe(rs.getString("asset_type")),
                safe(rs.getString("name")),
                safe(rs.getString("model")),
                safe(rs.getString("serial_number")),
                nullableLong(rs.getObject("responsible_employee_id")),
                nullableLong(rs.getObject("unit_id")),
                safe(rs.getString("status")),
                asLocalDateTime(rs.getTimestamp("assigned_at")),
                rs.getBigDecimal("value_amount"),
                safe(rs.getString("notes"))
            ),
            companyId,
            assetId
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Asset not found.");
        }
        return rows.getFirst();
    }

    private void closeOpenAssignments(long companyId, long assetId, LocalDateTime endedAt, long actorUserId) {
        jdbcTemplate.update(
            """
                UPDATE hr_asset_assignments
                SET ended_at = ?,
                    ended_by_user_id = ?
                WHERE company_id = ?
                  AND asset_id = ?
                  AND ended_at IS NULL
                """,
            Timestamp.valueOf(endedAt),
            actorUserId,
            companyId,
            assetId
        );
    }

    private void insertAssignmentHistory(
        long companyId,
        long assetId,
        Long responsibleEmployeeId,
        Long unitId,
        String status,
        LocalDateTime startedAt,
        String notes,
        long actorUserId
    ) {
        jdbcTemplate.update(
            """
                INSERT INTO hr_asset_assignments
                (company_id, asset_id, responsible_employee_id, unit_id, assignment_status, started_at, notes, created_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
            companyId,
            assetId,
            responsibleEmployeeId,
            unitId,
            status,
            Timestamp.valueOf(startedAt),
            nullable(notes),
            actorUserId
        );
    }

    private void insertStatusHistory(
        long companyId,
        long assetId,
        String fromStatus,
        String toStatus,
        String changeReason,
        String notes,
        long actorUserId,
        LocalDateTime changedAt
    ) {
        jdbcTemplate.update(
            """
                INSERT INTO hr_asset_status_history
                (company_id, asset_id, from_status, to_status, change_reason, notes, changed_by_user_id, changed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
            companyId,
            assetId,
            nullable(fromStatus),
            toStatus,
            nullable(changeReason),
            nullable(notes),
            actorUserId,
            Timestamp.valueOf(changedAt)
        );
    }

    private void ensureUniqueAssetCode(long companyId, String assetCode, Long currentAssetId) {
        var sql = new StringBuilder(
            "SELECT COUNT(*) FROM hr_assets WHERE company_id = ? AND LOWER(asset_code) = LOWER(?)"
        );
        var params = new ArrayList<Object>();
        params.add(companyId);
        params.add(assetCode);
        if (currentAssetId != null) {
            sql.append(" AND id <> ?");
            params.add(currentAssetId);
        }

        var count = jdbcTemplate.queryForObject(sql.toString(), Long.class, params.toArray());
        if (count != null && count > 0) {
            throw new IllegalArgumentException("asset_code already exists for this company.");
        }
    }

    private void ensureUniqueSerialNumber(long companyId, String serialNumber, Long currentAssetId) {
        if (serialNumber == null || serialNumber.isBlank()) {
            return;
        }

        var sql = new StringBuilder(
            "SELECT COUNT(*) FROM hr_assets WHERE company_id = ? AND LOWER(serial_number) = LOWER(?)"
        );
        var params = new ArrayList<Object>();
        params.add(companyId);
        params.add(serialNumber);
        if (currentAssetId != null) {
            sql.append(" AND id <> ?");
            params.add(currentAssetId);
        }

        var count = jdbcTemplate.queryForObject(sql.toString(), Long.class, params.toArray());
        if (count != null && count > 0) {
            throw new IllegalArgumentException("serial_number already exists for this company.");
        }
    }

    private Long resolveEmployeeId(long companyId, Map<String, Object> payload, boolean required) {
        var explicitEmployeeId = parseLong(payload, "responsible_employee_id", "responsibleEmployeeId", "employee_id");
        if (explicitEmployeeId != null) {
            return requireActiveEmployee(companyId, explicitEmployeeId);
        }

        var label = stringValue(payload, "responsible", "responsible_name", "responsible_email");
        if (!label.isBlank()) {
            return findEmployeeByLabel(companyId, label);
        }

        if (required) {
            throw new IllegalArgumentException("responsible_employee_id is required.");
        }

        return null;
    }

    private Long resolveUnitId(long companyId, Map<String, Object> payload) {
        var explicitUnitId = parseLong(payload, "unit_id", "unitId");
        if (explicitUnitId != null) {
            return requireActiveUnit(companyId, explicitUnitId);
        }

        if (hasAnyKey(payload, "unit")) {
            var unitLabel = stringValue(payload, "unit");
            if (unitLabel.isBlank()) {
                return null;
            }
            return findUnitByName(companyId, unitLabel);
        }

        return null;
    }

    private Long requireActiveEmployee(long companyId, long employeeId) {
        var employees = jdbcTemplate.query(
            """
                SELECT id, status
                FROM hr_employees
                WHERE company_id = ?
                  AND id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> Map.of(
                "id", rs.getLong("id"),
                "status", safe(rs.getString("status"))
            ),
            companyId,
            employeeId
        );

        if (employees.isEmpty()) {
            throw new NoSuchElementException("Responsible employee not found.");
        }

        var status = String.valueOf(employees.getFirst().get("status")).toLowerCase();
        if (!ACTIVE_EMPLOYEE_STATUSES.contains(status)) {
            throw new IllegalArgumentException("Responsible employee must be active.");
        }

        return employeeId;
    }

    private Long findEmployeeByLabel(long companyId, String label) {
        var normalizedLabel = label.trim().toLowerCase();
        var rows = jdbcTemplate.query(
            """
                SELECT id, status
                FROM hr_employees
                WHERE company_id = ?
                  AND (
                    LOWER(TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')))) = ?
                    OR LOWER(COALESCE(email, '')) = ?
                  )
                ORDER BY id DESC
                """,
            (rs, rowNum) -> Map.of(
                "id", rs.getLong("id"),
                "status", safe(rs.getString("status"))
            ),
            companyId,
            normalizedLabel,
            normalizedLabel
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Responsible employee not found.");
        }
        if (rows.size() > 1) {
            throw new IllegalArgumentException("Responsible employee name is ambiguous. Use responsible_employee_id.");
        }

        var status = String.valueOf(rows.getFirst().get("status")).toLowerCase();
        if (!ACTIVE_EMPLOYEE_STATUSES.contains(status)) {
            throw new IllegalArgumentException("Responsible employee must be active.");
        }
        return ((Number) rows.getFirst().get("id")).longValue();
    }

    private Long requireActiveUnit(long companyId, long unitId) {
        var units = jdbcTemplate.query(
            """
                SELECT id, status
                FROM units
                WHERE company_id = ?
                  AND id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> Map.of(
                "id", rs.getLong("id"),
                "status", safe(rs.getString("status"))
            ),
            companyId,
            unitId
        );

        if (units.isEmpty()) {
            throw new NoSuchElementException("Unit not found.");
        }

        var status = String.valueOf(units.getFirst().get("status")).toLowerCase();
        if (!ACTIVE_UNIT_STATUSES.contains(status)) {
            throw new IllegalArgumentException("Unit must be active.");
        }

        return unitId;
    }

    private Long findUnitByName(long companyId, String name) {
        var normalizedName = name.trim().toLowerCase();
        var rows = jdbcTemplate.query(
            """
                SELECT id, status
                FROM units
                WHERE company_id = ?
                  AND LOWER(name) = ?
                ORDER BY id DESC
                """,
            (rs, rowNum) -> Map.of(
                "id", rs.getLong("id"),
                "status", safe(rs.getString("status"))
            ),
            companyId,
            normalizedName
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Unit not found.");
        }
        if (rows.size() > 1) {
            throw new IllegalArgumentException("Unit name is ambiguous. Use unit_id.");
        }

        var status = String.valueOf(rows.getFirst().get("status")).toLowerCase();
        if (!ACTIVE_UNIT_STATUSES.contains(status)) {
            throw new IllegalArgumentException("Unit must be active.");
        }
        return ((Number) rows.getFirst().get("id")).longValue();
    }

    private AssetQuery buildListQuery(long companyId, Map<String, Object> filters) {
        var conditions = new ArrayList<String>();
        var params = new ArrayList<Object>();
        conditions.add("a.company_id = ?");
        params.add(companyId);

        var search = stringValue(filters, "search");
        if (!search.isBlank()) {
            var likeValue = "%" + search.trim().toLowerCase() + "%";
            conditions.add(
                """
                    (
                      LOWER(a.asset_code) LIKE ?
                      OR LOWER(a.name) LIKE ?
                      OR LOWER(COALESCE(a.model, '')) LIKE ?
                      OR LOWER(COALESCE(a.serial_number, '')) LIKE ?
                    )
                    """
            );
            params.add(likeValue);
            params.add(likeValue);
            params.add(likeValue);
            params.add(likeValue);
        }

        var assetType = stringValue(filters, "asset_type", "assetType");
        if (!assetType.isBlank()) {
            conditions.add("LOWER(a.asset_type) = ?");
            params.add(assetType.trim().toLowerCase());
        }

        var status = stringValue(filters, "status");
        if (!status.isBlank() && !"all".equalsIgnoreCase(status.trim())) {
            conditions.add("a.status = ?");
            params.add(normalizeStatus(status));
        }

        var unitId = parseLong(filters, "unit_id", "unitId");
        if (unitId != null && unitId > 0) {
            conditions.add("a.unit_id = ?");
            params.add(unitId);
        }

        var responsibleEmployeeId = parseLong(filters, "responsible_employee_id", "responsibleEmployeeId");
        if (responsibleEmployeeId != null && responsibleEmployeeId > 0) {
            conditions.add("a.responsible_employee_id = ?");
            params.add(responsibleEmployeeId);
        }

        return new AssetQuery(" WHERE " + String.join(" AND ", conditions) + " ", params);
    }

    private int parsePage(Map<String, Object> filters) {
        var value = parseLong(filters, "page");
        if (value == null) {
            return 1;
        }
        if (value <= 0) {
            throw new IllegalArgumentException("page must be greater than zero.");
        }
        return Math.toIntExact(value);
    }

    private int parseSize(Map<String, Object> filters) {
        var value = parseLong(filters, "size");
        if (value == null) {
            return DEFAULT_PAGE_SIZE;
        }
        if (value <= 0 || value > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("size must be between 1 and " + MAX_PAGE_SIZE + ".");
        }
        return Math.toIntExact(value);
    }

    private Object[] withPaging(List<Object> params, int size, int offset) {
        var next = new ArrayList<>(params);
        next.add(size);
        next.add(offset);
        return next.toArray();
    }

    private Map<String, Object> mapAssetRow(
        long id,
        String assetCode,
        String assetType,
        String name,
        String model,
        String serialNumber,
        Long responsibleEmployeeId,
        String responsibleName,
        String responsibleEmail,
        Long unitId,
        String unitName,
        String status,
        LocalDateTime assignedAt,
        BigDecimal valueAmount,
        String notes,
        Long createdByUserId,
        String createdByName,
        Long updatedByUserId,
        String updatedByName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {
        var asset = new LinkedHashMap<String, Object>();
        asset.put("id", id);
        asset.put("asset_code", safe(assetCode));
        asset.put("asset_type", safe(assetType));
        asset.put("name", safe(name));
        asset.put("model", safe(model));
        asset.put("serial_number", safe(serialNumber));
        asset.put("responsible_employee_id", responsibleEmployeeId);
        asset.put("responsible_name", safe(responsibleName));
        asset.put("responsible_email", safe(responsibleEmail));
        asset.put("unit_id", unitId);
        asset.put("unit_name", safe(unitName));
        asset.put("status", safe(status));
        asset.put("assigned_at", formatDateTime(assignedAt));
        asset.put("value_amount", valueAmount);
        asset.put("notes", safe(notes));
        asset.put("created_by_user_id", createdByUserId);
        asset.put("created_by_name", safe(createdByName));
        asset.put("updated_by_user_id", updatedByUserId);
        asset.put("updated_by_name", safe(updatedByName));
        asset.put("created_at", formatDateTime(createdAt));
        asset.put("updated_at", formatDateTime(updatedAt));
        return asset;
    }

    private void rejectLifecycleFields(Map<String, Object> payload) {
        if (containsAnyKey(
            payload,
            "status",
            "state",
            "assigned_at",
            "assignedAt",
            "assigned_date",
            "assignedDate",
            "responsible_employee_id",
            "responsibleEmployeeId",
            "employee_id",
            "responsible",
            "responsible_name"
        )) {
            throw new IllegalArgumentException("Use the reassign or status endpoints for assignment and status changes.");
        }
    }

    private String normalizeAssetCode(String value) {
        var normalized = value == null ? "" : value.trim().toUpperCase();
        if (!ASSET_CODE_PATTERN.matcher(normalized).matches()) {
            throw new IllegalArgumentException("asset_code must be 2-80 characters using letters, numbers, dot, underscore, or hyphen.");
        }
        return normalized;
    }

    private String normalizeAssetType(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase();
        if (!ASSET_TYPE_PATTERN.matcher(normalized).matches()) {
            throw new IllegalArgumentException("asset_type must be 1-50 characters using lowercase letters, numbers, spaces, underscore, or hyphen.");
        }
        return normalized;
    }

    private String normalizeStatus(String value) {
        var normalized = switch (value == null ? "" : value.trim().toLowerCase()) {
            case "disponible" -> "available";
            case "asignado" -> "assigned";
            case "mantenimiento" -> "maintenance";
            case "resguardo" -> "custody";
            case "inactivo", "inactive" -> "inactive";
            default -> value == null ? "" : value.trim().toLowerCase();
        };

        if (!VALID_STATUSES.contains(normalized)) {
            throw new IllegalArgumentException("status must be one of available, assigned, maintenance, custody, or inactive.");
        }
        return normalized;
    }

    private String normalizeRequiredText(String value, String fieldName, int maxLength) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " is required.");
        }
        var normalized = value.trim();
        if (normalized.length() > maxLength) {
            throw new IllegalArgumentException(fieldName + " must be " + maxLength + " characters or less.");
        }
        return normalized;
    }

    private String normalizeOptionalText(String value, String fieldName, int maxLength) {
        if (value == null || value.isBlank()) {
            return "";
        }
        var normalized = value.trim();
        if (normalized.length() > maxLength) {
            throw new IllegalArgumentException(fieldName + " must be " + maxLength + " characters or less.");
        }
        return normalized;
    }

    private String normalizeChangeReason(String value, String fallback) {
        var normalized = normalizeOptionalText(value, "change_reason", 50);
        return normalized.isBlank() ? fallback : normalized;
    }

    private String requiredString(Map<String, Object> payload, String... keys) {
        var value = stringValue(payload, keys);
        if (value.isBlank()) {
            throw new IllegalArgumentException(keys[0] + " is required.");
        }
        return value;
    }

    private String stringValue(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            if (!payload.containsKey(key)) {
                continue;
            }
            var value = payload.get(key);
            if (value instanceof String string) {
                return string.trim();
            }
            if (value != null) {
                return String.valueOf(value).trim();
            }
            return "";
        }
        return "";
    }

    private Long parseLong(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            if (!payload.containsKey(key)) {
                continue;
            }
            var value = payload.get(key);
            if (value instanceof Number number) {
                return number.longValue();
            }
            if (value instanceof String string) {
                if (string.isBlank()) {
                    return null;
                }
                try {
                    return Long.parseLong(string.trim());
                } catch (NumberFormatException ex) {
                    throw new IllegalArgumentException(key + " must be numeric.");
                }
            }
            if (value != null) {
                throw new IllegalArgumentException(key + " must be numeric.");
            }
            return null;
        }
        return null;
    }

    private BigDecimal parseFlexibleBigDecimal(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            if (!payload.containsKey(key)) {
                continue;
            }
            var value = payload.get(key);
            if (value == null) {
                return null;
            }
            if (value instanceof BigDecimal decimal) {
                validateNonNegativeDecimal(decimal, key);
                return decimal;
            }
            if (value instanceof Number number) {
                var decimal = BigDecimal.valueOf(number.doubleValue());
                validateNonNegativeDecimal(decimal, key);
                return decimal;
            }
            if (value instanceof String string) {
                if (string.isBlank()) {
                    return null;
                }
                var cleaned = string.trim().replace(",", "").replace("$", "");
                try {
                    var decimal = new BigDecimal(cleaned);
                    validateNonNegativeDecimal(decimal, key);
                    return decimal;
                } catch (NumberFormatException ex) {
                    throw new IllegalArgumentException(keys[0] + " must be a valid number.");
                }
            }
            throw new IllegalArgumentException(keys[0] + " must be a valid number.");
        }
        return null;
    }

    private LocalDateTime parseDateTime(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            if (!payload.containsKey(key)) {
                continue;
            }
            var value = payload.get(key);
            if (value == null) {
                return null;
            }
            if (value instanceof String string) {
                if (string.isBlank()) {
                    return null;
                }
                var raw = string.trim();
                try {
                    if (raw.endsWith("Z") || raw.matches(".*[+-]\\d\\d:\\d\\d$")) {
                        return OffsetDateTime.parse(raw).toLocalDateTime();
                    }
                    if (raw.contains("T")) {
                        return LocalDateTime.parse(raw);
                    }
                    if (raw.length() == 10) {
                        return LocalDate.parse(raw).atStartOfDay();
                    }
                    return LocalDateTime.parse(raw, DATE_TIME_INPUT);
                } catch (DateTimeParseException ex) {
                    throw new IllegalArgumentException(key + " must use YYYY-MM-DD or YYYY-MM-DD HH:mm:ss format.");
                }
            }
            throw new IllegalArgumentException(key + " must use YYYY-MM-DD or YYYY-MM-DD HH:mm:ss format.");
        }
        return null;
    }

    private boolean hasAnyKey(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            if (payload.containsKey(key)) {
                return true;
            }
        }
        return false;
    }

    private boolean containsAnyKey(Map<String, Object> payload, String... keys) {
        return hasAnyKey(payload, keys);
    }

    private void validateNonNegativeDecimal(BigDecimal value, String fieldName) {
        if (value.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException(fieldName + " must be zero or greater.");
        }
    }

    private Object defaultSummary() {
        var result = new LinkedHashMap<String, Object>();
        result.put("total_count", 0L);
        result.put("available_count", 0L);
        result.put("assigned_count", 0L);
        result.put("maintenance_count", 0L);
        result.put("custody_count", 0L);
        result.put("inactive_count", 0L);
        result.put("total_value_amount", BigDecimal.ZERO);
        return result;
    }

    private String defaultChangeReason(String targetStatus) {
        return switch (targetStatus) {
            case "maintenance" -> "moved_to_maintenance";
            case "custody" -> "moved_to_custody";
            case "inactive" -> "marked_inactive";
            case "available" -> "returned_to_available";
            default -> "status_changed";
        };
    }

    private String fullName(String firstName, String lastName) {
        return String.join(" ", safe(firstName), safe(lastName)).trim();
    }

    private Long nullableLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        return null;
    }

    private LocalDateTime asLocalDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }

    private String formatDateTime(LocalDateTime value) {
        return value == null ? null : value.format(DATE_TIME_OUTPUT);
    }

    private LocalDateTime parseTimelineDate(String value) {
        return value == null || value.isBlank() ? LocalDateTime.MIN : LocalDateTime.parse(value, DATE_TIME_OUTPUT);
    }

    private Map<String, Object> timelineAssignmentItem(Map<String, Object> item) {
        var result = new LinkedHashMap<String, Object>();
        result.put("event_type", "assignment");
        result.put("occurred_at", item.get("started_at"));
        result.putAll(item);
        return result;
    }

    private Map<String, Object> timelineStatusItem(Map<String, Object> item) {
        var result = new LinkedHashMap<String, Object>();
        result.put("event_type", "status_change");
        result.put("occurred_at", item.get("changed_at"));
        result.putAll(item);
        return result;
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private String nullable(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private void setNullableLong(java.sql.PreparedStatement statement, int index, Long value) throws java.sql.SQLException {
        if (value == null) {
            statement.setNull(index, java.sql.Types.BIGINT);
            return;
        }
        statement.setLong(index, value);
    }

    private void setNullableDateTime(java.sql.PreparedStatement statement, int index, LocalDateTime value) throws java.sql.SQLException {
        if (value == null) {
            statement.setNull(index, java.sql.Types.TIMESTAMP);
            return;
        }
        statement.setTimestamp(index, Timestamp.valueOf(value));
    }

    private void setNullableBigDecimal(java.sql.PreparedStatement statement, int index, BigDecimal value) throws java.sql.SQLException {
        if (value == null) {
            statement.setNull(index, java.sql.Types.DECIMAL);
            return;
        }
        statement.setBigDecimal(index, value);
    }

    private record AssetQuery(
        String whereClause,
        List<Object> params
    ) {
    }

    private record AssetState(
        long id,
        long companyId,
        String assetCode,
        String assetType,
        String name,
        String model,
        String serialNumber,
        Long responsibleEmployeeId,
        Long unitId,
        String status,
        LocalDateTime assignedAt,
        BigDecimal valueAmount,
        String notes
    ) {
    }

    private record AssetCreatePayload(
        String assetCode,
        String assetType,
        String name,
        String model,
        String serialNumber,
        Long responsibleEmployeeId,
        Long unitId,
        String status,
        LocalDateTime assignedAt,
        BigDecimal valueAmount,
        String notes,
        String assignmentNotes
    ) {
    }

    private record AssignmentCommand(
        Long responsibleEmployeeId,
        Long unitId,
        String status,
        LocalDateTime assignedAt,
        String notes,
        String changeReason
    ) {
    }

    private record TimelineEntry(
        LocalDateTime occurredAt,
        Map<String, Object> payload
    ) {
    }
}
