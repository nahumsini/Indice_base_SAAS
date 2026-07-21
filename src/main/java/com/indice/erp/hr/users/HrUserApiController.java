package com.indice.erp.hr.users;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.entitlement.RequiresCapability;
import com.indice.erp.hr.HrAccessDeniedException;
import com.indice.erp.hr.HrAccessService;
import com.indice.erp.hr.HrAccessService.HrTab;
import com.indice.erp.storage.ObjectStorageDisabledException;
import jakarta.servlet.http.HttpSession;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/hr/users")
@RequiresCapability("human_resources")
public class HrUserApiController {

    private final SessionAuthService sessionAuthService;
    private final HrUserService hrUserService;
    private final HrAccessService hrAccessService;

    public HrUserApiController(
        SessionAuthService sessionAuthService,
        HrUserService hrUserService,
        HrAccessService hrAccessService
    ) {
        this.sessionAuthService = sessionAuthService;
        this.hrUserService = hrUserService;
        this.hrAccessService = hrAccessService;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessCollaborators(user.get())) {
            return forbidden();
        }

        var result = hrUserService.listUsers(user.get());
        var body = new LinkedHashMap<String, Object>();
        body.put("items", result.get("rows"));
        body.put("count", ((java.util.List<?>) result.get("rows")).size());
        body.put("summary", result.get("meta"));
        return ResponseEntity.ok(body);
    }

    @GetMapping("/{userCompanyId}")
    public ResponseEntity<?> details(HttpSession session, @PathVariable long userCompanyId) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessCollaborators(user.get())) {
            return forbidden();
        }

        try {
            return ResponseEntity.ok(hrUserService.getUserDetails(user.get(), userCompanyId));
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> create(HttpSession session, @RequestBody Map<String, Object> payload) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessCollaborators(user.get())) {
            return forbidden();
        }

        try {
            var result = hrUserService.createUser(user.get(), payload);
            return ResponseEntity.status(HttpStatus.CREATED).body(result.get("user"));
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/{userCompanyId}")
    public ResponseEntity<?> update(HttpSession session, @PathVariable long userCompanyId, @RequestBody Map<String, Object> payload) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessCollaborators(user.get())) {
            return forbidden();
        }

        try {
            var result = hrUserService.updateUser(user.get(), userCompanyId, payload);
            return ResponseEntity.ok(result.get("user"));
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/{userCompanyId}/documents/presign-upload")
    public ResponseEntity<?> createDocumentUpload(
        HttpSession session,
        @PathVariable long userCompanyId,
        @RequestBody Map<String, Object> payload
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessCollaborators(user.get())) {
            return forbidden();
        }

        try {
            return ResponseEntity.ok(
                hrUserService.createDocumentUpload(user.get(), userCompanyId, payload)
            );
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (ObjectStorageDisabledException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/{userCompanyId}/documents")
    public ResponseEntity<?> registerDocument(
        HttpSession session,
        @PathVariable long userCompanyId,
        @RequestBody Map<String, Object> payload
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessCollaborators(user.get())) {
            return forbidden();
        }

        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(
                hrUserService.registerUserDocument(
                    user.get(),
                    userCompanyId,
                    payload
                )
            );
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (ObjectStorageDisabledException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @DeleteMapping("/{userCompanyId}/documents/{documentId}")
    public ResponseEntity<?> deleteDocument(
        HttpSession session,
        @PathVariable long userCompanyId,
        @PathVariable long documentId
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessCollaborators(user.get())) {
            return forbidden();
        }

        try {
            hrUserService.deleteUserDocument(user.get(), userCompanyId, documentId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/{userCompanyId}/terminate")
    public ResponseEntity<?> terminate(
        HttpSession session,
        @PathVariable long userCompanyId,
        @RequestBody(required = false) Map<String, Object> payload
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessCollaborators(user.get())) {
            return forbidden();
        }

        try {
            var result = hrUserService.terminateUser(
                user.get(),
                userCompanyId,
                payload == null ? Map.of() : payload
            );
            return ResponseEntity.ok(result.get("user"));
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @DeleteMapping("/{userCompanyId}")
    public ResponseEntity<?> delete(HttpSession session, @PathVariable long userCompanyId) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessCollaborators(user.get())) {
            return forbidden();
        }

        try {
            hrUserService.deleteUser(user.get(), userCompanyId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    private boolean canAccessCollaborators(AuthSessionUser user) {
        return hrAccessService.canAccessManagementTab(user, HrTab.COLLABORATORS);
    }

    private ResponseEntity<?> forbidden() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Forbidden"));
    }
}
