package com.indice.erp.hr;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class HrAnnouncementPublishingJob {

    private final HrAnnouncementService hrAnnouncementService;

    public HrAnnouncementPublishingJob(HrAnnouncementService hrAnnouncementService) {
        this.hrAnnouncementService = hrAnnouncementService;
    }

    @Scheduled(fixedDelayString = "${app.hr.announcements.publish-delay-ms:60000}")
    public void publishDueAnnouncements() {
        hrAnnouncementService.publishDueAnnouncements();
    }
}
