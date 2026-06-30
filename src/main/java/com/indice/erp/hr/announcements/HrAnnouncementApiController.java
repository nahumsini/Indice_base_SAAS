package com.indice.erp.hr.announcements;

import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/hr/announcements")
public class HrAnnouncementApiController {

    private final HrAnnouncementSecurityService securityService;
    private final HrAnnouncementService hrAnnouncementService;

    public HrAnnouncementApiController(
        HrAnnouncementSecurityService securityService,
        HrAnnouncementService hrAnnouncementService
    ) {
        this.securityService = securityService;
        this.hrAnnouncementService = hrAnnouncementService;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        return ResponseEntity.ok(hrAnnouncementService.listAnnouncements(securityService.requireReadActor(session)));
    }

    @GetMapping("/audience-options")
    public ResponseEntity<?> audienceOptions(HttpSession session) {
        return ResponseEntity.ok(hrAnnouncementService.audienceOptions(securityService.requireReadActor(session)));
    }

    @PostMapping
    public ResponseEntity<?> create(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody Map<String, Object> payload
    ) {
        var actor = securityService.requireManagementWriteActor(session, csrfToken);
        return ResponseEntity.status(HttpStatus.CREATED).body(hrAnnouncementService.createAnnouncement(actor, payload));
    }

    @PatchMapping("/{announcementId}")
    public ResponseEntity<?> update(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @PathVariable long announcementId,
        @RequestBody Map<String, Object> payload
    ) {
        var actor = securityService.requireManagementWriteActor(session, csrfToken);
        return ResponseEntity.ok(hrAnnouncementService.updateAnnouncement(actor, announcementId, payload));
    }

    @DeleteMapping("/{announcementId}")
    public ResponseEntity<?> delete(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @PathVariable long announcementId
    ) {
        var actor = securityService.requireManagementWriteActor(session, csrfToken);
        return ResponseEntity.ok(hrAnnouncementService.deleteAnnouncement(actor, announcementId));
    }

    @PostMapping("/{announcementId}/read")
    public ResponseEntity<?> read(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @PathVariable long announcementId
    ) {
        var actor = securityService.requireReadWriteActor(session, csrfToken);
        return ResponseEntity.ok(hrAnnouncementService.markRead(actor, announcementId));
    }

    @DeleteMapping("/{announcementId}/read")
    public ResponseEntity<?> unread(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @PathVariable long announcementId
    ) {
        var actor = securityService.requireReadWriteActor(session, csrfToken);
        return ResponseEntity.ok(hrAnnouncementService.markUnread(actor, announcementId));
    }

    @PostMapping("/{announcementId}/attachments/presign-upload")
    public ResponseEntity<?> presignAttachment(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @PathVariable long announcementId,
        @RequestBody Map<String, Object> payload
    ) {
        var actor = securityService.requireManagementWriteActor(session, csrfToken);
        return ResponseEntity.ok(hrAnnouncementService.presignAttachment(actor, announcementId, payload));
    }

    @PostMapping("/{announcementId}/attachments")
    public ResponseEntity<?> registerAttachment(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @PathVariable long announcementId,
        @RequestBody Map<String, Object> payload
    ) {
        var actor = securityService.requireManagementWriteActor(session, csrfToken);
        return ResponseEntity.status(HttpStatus.CREATED).body(
            hrAnnouncementService.registerAttachment(actor, announcementId, payload)
        );
    }

    @DeleteMapping("/{announcementId}/attachments/{attachmentId}")
    public ResponseEntity<?> deleteAttachment(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @PathVariable long announcementId,
        @PathVariable long attachmentId
    ) {
        var actor = securityService.requireManagementWriteActor(session, csrfToken);
        return ResponseEntity.ok(hrAnnouncementService.deleteAttachment(actor, announcementId, attachmentId));
    }
}
