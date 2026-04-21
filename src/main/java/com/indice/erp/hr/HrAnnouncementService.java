package com.indice.erp.hr;

import static com.indice.erp.hr.HrPayloadUtils.longList;
import static com.indice.erp.hr.HrPayloadUtils.nullable;
import static com.indice.erp.hr.HrPayloadUtils.parseDateTime;
import static com.indice.erp.hr.HrPayloadUtils.stringList;
import static com.indice.erp.hr.HrPayloadUtils.stringValue;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;

@Service
public class HrAnnouncementService {

    private final JdbcTemplate jdbcTemplate;

    public HrAnnouncementService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> listAnnouncements(long companyId) {
        publishDueAnnouncements();

        var announcements = jdbcTemplate.query(
            """
                SELECT a.id,
                       a.title,
                       a.announcement_type,
                       a.audience_type,
                       a.status,
                       a.scheduled_for,
                       a.published_at,
                       a.created_at,
                       a.content,
                       COALESCE(NULLIF(u.full_name, ''), 'RH Central') AS author_name
                FROM hr_announcements a
                LEFT JOIN users u ON u.id = a.created_by
                WHERE a.company_id = ?
                ORDER BY COALESCE(a.published_at, a.scheduled_for, a.created_at) DESC, a.id DESC
                """,
            (rs, rowNum) -> new AnnouncementRow(
                rs.getLong("id"),
                rs.getString("title"),
                rs.getString("announcement_type"),
                rs.getString("audience_type"),
                rs.getString("status"),
                toLocalDateTime(rs.getTimestamp("scheduled_for")),
                toLocalDateTime(rs.getTimestamp("published_at")),
                toLocalDateTime(rs.getTimestamp("created_at")),
                rs.getString("content"),
                rs.getString("author_name")
            ),
            companyId
        );

        var targetsByAnnouncement = loadTargetsByAnnouncement(companyId, announcements.stream().map(AnnouncementRow::id).toList());

        int publishedCount = 0;
        int scheduledCount = 0;
        int draftCount = 0;
        var items = new ArrayList<Map<String, Object>>();
        for (var announcement : announcements) {
            switch (normalizeStatus(announcement.status())) {
                case "published" -> publishedCount++;
                case "scheduled" -> scheduledCount++;
                default -> draftCount++;
            }

            var item = new LinkedHashMap<String, Object>();
            item.put("id", announcement.id());
            item.put("title", announcement.title());
            item.put("type", normalizeType(announcement.type()));
            item.put("audience_type", normalizeAudienceType(announcement.audienceType()));
            item.put("audience_summary", buildAudienceSummary(normalizeAudienceType(announcement.audienceType()), targetsByAnnouncement.getOrDefault(announcement.id(), List.of())));
            item.put("status", normalizeStatus(announcement.status()));
            item.put("scheduled_for", toIsoString(announcement.scheduledFor()));
            item.put("published_at", toIsoString(announcement.publishedAt()));
            item.put("created_at", toIsoString(announcement.createdAt()));
            item.put("author_name", announcement.authorName());
            item.put("content", announcement.content());
            items.add(item);
        }

        var summary = new LinkedHashMap<String, Object>();
        summary.put("total_count", announcements.size());
        summary.put("published_count", publishedCount);
        summary.put("scheduled_count", scheduledCount);
        summary.put("draft_count", draftCount);

        var body = new LinkedHashMap<String, Object>();
        body.put("items", items);
        body.put("summary", summary);
        return body;
    }

