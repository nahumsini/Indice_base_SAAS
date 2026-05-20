package com.indice.erp.hr.announcements;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class HrAnnouncementResponseFactory {

    private final HrAnnouncementTargetRepository targetRepository;
    private final HrAnnouncementAudienceService audienceService;
    private final AnnFileMetaSvc fileMetaSvc;
    private final AnnReadMetaSvc readMetaSvc;

    public HrAnnouncementResponseFactory(
        HrAnnouncementTargetRepository targetRepository,
        HrAnnouncementAudienceService audienceService,
        AnnFileMetaSvc fileMetaSvc,
        AnnReadMetaSvc readMetaSvc
    ) {
        this.targetRepository = targetRepository;
        this.audienceService = audienceService;
        this.fileMetaSvc = fileMetaSvc;
        this.readMetaSvc = readMetaSvc;
    }

    public Map<String, Object> listBody(
        long companyId,
        List<HrAnnouncementRow> rows,
        HrAnnouncementActor actor
    ) {
        var ids = rows.stream().map(HrAnnouncementRow::id).toList();
        var targets = targetRepository.loadByAnnouncement(companyId, ids);
        var attachments = fileMetaSvc.byAnnouncement(companyId, ids);
        var stats = readMetaSvc.stats(companyId, ids);
        var reads = readMetaSvc.reads(companyId, actor.userCompanyId(), ids);
        int publishedCount = 0;
        int scheduledCount = 0;
        int draftCount = 0;
        var items = new ArrayList<Map<String, Object>>();
        for (var row : rows) {
            switch (HrAnnouncementPayload.normalizeStatus(row.status())) {
                case "published" -> publishedCount++;
                case "scheduled" -> scheduledCount++;
                default -> draftCount++;
            }
            items.add(item(
                companyId,
                row,
                targets.getOrDefault(row.id(), List.of()),
                attachments.getOrDefault(row.id(), List.of()),
                stats.get(row.id()),
                reads.get(row.id())
            ));
        }

        var summary = new LinkedHashMap<String, Object>();
        summary.put("total_count", rows.size());
        summary.put("published_count", publishedCount);
        summary.put("scheduled_count", scheduledCount);
        summary.put("draft_count", draftCount);
        summary.put("can_manage", actor.managementAccess());

        var body = new LinkedHashMap<String, Object>();
        body.put("items", items);
        body.put("summary", summary);
        return body;
    }

    public Map<String, Object> itemBody(long companyId, HrAnnouncementRow row) {
        var ids = List.of(row.id());
        var targets = targetRepository.loadByAnnouncement(companyId, ids);
        var attachments = fileMetaSvc.byAnnouncement(companyId, ids);
        var stats = readMetaSvc.stats(companyId, ids);
        return item(
            companyId,
            row,
            targets.getOrDefault(row.id(), List.of()),
            attachments.getOrDefault(row.id(), List.of()),
            stats.get(row.id()),
            null
        );
    }

    private Map<String, Object> item(
        long companyId,
        HrAnnouncementRow row,
        List<HrAnnouncementTargetRow> targets,
        List<Map<String, Object>> attachments,
        AnnReadMetaSvc.AnnStats stats,
        String readAt
    ) {
        var audienceType = HrAnnouncementPayload.normalizeAudienceType(row.audienceType());
        var item = new LinkedHashMap<String, Object>();
        item.put("id", row.id());
        item.put("title", row.title());
        item.put("type", HrAnnouncementPayload.normalizeType(row.type()));
        item.put("audience_type", audienceType);
        item.put("audience_summary", audienceService.summarize(companyId, audienceType, targets));
        item.put("targets", targets.stream().map(this::target).toList());
        item.put("status", HrAnnouncementPayload.normalizeStatus(row.status()));
        item.put("scheduled_for", toIsoString(row.scheduledFor()));
        item.put("published_at", toIsoString(row.publishedAt()));
        item.put("created_at", toIsoString(row.createdAt()));
        item.put("author_name", row.authorName());
        item.put("content", row.content());
        item.put("attachments", attachments);
        item.put("attachment_count", attachments.size());
        item.put("delivery_count", stats == null ? 0 : stats.deliveryCount());
        item.put("read_count", stats == null ? 0 : stats.readCount());
        item.put("is_read", readAt != null);
        item.put("read_at", readAt);
        return item;
    }

    private Map<String, Object> target(HrAnnouncementTargetRow row) {
        var body = new LinkedHashMap<String, Object>();
        body.put("target_type", row.targetType());
        body.put("target_value", row.targetValue());
        return body;
    }

    private String toIsoString(LocalDateTime value) {
        return value == null ? null : value.toString();
    }
}
