package com.indice.erp.hr.announcements;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class HrAnnouncementTargetRepository {

    private final JdbcTemplate jdbcTemplate;

    public HrAnnouncementTargetRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void persistTargets(long announcementId, Map<String, List<String>> targets) {
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

    public void replaceTargets(long announcementId, Map<String, List<String>> targets) {
        jdbcTemplate.update("DELETE FROM hr_announcement_targets WHERE announcement_id = ?", announcementId);
        persistTargets(announcementId, targets);
    }

    public Map<Long, List<HrAnnouncementTargetRow>> loadByAnnouncement(long companyId, List<Long> announcementIds) {
        if (announcementIds.isEmpty()) {
            return Map.of();
        }

        var placeholders = announcementIds.stream().map(id -> "?").collect(Collectors.joining(","));
        var parameters = new ArrayList<Object>();
        parameters.add(companyId);
        parameters.addAll(announcementIds);
        var rows = jdbcTemplate.query(
            """
                SELECT t.announcement_id, t.target_type, t.target_value
                FROM hr_announcement_targets t
                JOIN hr_announcements a ON a.id = t.announcement_id
                WHERE a.company_id = ?
                  AND t.announcement_id IN (%s)
                """.formatted(placeholders),
            (rs, rowNum) -> new HrAnnouncementTargetRow(
                rs.getLong("announcement_id"),
                rs.getString("target_type"),
                rs.getString("target_value")
            ),
            parameters.toArray()
        );

        var result = new HashMap<Long, List<HrAnnouncementTargetRow>>();
        for (var row : rows) {
            result.computeIfAbsent(row.announcementId(), ignored -> new ArrayList<>()).add(row);
        }
        return result;
    }
}
