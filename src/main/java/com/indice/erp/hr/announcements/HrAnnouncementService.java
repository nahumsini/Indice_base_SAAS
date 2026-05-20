package com.indice.erp.hr.announcements;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class HrAnnouncementService {

    private final HrAnnouncementQueryService queryService;
    private final HrAnnouncementCommandService commandService;
    private final HrAnnouncementPublisher publisher;
    private final AnnEditSvc editSvc;
    private final AnnDeleteSvc deleteSvc;
    private final AnnReadSvc readSvc;
    private final AnnFileSvc fileSvc;
    private final AnnAudienceSvc audienceSvc;

    public HrAnnouncementService(
        HrAnnouncementQueryService queryService,
        HrAnnouncementCommandService commandService,
        HrAnnouncementPublisher publisher,
        AnnEditSvc editSvc,
        AnnDeleteSvc deleteSvc,
        AnnReadSvc readSvc,
        AnnFileSvc fileSvc,
        AnnAudienceSvc audienceSvc
    ) {
        this.queryService = queryService;
        this.commandService = commandService;
        this.publisher = publisher;
        this.editSvc = editSvc;
        this.deleteSvc = deleteSvc;
        this.readSvc = readSvc;
        this.fileSvc = fileSvc;
        this.audienceSvc = audienceSvc;
    }

    public Map<String, Object> listAnnouncements(HrAnnouncementActor actor) {
        return queryService.list(actor);
    }

    public Map<String, Object> audienceOptions(HrAnnouncementActor actor) {
        return audienceSvc.options(actor);
    }

    public Map<String, Object> createAnnouncement(HrAnnouncementActor actor, Map<String, Object> payload) {
        return commandService.create(actor, payload);
    }

    public Map<String, Object> updateAnnouncement(HrAnnouncementActor actor, long id, Map<String, Object> payload) {
        return editSvc.update(actor, id, payload);
    }

    public Map<String, Object> deleteAnnouncement(HrAnnouncementActor actor, long id) {
        return deleteSvc.delete(actor, id);
    }

    public Map<String, Object> markRead(HrAnnouncementActor actor, long id) {
        return readSvc.markRead(actor, id);
    }

    public Map<String, Object> presignAttachment(HrAnnouncementActor actor, long id, Map<String, Object> payload) {
        return fileSvc.presign(actor, id, payload);
    }

    public Map<String, Object> registerAttachment(HrAnnouncementActor actor, long id, Map<String, Object> payload) {
        return fileSvc.register(actor, id, payload);
    }

    public Map<String, Object> deleteAttachment(HrAnnouncementActor actor, long id, long attachmentId) {
        return fileSvc.delete(actor, id, attachmentId);
    }

    public int publishDueAnnouncements() {
        return publisher.publishDueAnnouncements();
    }
}
