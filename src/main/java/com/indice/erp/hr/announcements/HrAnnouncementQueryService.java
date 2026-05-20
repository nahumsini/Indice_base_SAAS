package com.indice.erp.hr.announcements;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class HrAnnouncementQueryService {

    private final JdbcTemplate jdbcTemplate;
    private final HrAnnouncementPublisher publisher;
    private final HrAnnouncementResponseFactory responseFactory;

    public HrAnnouncementQueryService(
        JdbcTemplate jdbcTemplate,
        HrAnnouncementPublisher publisher,
        HrAnnouncementResponseFactory responseFactory
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.publisher = publisher;
        this.responseFactory = responseFactory;
    }

    public Map<String, Object> list(HrAnnouncementActor actor) {
        publisher.publishDueAnnouncements();
        var rows = actor.managementAccess() ? loadAll(actor.companyId()) : loadVisible(actor);
        return responseFactory.listBody(actor.companyId(), rows, actor);
    }

    public Map<String, Object> loadOne(long companyId, long announcementId) {
        var rows = jdbcTemplate.query(
            baseSelect() + " WHERE a.company_id = ? AND a.id = ? AND a.deleted_at IS NULL",
            (rs, rowNum) -> HrAnnouncementRows.map(rs),
            companyId,
            announcementId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Announcement not found.");
        }
        return responseFactory.itemBody(companyId, rows.getFirst());
    }

    private List<HrAnnouncementRow> loadAll(long companyId) {
        return jdbcTemplate.query(
            baseSelect()
                + " WHERE a.company_id = ? AND a.deleted_at IS NULL "
                + orderClause(),
            (rs, rowNum) -> HrAnnouncementRows.map(rs),
            companyId
        );
    }

    private List<HrAnnouncementRow> loadVisible(HrAnnouncementActor actor) {
        return jdbcTemplate.query(
            """
                %s
                LEFT JOIN hr_announcement_targets t ON t.announcement_id = a.id
                WHERE a.company_id = ?
                  AND a.deleted_at IS NULL
                  AND LOWER(COALESCE(a.status, 'draft')) = 'published'
                  AND (
                    LOWER(COALESCE(a.audience_type, 'all')) = 'all'
                    OR (
                      LOWER(a.audience_type) = 'employees'
                      AND t.target_type = 'employee'
                      AND t.target_value = ?
                    )
                    OR (
                      LOWER(a.audience_type) = 'units'
                      AND t.target_type = 'unit'
                      AND t.target_value = ?
                    )
                    OR (
                      LOWER(a.audience_type) = 'departments'
                      AND t.target_type = 'department'
                      AND LOWER(TRIM(t.target_value)) = LOWER(TRIM(?))
                    )
                  )
                %s
                """.formatted(baseSelect(), orderClause()),
            (rs, rowNum) -> HrAnnouncementRows.map(rs),
            actor.companyId(),
            String.valueOf(actor.userCompanyId()),
            actor.unitTargetValue(),
            actor.normalizedDepartment()
        );
    }

    private String baseSelect() {
        return """
            SELECT DISTINCT a.id,
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
            """;
    }

    private String orderClause() {
        return " ORDER BY COALESCE(a.published_at, a.scheduled_for, a.created_at) DESC, a.id DESC";
    }
}
