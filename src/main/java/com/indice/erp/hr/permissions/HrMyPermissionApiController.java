package com.indice.erp.hr.permissions;

import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/hr/permissions/me")
public class HrMyPermissionApiController {

    private final HrPermissionSecurityService securityService;
    private final HrPermissionQueryService queryService;
    private final HrPermissionCommandService commandService;
    private final HrPermissionSelfDeleteService selfDeleteService;
    private final HrPermissionAttachmentService attachmentService;

    public HrMyPermissionApiController(
        HrPermissionSecurityService securityService,
        HrPermissionQueryService queryService,
        HrPermissionCommandService commandService,
        HrPermissionSelfDeleteService selfDeleteService,
        HrPermissionAttachmentService attachmentService
    ) {
        this.securityService = securityService;
        this.queryService = queryService;
        this.commandService = commandService;
        this.selfDeleteService = selfDeleteService;
        this.attachmentService = attachmentService;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session, @RequestParam Map<String, String> filters) {
        return ResponseEntity.ok(queryService.listOwn(securityService.requireSelfActor(session), filters));
    }

    @GetMapping("/{requestId}")
    public ResponseEntity<?> details(HttpSession session, @PathVariable long requestId) {
        return ResponseEntity.ok(queryService.getOwn(securityService.requireSelfActor(session), requestId));
    }

    @PostMapping
    public ResponseEntity<?> create(HttpSession session, @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken, @RequestBody Map<String, Object> payload) {
        return ResponseEntity.status(HttpStatus.CREATED).body(commandService.createOwn(securityService.requireSelfWriteActor(session, csrfToken), payload));
    }

    @DeleteMapping("/{requestId}")
    public ResponseEntity<?> delete(HttpSession session, @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken, @PathVariable long requestId) {
        return ResponseEntity.ok(selfDeleteService.deleteOwnPending(securityService.requireSelfWriteActor(session, csrfToken), requestId));
    }

    @PostMapping("/{requestId}/attachments/presign-upload")
    public ResponseEntity<?> presignUpload(HttpSession session, @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken, @PathVariable long requestId, @RequestBody Map<String, Object> payload) {
        return ResponseEntity.ok(attachmentService.createOwnUpload(securityService.requireSelfWriteActor(session, csrfToken), requestId, payload));
    }

    @PostMapping("/{requestId}/attachments")
    public ResponseEntity<?> registerAttachment(HttpSession session, @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken, @PathVariable long requestId, @RequestBody Map<String, Object> payload) {
        return ResponseEntity.status(HttpStatus.CREATED).body(attachmentService.registerOwnAttachment(securityService.requireSelfWriteActor(session, csrfToken), requestId, payload));
    }
}
