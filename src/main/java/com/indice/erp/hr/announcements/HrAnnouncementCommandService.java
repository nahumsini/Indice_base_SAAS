package com.indice.erp.hr.announcements;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HrAnnouncementCommandService {

    private final JdbcTemplate jdbcTemplate;
    private final HrAnnouncementAudienceService audienceService;
    private final HrAnnouncementTargetRepository targetRepository;
    private final HrAnnouncementQueryService queryService;
    private final AnnDeliverSvc deliverSvc;
    private final HrAnnouncementScopeService scopeService;

    public HrAnnouncementCommandService(
        JdbcTemplate jdbcTemplate,
        HrAnnouncementAudienceService audienceService,
        HrAnnouncementTargetRepository targetRepository,
        HrAnnouncementQueryService queryService,
        AnnDeliverSvc deliverSvc,
        HrAnnouncementScopeService scopeService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.audienceService = audienceService;
        this.targetRepository = targetRepository;
        this.queryService = queryService;
        this.deliverSvc = deliverSvc;
        this.scopeService = scopeService;
    }

    @Transactional
    public Map<String, Object> create(HrAnnouncementActor actor, Map<String, Object> payload) {
        var announcement = HrAnnouncementPayload.from(payload);
        var targets = audienceService.normalizeTargets(actor.companyId(), announcement.audienceType(), payload);
        scopeService.requireAudienceManageable(actor, announcement.audienceType(), targets);
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO hr_announcements
                    (company_id, title, announcement_type, content, audience_type, status,
                     scheduled_for, published_at, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                new String[] {"id"}
            );
            statement.setLong(1, actor.companyId());
            statement.setString(2, announcement.title());
            statement.setString(3, announcement.type());
            statement.setString(4, announcement.content());
            statement.setString(5, announcement.audienceType());
            statement.setString(6, announcement.status());
            statement.setTimestamp(7, timestamp(announcement.scheduledFor()));
            statement.setTimestamp(8, publishedAt(announcement.status()));
            statement.setLong(9, actor.userId());
            return statement;
        }, keyHolder);

        var announcementId = keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
        targetRepository.persistTargets(announcementId, targets);
        if ("published".equals(announcement.status())) {
            deliverSvc.sync(actor.companyId(), announcementId);
        }
        return queryService.loadOne(actor.companyId(), announcementId);
    }

    private Timestamp timestamp(LocalDateTime value) {
        return value == null ? null : Timestamp.valueOf(value);
    }

    private Timestamp publishedAt(String status) {
        return "published".equals(status) ? Timestamp.valueOf(LocalDateTime.now()) : null;
    }
}
