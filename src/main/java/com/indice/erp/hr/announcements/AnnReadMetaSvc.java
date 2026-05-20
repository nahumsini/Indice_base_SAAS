package com.indice.erp.hr.announcements;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class AnnReadMetaSvc {

    private final JdbcTemplate jdbcTemplate;

    public AnnReadMetaSvc(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<Long, AnnStats> stats(long companyId, List<Long> announcementIds) {
        if (announcementIds.isEmpty()) {
            return Map.of();
        }
        var params = new ArrayList<Object>();
        params.add(companyId);
        params.addAll(announcementIds);
        var rows = jdbcTemplate.query(
            """
                SELECT announcement_id,
                       COUNT(*) AS delivery_count,
                       SUM(CASE WHEN read_at IS NULL THEN 0 ELSE 1 END) AS read_count
                FROM hr_announcement_deliveries
                WHERE company_id = ?
                  AND status <> 'cancelled'
                  AND announcement_id IN (%s)
                GROUP BY announcement_id
                """.formatted(placeholders(announcementIds.size())),
            (rs, rowNum) -> new AnnStats(
                rs.getLong("announcement_id"),
                rs.getInt("delivery_count"),
                rs.getInt("read_count")
            ),
            params.toArray()
        );
        var result = new HashMap<Long, AnnStats>();
        for (var row : rows) {
            result.put(row.announcementId(), row);
        }
        return result;
    }

    public Map<Long, String> reads(long companyId, long userCompanyId, List<Long> announcementIds) {
        if (announcementIds.isEmpty()) {
            return Map.of();
        }
        var params = new ArrayList<Object>();
        params.add(companyId);
        params.add(userCompanyId);
        params.addAll(announcementIds);
        var rows = jdbcTemplate.query(
            """
                SELECT announcement_id, read_at
                FROM hr_announcement_reads
                WHERE company_id = ?
                  AND user_company_id = ?
                  AND announcement_id IN (%s)
                """.formatted(placeholders(announcementIds.size())),
            (rs, rowNum) -> Map.entry(rs.getLong("announcement_id"), toText(rs.getTimestamp("read_at"))),
            params.toArray()
        );
        var result = new HashMap<Long, String>();
        for (var row : rows) {
            result.put(row.getKey(), row.getValue());
        }
        return result;
    }

    private String toText(Timestamp value) {
        return value == null ? null : value.toLocalDateTime().toString();
    }

    private String placeholders(int count) {
        return "?,".repeat(count).replaceAll(",$", "");
    }

    public record AnnStats(long announcementId, int deliveryCount, int readCount) {
    }
}
