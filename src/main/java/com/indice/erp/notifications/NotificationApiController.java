package com.indice.erp.notifications;

import com.indice.erp.hr.announcements.HrAnnouncementSecurityService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationApiController {

    private final HrAnnouncementSecurityService securityService;
    private final NotificationService notificationService;

    public NotificationApiController(
        HrAnnouncementSecurityService securityService,
        NotificationService notificationService
    ) {
        this.securityService = securityService;
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        return ResponseEntity.ok(notificationService.list(securityService.requireReadActor(session)));
    }

    @PostMapping("/{notificationId}/read")
    public ResponseEntity<?> markRead(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @PathVariable long notificationId
    ) {
        var actor = securityService.requireReadWriteActor(session, csrfToken);
        return ResponseEntity.ok(notificationService.markRead(actor, notificationId));
    }

    @PostMapping("/read-all")
    public ResponseEntity<?> markAllRead(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        var actor = securityService.requireReadWriteActor(session, csrfToken);
        return ResponseEntity.ok(notificationService.markAllRead(actor));
    }

    @DeleteMapping("/{notificationId}")
    public ResponseEntity<?> dismiss(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @PathVariable long notificationId
    ) {
        var actor = securityService.requireReadWriteActor(session, csrfToken);
        return ResponseEntity.ok(notificationService.dismiss(actor, notificationId));
    }
}
