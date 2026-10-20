package com.indice.erp.notifications;

import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
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

    private final NotificationAccessService securityService;
    private final NotificationPreferencesService preferences;
    private final NotificationService notificationService;

    public NotificationApiController(
        NotificationAccessService securityService,
        NotificationService notificationService,
        NotificationPreferencesService preferences
    ) {
        this.securityService = securityService;
        this.notificationService = notificationService;
        this.preferences = preferences;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        return ResponseEntity.ok(notificationService.list(securityService.actor(session, null, false)));
    }

    @GetMapping("/preferences")
    public ResponseEntity<?> preferences(HttpSession session) {
        return ResponseEntity.ok(preferences.get(securityService.actor(session, null, false)));
    }

    @PutMapping("/preferences")
    public ResponseEntity<?> savePreferences(HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody NotificationPreferencesService.Change change) {
        return ResponseEntity.ok(preferences.save(securityService.actor(session, csrfToken, true), change));
    }

    @PostMapping("/{notificationId}/read")
    public ResponseEntity<?> markRead(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @PathVariable long notificationId
    ) {
        var actor = securityService.actor(session, csrfToken, true);
        return ResponseEntity.ok(notificationService.markRead(actor, notificationId));
    }

    @PostMapping("/read-all")
    public ResponseEntity<?> markAllRead(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        var actor = securityService.actor(session, csrfToken, true);
        return ResponseEntity.ok(notificationService.markAllRead(actor));
    }

    @DeleteMapping("/{notificationId}")
    public ResponseEntity<?> dismiss(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @PathVariable long notificationId
    ) {
        var actor = securityService.actor(session, csrfToken, true);
        return ResponseEntity.ok(notificationService.dismiss(actor, notificationId));
    }
}
