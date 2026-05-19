package com.indice.erp.hr.permissions;

import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/hr/permissions")
public class HrPermissionManagementApiController {

    private final HrPermissionSecurityService securityService;
    private final HrPermissionQueryService queryService;
    private final HrPermissionCommandService commandService;

    public HrPermissionManagementApiController(
        HrPermissionSecurityService securityService,
        HrPermissionQueryService queryService,
        HrPermissionCommandService commandService
    ) {
        this.securityService = securityService;
        this.queryService = queryService;
        this.commandService = commandService;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session, @RequestParam Map<String, String> filters) {
        return ResponseEntity.ok(queryService.listManagement(securityService.requireManagementActor(session), filters));
    }

    @GetMapping("/{requestId}")
    public ResponseEntity<?> details(HttpSession session, @PathVariable long requestId) {
        return ResponseEntity.ok(queryService.getManagement(securityService.requireManagementActor(session), requestId));
    }

    @PostMapping("/{requestId}/approve")
    public ResponseEntity<?> approve(HttpSession session, @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken, @PathVariable long requestId, @RequestBody(required = false) Map<String, Object> payload) {
        return ResponseEntity.ok(commandService.approve(securityService.requireManagementWriteActor(session, csrfToken), requestId, payload == null ? Map.of() : payload));
    }

    @PostMapping("/{requestId}/reject")
    public ResponseEntity<?> reject(HttpSession session, @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken, @PathVariable long requestId, @RequestBody(required = false) Map<String, Object> payload) {
        return ResponseEntity.status(HttpStatus.OK).body(commandService.reject(securityService.requireManagementWriteActor(session, csrfToken), requestId, payload == null ? Map.of() : payload));
    }
}
