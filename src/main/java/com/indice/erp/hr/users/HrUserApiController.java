package com.indice.erp.hr.users;

import com.indice.erp.auth.SessionAuthService;
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
public class HrUserApiController {

    private final SessionAuthService sessionAuthService;
    private final HrUserService hrUserService;

    public HrUserApiController(
        SessionAuthService sessionAuthService,
        HrUserService hrUserService
    ) {
        this.sessionAuthService = sessionAuthService;
        this.hrUserService = hrUserService;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        var result = hrUserService.listUsers(user.get().companyId());
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

        try {
            return ResponseEntity.ok(hrUserService.getUserDetails(user.get().companyId(), userCompanyId));
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

        try {
            var result = hrUserService.createUser(user.get().companyId(), user.get().userId(), payload);
            return ResponseEntity.status(HttpStatus.CREATED).body(result.get("user"));
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

        try {
            payload.put("id", userCompanyId);
            var result = hrUserService.updateUser(user.get().companyId(), payload);
            return ResponseEntity.ok(result.get("user"));
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

        try {
            return ResponseEntity.ok(
                hrUserService.createDocumentUpload(user.get().companyId(), userCompanyId, payload)
            );
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

        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(
                hrUserService.registerUserDocument(
                    user.get().companyId(),
                    user.get().userId(),
                    userCompanyId,
                    payload
                )
            );
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

        try {
            hrUserService.deleteUserDocument(user.get().companyId(), userCompanyId, documentId);
            return ResponseEntity.ok(Map.of("success", true));
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

        try {
            var result = hrUserService.terminateUser(
                user.get().companyId(),
                userCompanyId,
                payload == null ? Map.of() : payload
            );
            return ResponseEntity.ok(result.get("user"));
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

        try {
            hrUserService.deleteUser(user.get().companyId(), userCompanyId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }
}