    public Map<String, Object> createAnnouncement(long companyId, long userId, Map<String, Object> payload) {
        var title = stringValue(payload, "title", "titulo");
        var type = normalizeType(stringValue(payload, "type", "tipo"));
        var content = stringValue(payload, "content", "contenido");
        var audienceType = normalizeAudienceType(stringValue(payload, "audience_type", "destinatarios"));
        var status = determineStatus(payload);
        var scheduledFor = parseDateTime(payload, "scheduled_for");

        if (title.isBlank() || content.isBlank()) {
            throw new IllegalArgumentException("title and content are required.");
        }
        if ("scheduled".equals(status) && scheduledFor == null) {
            throw new IllegalArgumentException("scheduled_for is required when status is scheduled.");
        }

        var targets = normalizeTargets(audienceType, payload);

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO hr_announcements
                    (company_id, title, announcement_type, content, audience_type, status, scheduled_for, published_at, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                new String[] {"id"}
            );
            statement.setLong(1, companyId);
            statement.setString(2, title);
            statement.setString(3, type);
            statement.setString(4, content);
            statement.setString(5, audienceType);
            statement.setString(6, status);
            statement.setTimestamp(7, scheduledFor == null ? null : Timestamp.valueOf(scheduledFor));
            statement.setTimestamp(8, "published".equals(status) ? Timestamp.valueOf(LocalDateTime.now()) : null);
            statement.setLong(9, userId);
            return statement;
        }, keyHolder);

        var announcementId = keyHolder.getKey() != null ? keyHolder.getKey().longValue() : 0L;
        persistTargets(announcementId, targets);

        return loadAnnouncement(companyId, announcementId);
    }

    public int publishDueAnnouncements() {
        return jdbcTemplate.update(
            """
                UPDATE hr_announcements
                SET status = 'published',
                    published_at = COALESCE(published_at, CURRENT_TIMESTAMP)
                WHERE LOWER(COALESCE(status, 'draft')) = 'scheduled'
                  AND scheduled_for IS NOT NULL
                  AND scheduled_for <= CURRENT_TIMESTAMP
                """
        );
    }

    private Map<String, List<String>> normalizeTargets(String audienceType, Map<String, Object> payload) {
        var result = new HashMap<String, List<String>>();
        switch (audienceType) {
            case "all" -> {
                return result;
            }
            case "units" -> {
                var values = stringList(payload, "unit_ids", "units", "unidades");
                if (values.isEmpty()) {
                    throw new IllegalArgumentException("At least one unit target is required.");
                }
                result.put("unit", values);
                return result;
            }
            case "departments" -> {
                var values = stringList(payload, "department_names", "departments", "departamentos");
                if (values.isEmpty()) {
                    throw new IllegalArgumentException("At least one department target is required.");
                }
                result.put("department", values);
                return result;
            }
            case "employees" -> {
                var values = longList(payload, "employee_ids", "employees", "colaboradoresEspecificos").stream()
                    .map(String::valueOf)
                    .toList();
                if (values.isEmpty()) {
                    throw new IllegalArgumentException("At least one employee target is required.");
                }
                result.put("employee", values);
                return result;
            }
            default -> throw new IllegalArgumentException("Unsupported audience type.");
        }
    }

    private void persistTargets(long announcementId, Map<String, List<String>> targets) {
        for (var entry : targets.entrySet()) {
            for (var value : entry.getValue()) {
                jdbcTemplate.update(
                    """
                        INSERT INTO hr_announcement_targets
                        (announcement_id, target_type, target_value)
                        VALUES (?, ?, ?)
                        """,
                    announcementId,
                    entry.getKey(),
                    value
                );
            }
        }
    }

    private Map<Long, List<TargetRow>> loadTargetsByAnnouncement(long companyId, List<Long> announcementIds) {
        if (announcementIds.isEmpty()) {
            return Map.of();
        }

        var placeholders = announcementIds.stream().map(id -> "?").collect(Collectors.joining(","));
        var parameters = new ArrayList<Object>();
        parameters.add(companyId);
        parameters.addAll(announcementIds);

        var query = """
                SELECT t.announcement_id,
                       t.target_type,
                       t.target_value
                FROM hr_announcement_targets t
                JOIN hr_announcements a ON a.id = t.announcement_id
                WHERE a.company_id = ?
                  AND t.announcement_id IN (%s)
            """.formatted(placeholders);

        var rows = jdbcTemplate.query(
            query,
            (rs, rowNum) -> new TargetRow(
                rs.getLong("announcement_id"),
                rs.getString("target_type"),
                rs.getString("target_value")
            ),
            parameters.toArray()
        );

        var result = new HashMap<Long, List<TargetRow>>();
        for (var row : rows) {
            result.computeIfAbsent(row.announcementId(), ignored -> new ArrayList<>()).add(row);
        }
        return result;
    }

    private Map<String, Object> loadAnnouncement(long companyId, long announcementId) {
        var items = listAnnouncements(companyId);
        @SuppressWarnings("unchecked")
        var announcementItems = (List<Map<String, Object>>) items.get("items");
        return announcementItems.stream()
            .filter(item -> ((Number) item.get("id")).longValue() == announcementId)
            .findFirst()
            .orElseThrow(() -> new NoSuchElementException("Announcement not found."));
    }

    private String buildAudienceSummary(String audienceType, List<TargetRow> targets) {
        return switch (audienceType) {
            case "all" -> "Todo el personal";
            case "units" -> buildUnitSummary(targets);
            case "departments" -> targets.stream()
                .map(TargetRow::targetValue)
                .map(value -> value.replace('_', ' '))
                .collect(Collectors.joining(", "));
            case "employees" -> targets.isEmpty()
                ? "Sin destinatarios"
                : targets.size() == 1
                    ? "1 colaborador"
                    : targets.size() + " colaboradores";
            default -> "Segmentado";
        };
    }

    private String buildUnitSummary(List<TargetRow> targets) {
        if (targets.isEmpty()) {
            return "Sin unidades";
        }

        var unitIds = targets.stream()
            .map(TargetRow::targetValue)
            .filter(value -> !value.isBlank())
            .toList();
        if (unitIds.isEmpty()) {
            return "Sin unidades";
        }

        var placeholders = unitIds.stream().map(value -> "?").collect(Collectors.joining(","));
        var query = """
                SELECT name
                FROM units
                WHERE id IN (%s)
                ORDER BY name ASC
            """.formatted(placeholders);

        var names = jdbcTemplate.query(
            query,
            (rs, rowNum) -> rs.getString("name"),
            unitIds.toArray()
        );

        return names.isEmpty() ? "Unidades seleccionadas" : String.join(", ", names);
    }

    private String determineStatus(Map<String, Object> payload) {
        var explicitStatus = stringValue(payload, "status", "estado");
        if (!explicitStatus.isBlank()) {
            return normalizeStatus(explicitStatus);
        }

        var publicationType = stringValue(payload, "publicacionTipo", "publication_type");
        return "programado".equalsIgnoreCase(publicationType) || "scheduled".equalsIgnoreCase(publicationType)
            ? "scheduled"
            : "published";
    }

    private String normalizeStatus(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "publicado", "published" -> "published";
            case "programado", "scheduled" -> "scheduled";
            case "borrador", "draft" -> "draft";
            default -> throw new IllegalArgumentException("Unsupported announcement status.");
        };
    }

    private String normalizeType(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "general" -> "general";
            case "urgente", "urgent" -> "urgent";
            case "recordatorio", "reminder" -> "reminder";
            case "celebracion", "celebration" -> "celebration";
            default -> throw new IllegalArgumentException("Unsupported announcement type.");
        };
    }

    private String normalizeAudienceType(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "todos", "all", "todo_el_personal" -> "all";
            case "por-unidad", "units", "unit", "unidades" -> "units";
            case "por-departamento", "departments", "department", "departamentos" -> "departments";
            case "especificos", "employees", "employee", "colaboradores_especificos" -> "employees";
            default -> throw new IllegalArgumentException("Unsupported audience type.");
        };
    }

    private LocalDateTime toLocalDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }

    private String toIsoString(LocalDateTime value) {
        return value == null ? null : value.toString();
    }

    private record AnnouncementRow(
        long id,
        String title,
        String type,
        String audienceType,
        String status,
        LocalDateTime scheduledFor,
        LocalDateTime publishedAt,
        LocalDateTime createdAt,
        String content,
        String authorName
    ) {
    }

    private record TargetRow(
        long announcementId,
        String targetType,
        String targetValue
    ) {
    }
}
