package com.indice.erp.notifications;

import com.indice.erp.hr.announcements.HrAnnouncementActor;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    private final NotificationQueryService queryService;
    private final NotificationCommandService commandService;

    public NotificationService(NotificationQueryService queryService, NotificationCommandService commandService) {
        this.queryService = queryService;
        this.commandService = commandService;
    }

    public Map<String, Object> list(HrAnnouncementActor actor) {
        return queryService.list(actor);
    }

    public Map<String, Object> markRead(HrAnnouncementActor actor, long notificationId) {
        return commandService.markRead(actor, notificationId);
    }

    public Map<String, Object> markAllRead(HrAnnouncementActor actor) {
        return commandService.markAllRead(actor);
    }

    public Map<String, Object> dismiss(HrAnnouncementActor actor, long notificationId) {
        return commandService.dismiss(actor, notificationId);
    }
}
