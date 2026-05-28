package com.indice.erp.hr.records;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/hr/records")
public class HrRecordApiController {

    private final SessionAuthService sessionAuthService;
    private final HrRecordService hrRecordService;
    private final HrAccessService hrAccessService;

    public HrRecordApiController(
        SessionAuthService sessionAuthService,
        HrRecordService hrRecordService,
        HrAccessService hrAccessService
    ) {
        this.sessionAuthService = sessionAuthService;
        this.hrRecordService = hrRecordService;
        this.hrAccessService = hrAccessService;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session, @RequestParam Map<String, String> requestParams) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessRecords(user.get())) {
            return forbidden();
        }

        try {
            var filters = new LinkedHashMap<String, Object>(requestParams);
            var result = hrRecordService.listRecords(user.get(), filters);
            var body = new LinkedHashMap<String, Object>();
            body.put("items", result.get("rows"));
            body.put("count", ((java.util.List<?>) result.get("rows")).size());
            body.put("page", result.get("page"));
            body.put("size", result.get("size"));
            body.put("total_count", result.get("total_count"));
            body.put("total_pages", result.get("total_pages"));
            body.put("summary", result.get("summary"));
            return ResponseEntity.ok(body);
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/{recordId}")
    public ResponseEntity<?> details(HttpSession session, @PathVariable long recordId) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessRecords(user.get())) {
            return forbidden();
        }

        try {
            return ResponseEntity.ok(hrRecordService.getRecordDetails(user.get(), recordId));
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
        if (!canAccessRecords(user.get())) {
            return forbidden();
        }

        try {
            var result = hrRecordService.createRecord(user.get(), payload);
            return ResponseEntity.status(HttpStatus.CREATED).body(result.get("record"));
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/{recordId}")
    public ResponseEntity<?> update(HttpSession session, @PathVariable long recordId, @RequestBody Map<String, Object> payload) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessRecords(user.get())) {
            return forbidden();
        }

        try {
            var result = hrRecordService.updateRecord(user.get(), recordId, payload);
            return ResponseEntity.ok(result.get("record"));
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @DeleteMapping("/{recordId}")
    public ResponseEntity<?> delete(HttpSession session, @PathVariable long recordId) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessRecords(user.get())) {
            return forbidden();
        }

        try {
            hrRecordService.deleteRecord(user.get(), recordId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/{recordId}/attachments/presign-upload")
    public ResponseEntity<?> createAttachmentUpload(
        HttpSession session,
        @PathVariable long recordId,
        @RequestBody Map<String, Object> payload
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessRecords(user.get())) {
            return forbidden();
        }

        try {
            return ResponseEntity.ok(hrRecordService.createAttachmentUpload(user.get(), recordId, payload));
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

    @PostMapping("/{recordId}/attachments")
    public ResponseEntity<?> registerAttachment(
        HttpSession session,
        @PathVariable long recordId,
        @RequestBody Map<String, Object> payload
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessRecords(user.get())) {
            return forbidden();
        }

        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(
                hrRecordService.registerAttachment(
                    user.get(),
                    recordId,
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

    @DeleteMapping("/{recordId}/attachments/{attachmentId}")
    public ResponseEntity<?> deleteAttachment(
        HttpSession session,
        @PathVariable long recordId,
        @PathVariable long attachmentId
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessRecords(user.get())) {
            return forbidden();
        }

        try {
            hrRecordService.deleteAttachment(user.get(), recordId, attachmentId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    private boolean canAccessRecords(AuthSessionUser user) {
        return hrAccessService.canAccessManagementTab(user, HrTab.RECORDS);
    }

    private ResponseEntity<?> forbidden() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Forbidden"));
    }
}
