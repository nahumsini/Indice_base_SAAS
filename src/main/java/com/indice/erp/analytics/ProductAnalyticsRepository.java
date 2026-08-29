package com.indice.erp.analytics;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ProductAnalyticsRepository {

    private final JdbcTemplate jdbc;

    public ProductAnalyticsRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void touchSession(SessionIdentity identity, SessionMetadata metadata, Instant now) {
        var updated = jdbc.update(
            """
                UPDATE product_analytics_sessions
                SET locale = ?, device_type = ?, last_seen_at = ?, updated_at = ?
                WHERE session_key = ? AND surface = ?
                  AND ((user_id IS NULL AND ? IS NULL) OR user_id = ?)
                  AND ((company_id IS NULL AND ? IS NULL) OR company_id = ?)
                  AND ((visitor_key_hash IS NULL AND ? IS NULL) OR visitor_key_hash = ?)
                """,
            metadata.locale(), metadata.deviceType(), Timestamp.from(now), Timestamp.from(now),
            identity.sessionKey(), identity.surface(),
            identity.userId(), identity.userId(),
            identity.companyId(), identity.companyId(),
            identity.visitorKeyHash(), identity.visitorKeyHash()
        );
        if (updated > 0) return;

        try {
            jdbc.update(
                """
                    INSERT INTO product_analytics_sessions (
                        session_key, surface, company_id, user_id, visitor_key_hash,
                        locale, device_type, source_name, medium_name, campaign_name,
                        referrer_host, started_at, last_seen_at, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                identity.sessionKey(), identity.surface(), identity.companyId(), identity.userId(),
                identity.visitorKeyHash(), metadata.locale(), metadata.deviceType(),
                metadata.source(), metadata.medium(), metadata.campaign(), metadata.referrerHost(),
                Timestamp.from(now), Timestamp.from(now), Timestamp.from(now), Timestamp.from(now)
            );
        } catch (DuplicateKeyException collision) {
            throw new IllegalArgumentException("The analytics session belongs to a different identity.");
        }
    }

    public void observe(
        String sessionKey,
        LocalDate usageDate,
        String routeKey,
        String sectionKey,
        int views,
        int activeSeconds,
        int interactions,
        int conversions,
        Instant now
    ) {
        jdbc.update(
            """
                INSERT INTO product_analytics_page_usage (
                    session_key, usage_date, route_key, section_key,
                    view_count, active_seconds, interaction_count, conversion_count,
                    first_observed_at, last_observed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    view_count = view_count + VALUES(view_count),
                    active_seconds = LEAST(86400, active_seconds + VALUES(active_seconds)),
                    interaction_count = interaction_count + VALUES(interaction_count),
                    conversion_count = conversion_count + VALUES(conversion_count),
                    last_observed_at = VALUES(last_observed_at)
                """,
            sessionKey, Date.valueOf(usageDate), routeKey, sectionKey,
            views, activeSeconds, interactions, conversions,
            Timestamp.from(now), Timestamp.from(now)
        );
    }

    public Map<String, Object> appSummary(LocalDate from, LocalDate to, Long companyId) {
        return jdbc.queryForObject(
            """
                SELECT COUNT(DISTINCT page_usage.session_key) AS sessions,
                       COUNT(DISTINCT analytics_session.user_id) AS active_users,
                       COUNT(DISTINCT analytics_session.company_id) AS active_companies,
                       COALESCE(SUM(page_usage.view_count), 0) AS views,
                       COALESCE(SUM(page_usage.active_seconds), 0) AS active_seconds,
                       COALESCE(SUM(page_usage.interaction_count), 0) AS interactions
                FROM product_analytics_page_usage page_usage
                JOIN product_analytics_sessions analytics_session
                  ON analytics_session.session_key = page_usage.session_key
                WHERE analytics_session.surface = 'APP'
                  AND page_usage.usage_date BETWEEN ? AND ?
                  AND (? IS NULL OR analytics_session.company_id = ?)
                """,
            (rs, rowNum) -> map(
                "sessions", rs.getLong("sessions"),
                "active_users", rs.getLong("active_users"),
                "active_companies", rs.getLong("active_companies"),
                "views", rs.getLong("views"),
                "active_seconds", rs.getLong("active_seconds"),
                "interactions", rs.getLong("interactions")
            ),
            Date.valueOf(from), Date.valueOf(to), companyId, companyId
        );
    }

    public Map<String, Object> webSummary(LocalDate from, LocalDate to) {
        return jdbc.queryForObject(
            """
                SELECT COUNT(DISTINCT page_usage.session_key) AS sessions,
                       COUNT(DISTINCT analytics_session.visitor_key_hash) AS visitors,
                       COALESCE(SUM(page_usage.view_count), 0) AS views,
                       COALESCE(SUM(page_usage.active_seconds), 0) AS active_seconds,
                       COALESCE(SUM(page_usage.interaction_count), 0) AS interactions,
                       COALESCE(SUM(page_usage.conversion_count), 0) AS conversions
                FROM product_analytics_page_usage page_usage
                JOIN product_analytics_sessions analytics_session
                  ON analytics_session.session_key = page_usage.session_key
                WHERE analytics_session.surface = 'WEB'
                  AND page_usage.usage_date BETWEEN ? AND ?
                """,
            (rs, rowNum) -> map(
                "sessions", rs.getLong("sessions"),
                "visitors", rs.getLong("visitors"),
                "views", rs.getLong("views"),
                "active_seconds", rs.getLong("active_seconds"),
                "interactions", rs.getLong("interactions"),
                "conversions", rs.getLong("conversions")
            ),
            Date.valueOf(from), Date.valueOf(to)
        );
    }

    public List<Map<String, Object>> dailyTrend(LocalDate from, LocalDate to, Long companyId) {
        return jdbc.query(
            """
                SELECT page_usage.usage_date,
                       COUNT(DISTINCT CASE WHEN analytics_session.surface = 'APP' THEN analytics_session.user_id END) AS app_users,
                       COUNT(DISTINCT CASE WHEN analytics_session.surface = 'APP' THEN page_usage.session_key END) AS app_sessions,
                       COUNT(DISTINCT CASE WHEN analytics_session.surface = 'WEB' THEN analytics_session.visitor_key_hash END) AS web_visitors,
                       COUNT(DISTINCT CASE WHEN analytics_session.surface = 'WEB' THEN page_usage.session_key END) AS web_sessions,
                       COALESCE(SUM(CASE WHEN analytics_session.surface = 'APP' THEN page_usage.active_seconds ELSE 0 END), 0) AS app_active_seconds,
                       COALESCE(SUM(CASE WHEN analytics_session.surface = 'WEB' THEN page_usage.active_seconds ELSE 0 END), 0) AS web_active_seconds
                FROM product_analytics_page_usage page_usage
                JOIN product_analytics_sessions analytics_session
                  ON analytics_session.session_key = page_usage.session_key
                WHERE page_usage.usage_date BETWEEN ? AND ?
                  AND (analytics_session.surface = 'WEB' OR ? IS NULL OR analytics_session.company_id = ?)
                GROUP BY page_usage.usage_date
                ORDER BY page_usage.usage_date
                """,
            (rs, rowNum) -> map(
                "date", rs.getDate("usage_date").toLocalDate().toString(),
                "app_users", rs.getLong("app_users"),
                "app_sessions", rs.getLong("app_sessions"),
                "web_visitors", rs.getLong("web_visitors"),
                "web_sessions", rs.getLong("web_sessions"),
                "app_active_seconds", rs.getLong("app_active_seconds"),
                "web_active_seconds", rs.getLong("web_active_seconds")
            ),
            Date.valueOf(from), Date.valueOf(to), companyId, companyId
        );
    }

    public List<Map<String, Object>> topPages(String surface, LocalDate from, LocalDate to, Long companyId) {
        return jdbc.query(
            """
                SELECT page_usage.route_key, page_usage.section_key,
                       COUNT(DISTINCT page_usage.session_key) AS sessions,
                       COUNT(DISTINCT analytics_session.user_id) AS users,
                       COALESCE(SUM(page_usage.view_count), 0) AS views,
                       COALESCE(SUM(page_usage.active_seconds), 0) AS active_seconds,
                       COALESCE(SUM(page_usage.interaction_count), 0) AS interactions,
                       COALESCE(SUM(page_usage.conversion_count), 0) AS conversions
                FROM product_analytics_page_usage page_usage
                JOIN product_analytics_sessions analytics_session
                  ON analytics_session.session_key = page_usage.session_key
                WHERE analytics_session.surface = ?
                  AND page_usage.usage_date BETWEEN ? AND ?
                  AND (? IS NULL OR analytics_session.surface = 'WEB' OR analytics_session.company_id = ?)
                GROUP BY page_usage.route_key, page_usage.section_key
                ORDER BY active_seconds DESC, views DESC, page_usage.route_key
                LIMIT 30
                """,
            (rs, rowNum) -> map(
                "route", rs.getString("route_key"),
                "section", rs.getString("section_key"),
                "sessions", rs.getLong("sessions"),
                "users", rs.getLong("users"),
                "views", rs.getLong("views"),
                "active_seconds", rs.getLong("active_seconds"),
                "interactions", rs.getLong("interactions"),
                "conversions", rs.getLong("conversions")
            ),
            surface, Date.valueOf(from), Date.valueOf(to), companyId, companyId
        );
    }

    public List<Map<String, Object>> companyAdoption(LocalDate from, LocalDate to, Long companyId) {
        return jdbc.query(
            """
                SELECT analytics_session.company_id, company.name AS company_name,
                       COUNT(DISTINCT analytics_session.user_id) AS active_users,
                       COUNT(DISTINCT page_usage.session_key) AS sessions,
                       COALESCE(SUM(page_usage.view_count), 0) AS views,
                       COALESCE(SUM(page_usage.active_seconds), 0) AS active_seconds,
                       MAX(page_usage.last_observed_at) AS last_seen_at
                FROM product_analytics_page_usage page_usage
                JOIN product_analytics_sessions analytics_session
                  ON analytics_session.session_key = page_usage.session_key
                JOIN companies company ON company.id = analytics_session.company_id
                WHERE analytics_session.surface = 'APP'
                  AND page_usage.usage_date BETWEEN ? AND ?
                  AND (? IS NULL OR analytics_session.company_id = ?)
                GROUP BY analytics_session.company_id, company.name
                ORDER BY active_users DESC, active_seconds DESC, company.name
                LIMIT 100
                """,
            (rs, rowNum) -> map(
                "company_id", rs.getLong("company_id"),
                "company_name", rs.getString("company_name"),
                "active_users", rs.getLong("active_users"),
                "sessions", rs.getLong("sessions"),
                "views", rs.getLong("views"),
                "active_seconds", rs.getLong("active_seconds"),
                "last_seen_at", rs.getTimestamp("last_seen_at").toInstant().toString()
            ),
            Date.valueOf(from), Date.valueOf(to), companyId, companyId
        );
    }

    public List<Map<String, Object>> webSources(LocalDate from, LocalDate to) {
        return jdbc.query(
            """
                SELECT COALESCE(NULLIF(analytics_session.source_name, ''), 'direct') AS source_name,
                       COALESCE(NULLIF(analytics_session.medium_name, ''), 'none') AS medium_name,
                       COUNT(DISTINCT analytics_session.session_key) AS sessions,
                       COUNT(DISTINCT analytics_session.visitor_key_hash) AS visitors,
                       COALESCE(SUM(page_usage.conversion_count), 0) AS conversions
                FROM product_analytics_sessions analytics_session
                JOIN product_analytics_page_usage page_usage
                  ON page_usage.session_key = analytics_session.session_key
                WHERE analytics_session.surface = 'WEB'
                  AND page_usage.usage_date BETWEEN ? AND ?
                GROUP BY COALESCE(NULLIF(analytics_session.source_name, ''), 'direct'),
                         COALESCE(NULLIF(analytics_session.medium_name, ''), 'none')
                ORDER BY sessions DESC, source_name
                LIMIT 20
                """,
            (rs, rowNum) -> map(
                "source", rs.getString("source_name"),
                "medium", rs.getString("medium_name"),
                "sessions", rs.getLong("sessions"),
                "visitors", rs.getLong("visitors"),
                "conversions", rs.getLong("conversions")
            ),
            Date.valueOf(from), Date.valueOf(to)
        );
    }

    public List<Map<String, Object>> companyOptions() {
        return jdbc.query(
            """
                SELECT id, name
                FROM companies
                WHERE deleted_at IS NULL
                ORDER BY name
                LIMIT 500
                """,
            (rs, rowNum) -> map("id", rs.getLong("id"), "name", rs.getString("name"))
        );
    }

    public String dataSince() {
        return jdbc.queryForObject(
            "SELECT CAST(MIN(usage_date) AS CHAR) FROM product_analytics_page_usage",
            String.class
        );
    }

    private static Map<String, Object> map(Object... values) {
        var result = new LinkedHashMap<String, Object>();
        for (var index = 0; index < values.length; index += 2) {
            result.put(String.valueOf(values[index]), values[index + 1]);
        }
        return result;
    }

    public record SessionIdentity(
        String sessionKey,
        String surface,
        Long companyId,
        Long userId,
        String visitorKeyHash
    ) {
    }

    public record SessionMetadata(
        String locale,
        String deviceType,
        String source,
        String medium,
        String campaign,
        String referrerHost
    ) {
    }
}
