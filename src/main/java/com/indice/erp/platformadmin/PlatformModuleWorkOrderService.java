package com.indice.erp.platformadmin;

import java.sql.Statement;
import java.text.Normalizer;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlatformModuleWorkOrderService {

    private static final Set<String> SUPPORTED_LOCALES = Set.of(
        "en-CA", "en-US", "es-MX", "es-CO", "fr-CA", "pt-BR", "ko-CA", "zh-CA"
    );

    private final JdbcTemplate jdbc;
    private final PlatformAdminAccessService access;
    private final PlatformAuditService audit;

    public PlatformModuleWorkOrderService(
        JdbcTemplate jdbc,
        PlatformAdminAccessService access,
        PlatformAuditService audit
    ) {
        this.jdbc = jdbc;
        this.access = access;
        this.audit = audit;
    }

    public Map<String, Object> list(long actorUserId) {
        access.require(actorUserId, "PLATFORM_MODULES_VIEW");
        var workOrders = jdbc.query(
            """
                SELECT id, module_name, technical_name, module_slug, route_segment,
                       source_locale, status, created_at, updated_at
                FROM platform_module_work_orders
                WHERE status <> 'CANCELLED'
                ORDER BY created_at DESC, id DESC
                """,
            (rs, rowNum) -> row(
                rs.getLong("id"),
                rs.getString("module_name"),
                rs.getString("technical_name"),
                rs.getString("module_slug"),
                rs.getString("route_segment"),
                rs.getString("source_locale"),
                rs.getString("status"),
                rs.getTimestamp("created_at").toInstant().toString(),
                rs.getTimestamp("updated_at").toInstant().toString()
            )
        );
        return Map.of("work_orders", workOrders);
    }

    @Transactional
    public Map<String, Object> create(long actorUserId, CreateRequest request) {
        access.require(actorUserId, "PLATFORM_MODULES_WRITE");
        var moduleName = required(request == null ? null : request.moduleName(), "El nombre del módulo es obligatorio.");
        if (moduleName.length() < 3 || moduleName.length() > 120) {
            throw new IllegalArgumentException("El nombre del módulo debe tener entre 3 y 120 caracteres.");
        }
        var locale = required(request.sourceLocale(), "El idioma inicial es obligatorio.");
        if (!SUPPORTED_LOCALES.contains(locale)) {
            throw new IllegalArgumentException("El idioma inicial no forma parte de los idiomas operativos de Índice.");
        }
        var slug = uniqueSlug(slugify(moduleName));
        var technicalName = slug.replace('-', '_');
        var route = "/" + slug;
        var keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO platform_module_work_orders (
                        module_name, technical_name, module_slug, route_segment,
                        source_locale, status, created_by_user_id
                    ) VALUES (?, ?, ?, ?, ?, 'DRAFT', ?)
                    """,
                Statement.RETURN_GENERATED_KEYS
            );
            statement.setString(1, moduleName);
            statement.setString(2, technicalName);
            statement.setString(3, slug);
            statement.setString(4, route);
            statement.setString(5, locale);
            statement.setLong(6, actorUserId);
            return statement;
        }, keyHolder);
        var id = generatedId(keyHolder);
        var created = find(id);
        audit.record(
            actorUserId,
            "MODULE_WORK_ORDER_CREATED",
            "MODULE_WORK_ORDER",
            String.valueOf(id),
            null,
            "SUCCESS",
            Map.of("module_name", moduleName, "module_slug", slug, "source_locale", locale)
        );
        return created;
    }

    @Transactional
    public Map<String, Object> cancel(long actorUserId, long workOrderId) {
        access.require(actorUserId, "PLATFORM_MODULES_WRITE");
        var current = find(workOrderId);
        if (!"DRAFT".equals(current.get("status"))) {
            throw new IllegalStateException("Sólo una orden en borrador puede eliminarse.");
        }
        jdbc.update(
            "UPDATE platform_module_work_orders SET status = 'CANCELLED' WHERE id = ? AND status = 'DRAFT'",
            workOrderId
        );
        audit.record(
            actorUserId,
            "MODULE_WORK_ORDER_CANCELLED",
            "MODULE_WORK_ORDER",
            String.valueOf(workOrderId),
            null,
            "SUCCESS",
            Map.of("module_slug", current.get("slug"))
        );
        return Map.of("id", workOrderId, "status", "CANCELLED", "removed", true);
    }

    private Map<String, Object> find(long id) {
        var rows = jdbc.query(
            """
                SELECT id, module_name, technical_name, module_slug, route_segment,
                       source_locale, status, created_at, updated_at
                FROM platform_module_work_orders
                WHERE id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> row(
                rs.getLong("id"), rs.getString("module_name"), rs.getString("technical_name"),
                rs.getString("module_slug"), rs.getString("route_segment"), rs.getString("source_locale"),
                rs.getString("status"), rs.getTimestamp("created_at").toInstant().toString(),
                rs.getTimestamp("updated_at").toInstant().toString()
            ),
            id
        );
        if (rows.isEmpty()) throw new NoSuchElementException("No se encontró la orden de trabajo.");
        return rows.getFirst();
    }

    private Map<String, Object> row(
        long id,
        String moduleName,
        String technicalName,
        String slug,
        String routeSegment,
        String sourceLocale,
        String status,
        String createdAt,
        String updatedAt
    ) {
        var row = new LinkedHashMap<String, Object>();
        row.put("id", id);
        row.put("moduleName", moduleName);
        row.put("technicalName", technicalName);
        row.put("slug", slug);
        row.put("routeSegment", routeSegment);
        row.put("sourceLocale", sourceLocale);
        row.put("status", status);
        row.put("createdAt", createdAt);
        row.put("updatedAt", updatedAt);
        return row;
    }

    private String uniqueSlug(String base) {
        var candidate = base;
        var suffix = 2;
        while (Boolean.TRUE.equals(jdbc.queryForObject(
            "SELECT COUNT(*) > 0 FROM platform_module_work_orders WHERE module_slug = ?",
            Boolean.class,
            candidate
        ))) {
            candidate = base + "-" + suffix++;
        }
        return candidate;
    }

    private String slugify(String value) {
        var normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
            .replaceAll("\\p{M}+", "")
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("^-+|-+$", "");
        return normalized.isBlank() ? "module" : normalized;
    }

    private String required(String value, String message) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(message);
        return value.trim();
    }

    private long generatedId(GeneratedKeyHolder keyHolder) {
        var key = keyHolder.getKey();
        if (key == null) throw new IllegalStateException("No se pudo identificar la orden creada.");
        return key.longValue();
    }

    public record CreateRequest(String moduleName, String sourceLocale) {
    }
}
