package com.indice.erp.hr;

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
@RequestMapping("/api/v1/hr/employees")
public class HrEmployeeApiController {

    private final SessionAuthService sessionAuthService;
    private final HrEmployeeService hrEmployeeService;

    public HrEmployeeApiController(
        SessionAuthService sessionAuthService,
        HrEmployeeService hrEmployeeService
    ) {
        this.sessionAuthService = sessionAuthService;
        this.hrEmployeeService = hrEmployeeService;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        var result = hrEmployeeService.listEmployees(user.get().companyId());
        var body = new LinkedHashMap<String, Object>();
        body.put("items", result.get("rows"));
        body.put("count", ((java.util.List<?>) result.get("rows")).size());
        body.put("summary", result.get("meta"));
        return ResponseEntity.ok(body);
    }

    @GetMapping("/{employeeId}")
    public ResponseEntity<?> details(HttpSession session, @PathVariable long employeeId) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.ok(hrEmployeeService.getEmployeeDetails(user.get().companyId(), employeeId));
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
            var result = hrEmployeeService.createEmployee(user.get().companyId(), user.get().userId(), payload);
            return ResponseEntity.status(HttpStatus.CREATED).body(result.get("employee"));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/{employeeId}")
    public ResponseEntity<?> update(HttpSession session, @PathVariable long employeeId, @RequestBody Map<String, Object> payload) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            payload.put("id", employeeId);
            var result = hrEmployeeService.updateEmployee(user.get().companyId(), payload);
            return ResponseEntity.ok(result.get("employee"));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/{employeeId}/documents/presign-upload")
    public ResponseEntity<?> createDocumentUpload(
        HttpSession session,
        @PathVariable long employeeId,
        @RequestBody Map<String, Object> payload
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.ok(
                hrEmployeeService.createDocumentUpload(user.get().companyId(), employeeId, payload)
            );
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (ObjectStorageDisabledException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/{employeeId}/documents")
    public ResponseEntity<?> registerDocument(
        HttpSession session,
        @PathVariable long employeeId,
        @RequestBody Map<String, Object> payload
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(
                hrEmployeeService.registerEmployeeDocument(
                    user.get().companyId(),
                    user.get().userId(),
                    employeeId,
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

    @DeleteMapping("/{employeeId}/documents/{documentId}")
    public ResponseEntity<?> deleteDocument(
        HttpSession session,
        @PathVariable long employeeId,
        @PathVariable long documentId
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            hrEmployeeService.deleteEmployeeDocument(user.get().companyId(), employeeId, documentId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/{employeeId}/terminate")
    public ResponseEntity<?> terminate(
        HttpSession session,
        @PathVariable long employeeId,
        @RequestBody(required = false) Map<String, Object> payload
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            var result = hrEmployeeService.terminateEmployee(
                user.get().companyId(),
                employeeId,
                payload == null ? Map.of() : payload
            );
            return ResponseEntity.ok(result.get("employee"));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @DeleteMapping("/{employeeId}")
    public ResponseEntity<?> delete(HttpSession session, @PathVariable long employeeId) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            hrEmployeeService.deleteEmployee(user.get().companyId(), employeeId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }
}
