package com.indice.erp.hr.announcements;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AnnReadSvc {

    private final JdbcTemplate jdbcTemplate;
    private final AnnVisSvc visSvc;

    public AnnReadSvc(JdbcTemplate jdbcTemplate, AnnVisSvc visSvc) {
        this.jdbcTemplate = jdbcTemplate;
        this.visSvc = visSvc;
    }

    @Transactional
    public Map<String, Object> markRead(HrAnnouncementActor actor, long announcementId) {
        visSvc.requireVisible(actor, announcementId);
        jdbcTemplate.update(
            """
                INSERT INTO hr_announcement_reads
                (company_id, announcement_id, user_company_id, user_id)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE read_at = read_at
                """,
            actor.companyId(),
            announcementId,
            actor.userCompanyId(),
            actor.userId()
        );
        jdbcTemplate.update(
            """
                UPDATE hr_announcement_deliveries
                SET status = 'read',
                    read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
                WHERE company_id = ?
                  AND announcement_id = ?
                  AND user_company_id = ?
                """,
            actor.companyId(),
            announcementId,
            actor.userCompanyId()
        );
        var readAt = jdbcTemplate.queryForObject(
            """
                SELECT read_at
                FROM hr_announcement_reads
                WHERE company_id = ?
                  AND announcement_id = ?
                  AND user_company_id = ?
                """,
            (rs, rowNum) -> rs.getTimestamp("read_at").toLocalDateTime().toString(),
            actor.companyId(),
            announcementId,
            actor.userCompanyId()
        );
        var body = new LinkedHashMap<String, Object>();
        body.put("announcement_id", announcementId);
        body.put("read_at", readAt);
        return body;
    }
}
