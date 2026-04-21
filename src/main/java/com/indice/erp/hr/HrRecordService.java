package com.indice.erp.hr;

import static com.indice.erp.hr.HrPayloadUtils.nullable;
import static com.indice.erp.hr.HrPayloadUtils.parseLong;
import static com.indice.erp.hr.HrPayloadUtils.safe;
import static com.indice.erp.hr.HrPayloadUtils.stringValue;

import com.indice.erp.storage.ObjectStorageDisabledException;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import com.indice.erp.storage.PresignedUpload;
import java.nio.charset.StandardCharsets;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HrRecordService {

    private static final long MAX_ATTACHMENT_SIZE_BYTES = 10L * 1024L * 1024L;
    private static final int DEFAULT_PAGE_SIZE = 50;
    private static final int MAX_PAGE_SIZE = 200;

    private final JdbcTemplate jdbcTemplate;
    private final ObjectStorageService objectStorageService;
    private final ObjectStorageProperties objectStorageProperties;

    public HrRecordService(
        JdbcTemplate jdbcTemplate,
        ObjectStorageService objectStorageService,
        ObjectStorageProperties objectStorageProperties
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectStorageService = objectStorageService;
        this.objectStorageProperties = objectStorageProperties;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> listRecords(long companyId, Map<String, Object> filters) {
        var page = parsePage(filters);
        var size = parseSize(filters);
        var query = buildListQuery(companyId, filters);
        var offset = (page - 1) * size;

        var rows = jdbcTemplate.query(
            """
                SELECT r.id,
                       r.record_number,
                       r.employee_id,
                       r.employee_name_snapshot,
                       r.employee_position_snapshot,
                       r.employee_department_snapshot,
                       r.employee_unit_id_snapshot,
                       r.employee_unit_name_snapshot,
                       r.employee_business_id_snapshot,
                       r.employee_business_name_snapshot,
                       r.record_type,
                       r.severity,
                       r.status,
                       r.title,
                       r.description,
                       r.actions_taken,
                       r.event_date,
                       r.reported_by_user_id,
                       r.reported_by_employee_id,
                       r.reported_by_name_snapshot,
                       r.created_at,
                       r.updated_at
                FROM hr_employee_records r
                """
                + query.whereClause()
                + """
                    ORDER BY CASE WHEN LOWER(COALESCE(r.status, 'pending')) = 'pending' THEN 0 ELSE 1 END,
                             r.event_date DESC,
                             r.id DESC
                    LIMIT ? OFFSET ?
                    """,
            (rs, rowNum) -> mapRecordRow(rs, false),
            withPaging(query.params(), size, offset)
        );

        var totalCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM hr_employee_records r " + query.whereClause(),
            Long.class,
            query.params().toArray()
        );

        var summary = jdbcTemplate.query(
            """
                SELECT COUNT(*) AS total_count,
                       SUM(CASE WHEN LOWER(COALESCE(status, 'pending')) = 'pending' THEN 1 ELSE 0 END) AS pending_count,
                       SUM(CASE WHEN LOWER(COALESCE(status, 'pending')) = 'reviewed' THEN 1 ELSE 0 END) AS reviewed_count,
                       SUM(CASE WHEN LOWER(COALESCE(status, 'pending')) = 'resolved' THEN 1 ELSE 0 END) AS resolved_count,
                       SUM(CASE WHEN LOWER(COALESCE(severity, '')) = 'high' THEN 1 ELSE 0 END) AS high_severity_count
                FROM hr_employee_records
                WHERE company_id = ?
                  AND deleted_at IS NULL
                """,
            (rs, rowNum) -> {
                var body = new LinkedHashMap<String, Object>();
                body.put("total_count", rs.getLong("total_count"));
                body.put("pending_count", rs.getLong("pending_count"));
                body.put("reviewed_count", rs.getLong("reviewed_count"));
                body.put("resolved_count", rs.getLong("resolved_count"));
                body.put("high_severity_count", rs.getLong("high_severity_count"));
                return body;
            },
            companyId
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
    public Map<String, Object> getRecordDetails(long companyId, long recordId) {
        var record = loadRecord(companyId, recordId, true);
        var body = new LinkedHashMap<String, Object>();
        body.put("record_id", recordId);
        body.put("record", record);
        return body;
    }

    @Transactional
    public Map<String, Object> createRecord(long companyId, long actorUserId, Map<String, Object> payload) {
        var actor = loadActorRef(actorUserId);
        var employeeSnapshot = loadEmployeeSnapshot(companyId, requiredEmployeeId(payload));
        var draft = normalizeDraft(companyId, payload, employeeSnapshot, actor, null);

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO hr_employee_records
                    (company_id, employee_id, employee_name_snapshot, employee_position_snapshot, employee_department_snapshot,
                     employee_unit_id_snapshot, employee_unit_name_snapshot, employee_business_id_snapshot, employee_business_name_snapshot,
                     record_type, severity, status, title, description, actions_taken, event_date,
                     reported_by_user_id, reported_by_employee_id, reported_by_name_snapshot, created_by_user_id, updated_by_user_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                new String[] {"id"}
            );
            statement.setLong(1, companyId);
            statement.setLong(2, draft.employeeSnapshot().employeeId());
            statement.setString(3, draft.employeeSnapshot().employeeName());
            statement.setString(4, nullable(draft.employeeSnapshot().position()));
            statement.setString(5, nullable(draft.employeeSnapshot().department()));
            setNullableLong(statement, 6, draft.employeeSnapshot().unitId());
            statement.setString(7, nullable(draft.employeeSnapshot().unitName()));
            setNullableLong(statement, 8, draft.employeeSnapshot().businessId());
            statement.setString(9, nullable(draft.employeeSnapshot().businessName()));
            statement.setString(10, draft.recordType());
            statement.setString(11, nullable(draft.severity()));
            statement.setString(12, draft.status());
            statement.setString(13, draft.title());
            statement.setString(14, draft.description());
            statement.setString(15, nullable(draft.actionsTaken()));
            statement.setTimestamp(16, Timestamp.valueOf(draft.eventDate()));
            statement.setLong(17, actorUserId);
            setNullableLong(statement, 18, draft.reportedByEmployeeId());
            statement.setString(19, draft.reportedByName());
            statement.setLong(20, actorUserId);
            statement.setLong(21, actorUserId);
            return statement;
        }, keyHolder);

        var recordId = keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
        if (recordId <= 0) {
            throw new IllegalArgumentException("Unable to create record.");
        }

        var recordNumber = generateRecordNumber(recordId);
        jdbcTemplate.update(
            "UPDATE hr_employee_records SET record_number = ? WHERE id = ? AND company_id = ?",
            recordNumber,
            recordId,
            companyId
        );

        replaceWitnesses(companyId, recordId, draft.witnesses());
        insertActivity(companyId, recordId, "created", null, draft.status(), null, actorUserId, actor.actorName());

        return getRecordDetails(companyId, recordId);
    }

    @Transactional
    public Map<String, Object> updateRecord(long companyId, long actorUserId, long recordId, Map<String, Object> payload) {
        var current = requireRecordState(companyId, recordId);
        var actor = loadActorRef(actorUserId);
        var employeeSnapshot = loadEmployeeSnapshot(companyId, requiredEmployeeId(payload));
        var draft = normalizeDraft(companyId, payload, employeeSnapshot, actor, current.status());

        jdbcTemplate.update(
            """
                UPDATE hr_employee_records
                SET employee_id = ?,
                    employee_name_snapshot = ?,
                    employee_position_snapshot = ?,
                    employee_department_snapshot = ?,
                    employee_unit_id_snapshot = ?,
                    employee_unit_name_snapshot = ?,
                    employee_business_id_snapshot = ?,
                    employee_business_name_snapshot = ?,
                    record_type = ?,
                    severity = ?,
                    status = ?,
                    title = ?,
                    description = ?,
                    actions_taken = ?,
                    event_date = ?,
                    reported_by_employee_id = ?,
                    reported_by_name_snapshot = ?,
                    updated_by_user_id = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE company_id = ?
                  AND id = ?
                  AND deleted_at IS NULL
                """,
            draft.employeeSnapshot().employeeId(),
            draft.employeeSnapshot().employeeName(),
            nullable(draft.employeeSnapshot().position()),
            nullable(draft.employeeSnapshot().department()),
            draft.employeeSnapshot().unitId(),
            nullable(draft.employeeSnapshot().unitName()),
            draft.employeeSnapshot().businessId(),
            nullable(draft.employeeSnapshot().businessName()),
            draft.recordType(),
            nullable(draft.severity()),
            draft.status(),
            draft.title(),
            draft.description(),
            nullable(draft.actionsTaken()),
            Timestamp.valueOf(draft.eventDate()),
            draft.reportedByEmployeeId(),
            draft.reportedByName(),
            actorUserId,
            companyId,
            recordId
        );

        replaceWitnesses(companyId, recordId, draft.witnesses());
        insertActivity(companyId, recordId, "updated", null, null, null, actorUserId, actor.actorName());
        if (!current.status().equals(draft.status())) {
            insertActivity(
                companyId,
                recordId,
                "status_changed",
                current.status(),
                draft.status(),
                null,
                actorUserId,
                actor.actorName()
            );
        }

        return getRecordDetails(companyId, recordId);
    }

    @Transactional
    public void deleteRecord(long companyId, long actorUserId, long recordId) {
        requireRecordState(companyId, recordId);

        var updated = jdbcTemplate.update(
            """
                UPDATE hr_employee_records
                SET deleted_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by_user_id = ?
                WHERE company_id = ?
                  AND id = ?
                  AND deleted_at IS NULL
                """,
            actorUserId,
            companyId,
            recordId
        );

        if (updated == 0) {
            throw new NoSuchElementException("Record not found.");
        }

        var actor = loadActorRef(actorUserId);
        insertActivity(companyId, recordId, "deleted", null, null, null, actorUserId, actor.actorName());
    }

    @Transactional
    public Map<String, Object> createAttachmentUpload(long companyId, long recordId, Map<String, Object> payload) {
        requireRecordState(companyId, recordId);
        if (!objectStorageService.isEnabled()) {
            throw new ObjectStorageDisabledException("Object storage is not enabled.");
        }

        var fileName = normalizeOriginalFileName(stringValue(payload, "file_name", "fileName"));
        var contentType = normalizeAttachmentContentType(stringValue(payload, "content_type", "contentType", "mime_type"));
        var sizeBytes = parseLong(payload, "size_bytes", "sizeBytes");
        if (sizeBytes == null || sizeBytes <= 0) {
            throw new IllegalArgumentException("size_bytes is required.");
        }
        if (sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
            throw new IllegalArgumentException("Attachments must be 10MB or smaller.");
        }

        var objectKey = buildAttachmentObjectKey(companyId, recordId, fileName, contentType);
        var upload = objectStorageService.presignUpload(
            documentsBucket(),
            objectKey,
            contentType,
            objectStorageProperties.getMinio().getPresignExpirySeconds()
        );

        var body = new LinkedHashMap<String, Object>();
        body.put("object_key", upload.objectKey());
        body.put("upload_url", upload.uploadUrl());
        body.put("expires_at", upload.expiresAt());
        body.put("upload_headers", upload.uploadHeaders());
        return body;
    }

    @Transactional
    public Map<String, Object> registerAttachment(long companyId, long actorUserId, long recordId, Map<String, Object> payload) {
        requireRecordState(companyId, recordId);
        if (!objectStorageService.isEnabled()) {
            throw new ObjectStorageDisabledException("Object storage is not enabled.");
        }

        var objectKey = normalizeAttachmentObjectKey(companyId, recordId, stringValue(payload, "object_key", "objectKey"));
        var fileName = normalizeOriginalFileName(stringValue(payload, "original_filename", "originalFileName", "file_name", "fileName"));
        var mimeType = normalizeAttachmentContentType(stringValue(payload, "mime_type", "mimeType", "content_type", "contentType"));
        var sizeBytes = parseLong(payload, "size_bytes", "sizeBytes");
        if (sizeBytes == null || sizeBytes <= 0) {
            throw new IllegalArgumentException("size_bytes is required.");
        }
        if (sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
            throw new IllegalArgumentException("Attachments must be 10MB or smaller.");
        }
        if (!objectStorageService.objectExists(documentsBucket(), objectKey)) {
            throw new IllegalArgumentException("object_key does not reference an existing uploaded attachment.");
        }

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO hr_employee_record_attachments
                    (company_id, record_id, original_filename, mime_type, size_bytes, object_key, uploaded_by_user_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                new String[] {"id"}
            );
            statement.setLong(1, companyId);
            statement.setLong(2, recordId);
            statement.setString(3, fileName);
            statement.setString(4, mimeType);
            statement.setLong(5, sizeBytes);
            statement.setString(6, objectKey);
            statement.setLong(7, actorUserId);
            return statement;
        }, keyHolder);

        var attachmentId = keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
        if (attachmentId <= 0) {
            throw new IllegalArgumentException("Unable to register attachment.");
        }

        var actor = loadActorRef(actorUserId);
        insertActivity(companyId, recordId, "attachment_added", null, null, fileName, actorUserId, actor.actorName());

        return loadAttachment(companyId, recordId, attachmentId);
    }

    @Transactional
    public void deleteAttachment(long companyId, long actorUserId, long recordId, long attachmentId) {
        requireRecordState(companyId, recordId);

        var rows = jdbcTemplate.query(
            """
                SELECT id, object_key, original_filename
                FROM hr_employee_record_attachments
                WHERE company_id = ?
                  AND record_id = ?
                  AND id = ?
                  AND deleted_at IS NULL
                """,
            (rs, rowNum) -> new AttachmentRef(
                rs.getLong("id"),
                safe(rs.getString("object_key")),
                safe(rs.getString("original_filename"))
            ),
            companyId,
            recordId,
            attachmentId
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Attachment not found.");
        }

        jdbcTemplate.update(
            """
                UPDATE hr_employee_record_attachments
                SET deleted_at = CURRENT_TIMESTAMP
                WHERE company_id = ?
                  AND record_id = ?
                  AND id = ?
                  AND deleted_at IS NULL
                """,
            companyId,
            recordId,
            attachmentId
        );

        deleteAttachmentObjectQuietly(rows.getFirst().objectKey());
        var actor = loadActorRef(actorUserId);
        insertActivity(companyId, recordId, "attachment_removed", null, null, rows.getFirst().fileName(), actorUserId, actor.actorName());
    }

    private RecordListQuery buildListQuery(long companyId, Map<String, Object> filters) {
        var conditions = new ArrayList<String>();
        var params = new ArrayList<Object>();
        conditions.add("WHERE r.company_id = ?");
        params.add(companyId);
        conditions.add("AND r.deleted_at IS NULL");

        var search = stringValue(filters, "search");
        if (!search.isBlank()) {
            var likeValue = "%" + search.toLowerCase(Locale.ROOT) + "%";
            conditions.add(
                """
                    AND (
                        LOWER(COALESCE(r.employee_name_snapshot, '')) LIKE ?
                        OR LOWER(COALESCE(r.employee_position_snapshot, '')) LIKE ?
                        OR LOWER(COALESCE(r.title, '')) LIKE ?
                        OR LOWER(COALESCE(r.description, '')) LIKE ?
                        OR LOWER(COALESCE(r.record_type, '')) LIKE ?
                        OR LOWER(COALESCE(r.reported_by_name_snapshot, '')) LIKE ?
                    )
                """
            );
            params.add(likeValue);
            params.add(likeValue);
            params.add(likeValue);
            params.add(likeValue);
            params.add(likeValue);
            params.add(likeValue);
        }

        var unit = stringValue(filters, "unit");
        if (!unit.isBlank() && !"all".equalsIgnoreCase(unit)) {
            conditions.add("AND LOWER(COALESCE(r.employee_unit_name_snapshot, '')) = ?");
            params.add(unit.toLowerCase(Locale.ROOT));
        }

        var business = stringValue(filters, "business");
        if (!business.isBlank() && !"all".equalsIgnoreCase(business)) {
            conditions.add("AND LOWER(COALESCE(r.employee_business_name_snapshot, '')) = ?");
            params.add(business.toLowerCase(Locale.ROOT));
        }

        var status = stringValue(filters, "status");
        if (!status.isBlank() && !"all".equalsIgnoreCase(status)) {
            conditions.add("AND LOWER(COALESCE(r.status, 'pending')) = ?");
            params.add(normalizeStatus(status));
        }

        var type = stringValue(filters, "type");
        if (!type.isBlank() && !"all".equalsIgnoreCase(type)) {
            conditions.add("AND LOWER(COALESCE(r.record_type, '')) = ?");
            params.add(normalizeRecordType(type));
        }

        var severity = stringValue(filters, "severity");
        if (!severity.isBlank() && !"all".equalsIgnoreCase(severity)) {
            conditions.add("AND LOWER(COALESCE(r.severity, '')) = ?");
            params.add(normalizeSeverity(severity));
        }

        var dateFrom = parseFlexibleDate(filters, "date_from", "dateFrom");
        if (dateFrom != null) {
            conditions.add("AND r.event_date >= ?");
            params.add(Timestamp.valueOf(dateFrom.atStartOfDay()));
        }

        var dateTo = parseFlexibleDate(filters, "date_to", "dateTo");
        if (dateTo != null) {
            conditions.add("AND r.event_date <= ?");
            params.add(Timestamp.valueOf(dateTo.atTime(23, 59, 59)));
        }

        return new RecordListQuery(" " + String.join(" ", conditions) + " ", params);
    }

    private RecordDraft normalizeDraft(
        long companyId,
        Map<String, Object> payload,
        EmployeeSnapshot employeeSnapshot,
        ActorRef actor,
        String currentStatus
    ) {
        var recordType = normalizeRecordType(stringValue(payload, "record_type", "recordType", "type"));
        var severityRaw = stringValue(payload, "severity");
        var severity = severityRaw.isBlank() ? null : normalizeSeverity(severityRaw);
        if (requiresSeverity(recordType) && severity == null) {
            throw new IllegalArgumentException("severity is required for incidents and warnings.");
        }
        if (!requiresSeverity(recordType)) {
            severity = null;
        }

        var status = stringValue(payload, "status");
        status = status.isBlank() ? (currentStatus == null ? "pending" : normalizeStatus(currentStatus)) : normalizeStatus(status);

        var title = normalizeRequiredText(stringValue(payload, "title"), "title", 160);
        var description = normalizeRequiredText(stringValue(payload, "description"), "description", 1000);
        var actionsTaken = normalizeOptionalText(stringValue(payload, "actions_taken", "actionsTaken"), 2000);
        var eventDate = parseFlexibleDateTime(payload, "event_date", "eventDate");
        if (eventDate == null) {
            throw new IllegalArgumentException("event_date is required.");
        }
        if (eventDate.isAfter(LocalDateTime.now().plusMinutes(1))) {
            throw new IllegalArgumentException("event_date cannot be in the future.");
        }

        var witnesses = normalizeWitnesses(companyId, payload, employeeSnapshot.employeeId());
        return new RecordDraft(
            employeeSnapshot,
            recordType,
            severity,
            status,
            title,
            description,
            actionsTaken,
            eventDate,
            actor.linkedEmployeeId(),
            actor.actorName(),
            witnesses
        );
    }

    private long requiredEmployeeId(Map<String, Object> payload) {
        var employeeId = parseLong(payload, "employee_id", "employeeId");
        if (employeeId == null || employeeId <= 0) {
            throw new IllegalArgumentException("employee_id is required.");
        }
        return employeeId;
    }

    private List<WitnessDraft> normalizeWitnesses(long companyId, Map<String, Object> payload, long employeeId) {
        var value = payload.get("witnesses");
        if (!(value instanceof List<?> list) || list.isEmpty()) {
            return List.of();
        }

        var witnesses = new ArrayList<WitnessDraft>();
        for (var item : list) {
            if (item instanceof Map<?, ?> witnessMap) {
                var witnessEmployeeId = toLong(witnessMap.get("employee_id"), "witness employee_id");
                if (witnessEmployeeId == null) {
                    witnessEmployeeId = toLong(witnessMap.get("employeeId"), "witness employee_id");
                }
                var witnessName = toTrimmedString(witnessMap.get("name"));
                if (witnessEmployeeId != null && witnessEmployeeId > 0) {
                    if (witnessEmployeeId == employeeId) {
                        continue;
                    }
                    var employee = loadEmployeeSnapshot(companyId, witnessEmployeeId);
                    witnesses.add(new WitnessDraft(employee.employeeId(), employee.employeeName()));
                    continue;
                }
                if (!witnessName.isBlank()) {
                    witnesses.add(new WitnessDraft(null, truncateText(witnessName, 160)));
                }
                continue;
            }

            var witnessName = toTrimmedString(item);
            if (!witnessName.isBlank()) {
                witnesses.add(new WitnessDraft(null, truncateText(witnessName, 160)));
            }
        }

        return witnesses.stream()
            .collect(Collectors.toMap(
                witness -> (witness.employeeId() == null ? "name:" : "employee:") + safe(witness.name()).toLowerCase(Locale.ROOT),
                witness -> witness,
                (left, right) -> left,
                LinkedHashMap::new
            ))
            .values()
            .stream()
            .toList();
    }

    private Map<String, Object> loadRecord(long companyId, long recordId, boolean includeDetails) {
        var rows = jdbcTemplate.query(
            """
                SELECT r.id,
                       r.record_number,
                       r.employee_id,
                       r.employee_name_snapshot,
                       r.employee_position_snapshot,
                       r.employee_department_snapshot,
                       r.employee_unit_id_snapshot,
                       r.employee_unit_name_snapshot,
                       r.employee_business_id_snapshot,
                       r.employee_business_name_snapshot,
                       r.record_type,
                       r.severity,
                       r.status,
                       r.title,
                       r.description,
                       r.actions_taken,
                       r.event_date,
                       r.reported_by_user_id,
                       r.reported_by_employee_id,
                       r.reported_by_name_snapshot,
                       r.created_at,
                       r.updated_at
                FROM hr_employee_records r
                WHERE r.company_id = ?
                  AND r.id = ?
                  AND r.deleted_at IS NULL
                """,
            (rs, rowNum) -> mapRecordRow(rs, includeDetails),
            companyId,
            recordId
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Record not found.");
        }

        return rows.getFirst();
    }

    private RecordState requireRecordState(long companyId, long recordId) {
        var rows = jdbcTemplate.query(
            """
                SELECT id, status
                FROM hr_employee_records
                WHERE company_id = ?
                  AND id = ?
                  AND deleted_at IS NULL
                """,
            (rs, rowNum) -> new RecordState(rs.getLong("id"), normalizeStatus(rs.getString("status"))),
            companyId,
            recordId
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Record not found.");
        }

        return rows.getFirst();
    }

    private EmployeeSnapshot loadEmployeeSnapshot(long companyId, long employeeId) {
        var rows = jdbcTemplate.query(
            """
                SELECT e.id,
                       TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))) AS employee_name,
                       COALESCE(NULLIF(e.position, ''), NULLIF(e.department, ''), '') AS position_title,
                       COALESCE(e.department, '') AS department_name,
                       e.unit_id,
                       u.name AS unit_name,
                       e.business_id,
                       b.name AS business_name
                FROM hr_employees e
                LEFT JOIN units u ON u.id = e.unit_id
                LEFT JOIN businesses b ON b.id = e.business_id
                WHERE e.company_id = ?
                  AND e.id = ?
                """,
            (rs, rowNum) -> new EmployeeSnapshot(
                rs.getLong("id"),
                safe(rs.getString("employee_name")).trim(),
                safe(rs.getString("position_title")),
                safe(rs.getString("department_name")),
                nullableLong(rs.getObject("unit_id")),
                safe(rs.getString("unit_name")),
                nullableLong(rs.getObject("business_id")),
                safe(rs.getString("business_name"))
            ),
            companyId,
            employeeId
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Employee not found.");
        }

        var snapshot = rows.getFirst();
        if (snapshot.employeeName().isBlank()) {
            throw new IllegalArgumentException("Selected employee must have a name.");
        }
        return snapshot;
    }

    private ActorRef loadActorRef(long userId) {
        var rows = jdbcTemplate.query(
            """
                SELECT u.id,
                       COALESCE(NULLIF(u.full_name, ''), u.email, CONCAT('User ', u.id)) AS actor_name,
                       (
                           SELECT portal_access.employee_id
                           FROM hr_employee_portal_access portal_access
                           WHERE portal_access.linked_user_id = u.id
                           ORDER BY portal_access.employee_id ASC
                           LIMIT 1
                       ) AS linked_employee_id
                FROM users u
                WHERE u.id = ?
                """,
            (rs, rowNum) -> new ActorRef(
                rs.getLong("id"),
                safe(rs.getString("actor_name")),
                nullableLong(rs.getObject("linked_employee_id"))
            ),
            userId
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Actor not found.");
        }

        return rows.getFirst();
    }

    private void replaceWitnesses(long companyId, long recordId, List<WitnessDraft> witnesses) {
        jdbcTemplate.update(
            "DELETE FROM hr_employee_record_witnesses WHERE company_id = ? AND record_id = ?",
            companyId,
            recordId
        );

        for (var witness : witnesses) {
            jdbcTemplate.update(
                """
                    INSERT INTO hr_employee_record_witnesses
                    (company_id, record_id, witness_employee_id, witness_name_snapshot)
                    VALUES (?, ?, ?, ?)
                    """,
                companyId,
                recordId,
                witness.employeeId(),
                witness.name()
            );
        }
    }

    private void insertActivity(
        long companyId,
        long recordId,
        String activityType,
        String fromStatus,
        String toStatus,
        String note,
        long actorUserId,
        String actorName
    ) {
        jdbcTemplate.update(
            """
                INSERT INTO hr_employee_record_activity
                (company_id, record_id, activity_type, from_status, to_status, note, actor_user_id, actor_name_snapshot)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
            companyId,
            recordId,
            activityType,
            nullable(fromStatus),
            nullable(toStatus),
            nullable(note),
            actorUserId,
            actorName
        );
    }

    private Map<String, Object> mapRecordRow(ResultSet rs, boolean includeDetails) throws SQLException {
        var employee = new LinkedHashMap<String, Object>();
        employee.put("id", rs.getLong("employee_id"));
        employee.put("name", safe(rs.getString("employee_name_snapshot")));
        employee.put("position", safe(rs.getString("employee_position_snapshot")));
        employee.put("department", safe(rs.getString("employee_department_snapshot")));

        var unit = new LinkedHashMap<String, Object>();
        unit.put("id", nullableLong(rs.getObject("employee_unit_id_snapshot")));
        unit.put("name", safe(rs.getString("employee_unit_name_snapshot")));

        var business = new LinkedHashMap<String, Object>();
        business.put("id", nullableLong(rs.getObject("employee_business_id_snapshot")));
        business.put("name", safe(rs.getString("employee_business_name_snapshot")));

        var reportedBy = new LinkedHashMap<String, Object>();
        reportedBy.put("user_id", rs.getLong("reported_by_user_id"));
        reportedBy.put("employee_id", nullableLong(rs.getObject("reported_by_employee_id")));
        reportedBy.put("name", safe(rs.getString("reported_by_name_snapshot")));

        var record = new LinkedHashMap<String, Object>();
        record.put("id", rs.getLong("id"));
        record.put("record_number", safe(rs.getString("record_number")));
        record.put("employee", employee);
        record.put("unit", unit);
        record.put("business", business);
        record.put("type", normalizeRecordType(rs.getString("record_type")));
        record.put("severity", nullable(normalizeSeverityNullable(rs.getString("severity"))));
        record.put("status", normalizeStatus(rs.getString("status")));
        record.put("title", safe(rs.getString("title")));
        record.put("description", safe(rs.getString("description")));
        record.put("actions_taken", safe(rs.getString("actions_taken")));
        record.put("event_date", toIsoString(asLocalDateTime(rs.getTimestamp("event_date"))));
        record.put("reported_by", reportedBy);
        record.put("created_at", toIsoString(asLocalDateTime(rs.getTimestamp("created_at"))));
        record.put("updated_at", toIsoString(asLocalDateTime(rs.getTimestamp("updated_at"))));

        if (includeDetails) {
            var recordId = rs.getLong("id");
            record.put("witnesses", loadWitnesses(recordId));
            record.put("attachments", loadAttachments(recordId));
            record.put("activity", loadActivity(recordId));
        }

        return record;
    }

    private List<Map<String, Object>> loadWitnesses(long recordId) {
        return jdbcTemplate.query(
            """
                SELECT id, witness_employee_id, witness_name_snapshot, created_at
                FROM hr_employee_record_witnesses
                WHERE record_id = ?
                ORDER BY id ASC
                """,
            (rs, rowNum) -> {
                var witness = new LinkedHashMap<String, Object>();
                witness.put("id", rs.getLong("id"));
                witness.put("employee_id", nullableLong(rs.getObject("witness_employee_id")));
                witness.put("name", safe(rs.getString("witness_name_snapshot")));
                witness.put("created_at", toIsoString(asLocalDateTime(rs.getTimestamp("created_at"))));
                return witness;
            },
            recordId
        );
    }

    private List<Map<String, Object>> loadAttachments(long recordId) {
        return jdbcTemplate.query(
            """
                SELECT id,
                       original_filename,
                       mime_type,
                       size_bytes,
                       object_key,
                       created_at
                FROM hr_employee_record_attachments
                WHERE record_id = ?
                  AND deleted_at IS NULL
                ORDER BY id ASC
                """,
            (rs, rowNum) -> mapAttachmentRow(rs),
            recordId
        );
    }

    private Map<String, Object> loadAttachment(long companyId, long recordId, long attachmentId) {
        var rows = jdbcTemplate.query(
            """
                SELECT id,
                       original_filename,
                       mime_type,
                       size_bytes,
                       object_key,
                       created_at
                FROM hr_employee_record_attachments
                WHERE company_id = ?
                  AND record_id = ?
                  AND id = ?
                  AND deleted_at IS NULL
                """,
            (rs, rowNum) -> mapAttachmentRow(rs),
            companyId,
            recordId,
            attachmentId
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Attachment not found.");
        }

        return rows.getFirst();
    }

    private Map<String, Object> mapAttachmentRow(ResultSet rs) throws SQLException {
        var attachment = new LinkedHashMap<String, Object>();
        attachment.put("id", rs.getLong("id"));
        attachment.put("original_filename", safe(rs.getString("original_filename")));
        attachment.put("mime_type", safe(rs.getString("mime_type")));
        attachment.put("size_bytes", rs.getLong("size_bytes"));
        attachment.put("object_key", safe(rs.getString("object_key")));
        attachment.put("download_url", signedAttachmentUrl(safe(rs.getString("object_key"))));
        attachment.put("created_at", toIsoString(asLocalDateTime(rs.getTimestamp("created_at"))));
        return attachment;
    }

    private List<Map<String, Object>> loadActivity(long recordId) {
        return jdbcTemplate.query(
            """
                SELECT id,
                       activity_type,
                       from_status,
                       to_status,
                       note,
                       actor_user_id,
                       actor_name_snapshot,
                       created_at
                FROM hr_employee_record_activity
                WHERE record_id = ?
                ORDER BY created_at DESC, id DESC
                """,
            (rs, rowNum) -> {
                var activity = new LinkedHashMap<String, Object>();
                activity.put("id", rs.getLong("id"));
                activity.put("activity_type", safe(rs.getString("activity_type")));
                activity.put("from_status", nullable(normalizeStatusNullable(rs.getString("from_status"))));
                activity.put("to_status", nullable(normalizeStatusNullable(rs.getString("to_status"))));
                activity.put("note", safe(rs.getString("note")));
                activity.put("actor_user_id", rs.getLong("actor_user_id"));
                activity.put("actor_name", safe(rs.getString("actor_name_snapshot")));
                activity.put("created_at", toIsoString(asLocalDateTime(rs.getTimestamp("created_at"))));
                return activity;
            },
            recordId
        );
    }

    private String generateRecordNumber(long recordId) {
        return "REC-" + String.format(Locale.ROOT, "%06d", recordId);
    }

    private String normalizeRecordType(String value) {
        var normalized = safe(value).trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "incident", "incidente" -> "incident";
            case "warning", "advertencia" -> "warning";
            case "recognition", "reconocimiento" -> "recognition";
            case "observation", "observacion", "observación" -> "observation";
            case "training", "capacitacion", "capacitación" -> "training";
            default -> throw new IllegalArgumentException("Unsupported record type.");
        };
    }

    private String normalizeSeverity(String value) {
        var normalized = safe(value).trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "low", "baja" -> "low";
            case "medium", "media" -> "medium";
            case "high", "alta" -> "high";
            default -> throw new IllegalArgumentException("Unsupported severity.");
        };
    }

    private String normalizeSeverityNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return normalizeSeverity(value);
    }

    private String normalizeStatus(String value) {
        var normalized = safe(value).trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "pending", "pendiente" -> "pending";
            case "reviewed", "revisado" -> "reviewed";
            case "resolved", "resuelto" -> "resolved";
            case "" -> "pending";
            default -> throw new IllegalArgumentException("Unsupported record status.");
        };
    }

    private String normalizeStatusNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return normalizeStatus(value);
    }

    private boolean requiresSeverity(String type) {
        return "incident".equals(type) || "warning".equals(type);
    }

    private String normalizeAttachmentContentType(String value) {
        var normalized = safe(value).trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "application/pdf" -> "application/pdf";
            case "image/png" -> "image/png";
            case "image/jpeg", "image/jpg" -> "image/jpeg";
            case "application/msword" -> "application/msword";
            case "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ->
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            default -> throw new IllegalArgumentException("Unsupported attachment type.");
        };
    }

    private String normalizeOriginalFileName(String value) {
        var normalized = value == null ? "" : value.trim();
        if (normalized.isBlank()) {
            throw new IllegalArgumentException("file_name is required.");
        }
        return normalized.length() > 255 ? normalized.substring(0, 255) : normalized;
    }

    private String buildAttachmentObjectKey(long companyId, long recordId, String originalFileName, String contentType) {
        return "hr/records/"
            + companyId
            + "/"
            + recordId
            + "/attachments/"
            + UUID.randomUUID().toString().replace("-", "")
            + "-"
            + sanitizeFileNameStem(originalFileName)
            + extensionForAttachmentContentType(contentType);
    }

    private String normalizeAttachmentObjectKey(long companyId, long recordId, String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            throw new IllegalArgumentException("object_key is required.");
        }

        var normalized = objectKey.trim();
        var expectedPrefix = "hr/records/" + companyId + "/" + recordId + "/attachments/";
        if (!normalized.startsWith(expectedPrefix)) {
            throw new IllegalArgumentException("object_key must match the expected record attachment upload prefix.");
        }
        return normalized;
    }

    private String extensionForAttachmentContentType(String contentType) {
        return switch (contentType) {
            case "application/pdf" -> ".pdf";
            case "image/png" -> ".png";
            case "image/jpeg" -> ".jpg";
            case "application/msword" -> ".doc";
            case "application/vnd.openxmlformats-officedocument.wordprocessingml.document" -> ".docx";
            default -> ".bin";
        };
    }

    private String sanitizeFileNameStem(String originalFileName) {
        var dotIndex = originalFileName.lastIndexOf('.');
        var stem = dotIndex > 0 ? originalFileName.substring(0, dotIndex) : originalFileName;
        var normalized = Normalizer.normalize(stem, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .replaceAll("[^A-Za-z0-9_-]+", "-")
            .replaceAll("-{2,}", "-")
            .replaceAll("^-|-$", "")
            .toLowerCase(Locale.ROOT);
        if (normalized.isBlank()) {
            return "attachment";
        }
        var bytes = normalized.getBytes(StandardCharsets.UTF_8);
        if (bytes.length <= 60) {
            return normalized;
        }
        return new String(bytes, 0, 60, StandardCharsets.UTF_8).replaceAll("-+$", "");
    }

    private String normalizeRequiredText(String value, String fieldName, int maxLength) {
        var normalized = safe(value).trim();
        if (normalized.isBlank()) {
            throw new IllegalArgumentException(fieldName + " is required.");
        }
        return truncateText(normalized, maxLength);
    }

    private String normalizeOptionalText(String value, int maxLength) {
        var normalized = safe(value).trim();
        if (normalized.isBlank()) {
            return null;
        }
        return truncateText(normalized, maxLength);
    }

    private String truncateText(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    private LocalDateTime parseFlexibleDateTime(Map<String, Object> payload, String... keys) {
        var raw = stringValue(payload, keys);
        if (raw.isBlank()) {
            return null;
        }

        try {
            return LocalDateTime.parse(raw);
        } catch (DateTimeParseException ignored) {
            try {
                return LocalDate.parse(raw).atStartOfDay();
            } catch (DateTimeParseException ex) {
                throw new IllegalArgumentException(keys[0] + " must use YYYY-MM-DD or ISO local date-time format.");
            }
        }
    }

    private LocalDate parseFlexibleDate(Map<String, Object> payload, String... keys) {
        var raw = stringValue(payload, keys);
        if (raw.isBlank()) {
            return null;
        }

        try {
            return LocalDate.parse(raw);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException(keys[0] + " must use YYYY-MM-DD format.");
        }
    }

    private int parsePage(Map<String, Object> filters) {
        var page = parseLong(filters, "page");
        return page == null || page < 1 ? 1 : page.intValue();
    }

    private int parseSize(Map<String, Object> filters) {
        var size = parseLong(filters, "size");
        var resolved = size == null ? DEFAULT_PAGE_SIZE : size.intValue();
        if (resolved < 1 || resolved > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("size must be between 1 and " + MAX_PAGE_SIZE + ".");
        }
        return resolved;
    }

    private Object[] withPaging(List<Object> params, int size, int offset) {
        var values = new ArrayList<>(params);
        values.add(size);
        values.add(offset);
        return values.toArray();
    }

    private Long nullableLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return null;
    }

    private Long toLong(Object value, String fieldName) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String string && !string.isBlank()) {
            try {
                return Long.parseLong(string.trim());
            } catch (NumberFormatException ex) {
                throw new IllegalArgumentException(fieldName + " must be numeric.");
            }
        }
        return null;
    }

    private String toTrimmedString(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private String signedAttachmentUrl(String objectKey) {
        if (objectKey == null || objectKey.isBlank() || !objectStorageService.isEnabled()) {
            return null;
        }

        return objectStorageService.presignDownload(
            documentsBucket(),
            objectKey,
            objectStorageProperties.getMinio().getPresignExpirySeconds()
        );
    }

    private void deleteAttachmentObjectQuietly(String objectKey) {
        if (objectKey == null || objectKey.isBlank() || !objectStorageService.isEnabled()) {
            return;
        }

        try {
            objectStorageService.deleteObject(documentsBucket(), objectKey);
        } catch (RuntimeException ignored) {
            // Attachment metadata deletion should not fail because the object is already missing.
        }
    }

    private String documentsBucket() {
        return objectStorageProperties.getMinio().getBucketDocuments();
    }

    private LocalDateTime asLocalDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }

    private String toIsoString(LocalDateTime value) {
        return value == null ? null : value.toString();
    }

    private void setNullableLong(java.sql.PreparedStatement statement, int index, Long value) throws SQLException {
        if (value == null) {
            statement.setNull(index, Types.BIGINT);
        } else {
            statement.setLong(index, value);
        }
    }

    private Map<String, Object> defaultSummary() {
        return Map.of(
            "total_count", 0,
            "pending_count", 0,
            "reviewed_count", 0,
            "resolved_count", 0,
            "high_severity_count", 0
        );
    }

    private record RecordListQuery(String whereClause, List<Object> params) {
    }

    private record RecordDraft(
        EmployeeSnapshot employeeSnapshot,
        String recordType,
        String severity,
        String status,
        String title,
        String description,
        String actionsTaken,
        LocalDateTime eventDate,
        Long reportedByEmployeeId,
        String reportedByName,
        List<WitnessDraft> witnesses
    ) {
    }

    private record EmployeeSnapshot(
        long employeeId,
        String employeeName,
        String position,
        String department,
        Long unitId,
        String unitName,
        Long businessId,
        String businessName
    ) {
    }

    private record WitnessDraft(Long employeeId, String name) {
    }

    private record ActorRef(long userId, String actorName, Long linkedEmployeeId) {
    }

    private record RecordState(long recordId, String status) {
    }

    private record AttachmentRef(long attachmentId, String objectKey, String fileName) {
    }
}
