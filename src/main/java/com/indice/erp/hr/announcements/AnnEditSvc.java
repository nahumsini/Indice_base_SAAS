package com.indice.erp.hr.announcements;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AnnEditSvc {

    private final JdbcTemplate jdbcTemplate;
    private final HrAnnouncementAudienceService audienceService;
    private final HrAnnouncementTargetRepository targetRepository;
    private final HrAnnouncementQueryService queryService;
    private final AnnDeliverSvc deliverSvc;
    private final AnnVisSvc visSvc;
    private final HrAnnouncementScopeService scopeService;

    public AnnEditSvc(
        JdbcTemplate jdbcTemplate,
        HrAnnouncementAudienceService audienceService,
        HrAnnouncementTargetRepository targetRepository,
        HrAnnouncementQueryService queryService,
        AnnDeliverSvc deliverSvc,
        AnnVisSvc visSvc,
        HrAnnouncementScopeService scopeService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.audienceService = audienceService;
        this.targetRepository = targetRepository;
        this.queryService = queryService;
        this.deliverSvc = deliverSvc;
        this.visSvc = visSvc;
        this.scopeService = scopeService;
    }

    @Transactional
    public Map<String, Object> update(HrAnnouncementActor actor, long announcementId, Map<String, Object> payload) {
        visSvc.requireCompanyAnnouncement(actor.companyId(), announcementId);
        var announcement = HrAnnouncementPayload.from(payload);
        var targets = audienceService.normalizeTargets(actor.companyId(), announcement.audienceType(), payload);
        scopeService.requireManageable(actor, announcementId);
        scopeService.requireAudienceManageable(actor, announcement.audienceType(), targets);
        jdbcTemplate.update(
            """
                UPDATE hr_announcements
                SET title = ?,
                    announcement_type = ?,
                    content = ?,
                    audience_type = ?,
                    status = ?,
                    scheduled_for = ?,
                    published_at = CASE WHEN ? = 'published' THEN COALESCE(published_at, CURRENT_TIMESTAMP) ELSE NULL END
                WHERE company_id = ?
                  AND id = ?
                  AND deleted_at IS NULL
                """,
            announcement.title(),
            announcement.type(),
            announcement.content(),
            announcement.audienceType(),
            announcement.status(),
            timestamp(announcement.scheduledFor()),
            announcement.status(),
            actor.companyId(),
            announcementId
        );
        targetRepository.replaceTargets(announcementId, targets);
        deliverSvc.cancel(actor.companyId(), announcementId);
        if ("published".equals(announcement.status())) {
            deliverSvc.sync(actor.companyId(), announcementId);
        }
        return queryService.loadOne(actor.companyId(), announcementId);
    }

    private Timestamp timestamp(LocalDateTime value) {
        return value == null ? null : Timestamp.valueOf(value);
    }
}
