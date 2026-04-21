package com.indice.erp.hr;

import com.indice.erp.auth.SessionAuthService;
import jakarta.servlet.http.HttpSession;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/hr/payroll")
public class HrPayrollApiController {

    private final SessionAuthService sessionAuthService;
    private final HrPayrollService hrPayrollService;

    public HrPayrollApiController(
        SessionAuthService sessionAuthService,
        HrPayrollService hrPayrollService
    ) {
        this.sessionAuthService = sessionAuthService;
        this.hrPayrollService = hrPayrollService;
    }

    @GetMapping("/overview")
    public ResponseEntity<?> overview(HttpSession session) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        return ResponseEntity.ok(hrPayrollService.overview(user.get().companyId()));
    }

    @GetMapping("/preferences")
    public ResponseEntity<?> preferences(HttpSession session) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        return ResponseEntity.ok(hrPayrollService.getPreferences(user.get().companyId()));
    }

    @PutMapping("/preferences")
    public ResponseEntity<?> updatePreferences(HttpSession session, @RequestBody Map<String, Object> payload) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.ok(hrPayrollService.savePreferences(user.get().companyId(), payload));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/runs")
    public ResponseEntity<?> runs(
        HttpSession session,
        @RequestParam(required = false) String status,
        @RequestParam(name = "pay_period", required = false) String payPeriod,
        @RequestParam(name = "grouping_mode", required = false) String groupingMode,
        @RequestParam(name = "period_from", required = false) String periodFrom,
        @RequestParam(name = "period_to", required = false) String periodTo,
        @RequestParam(name = "unit_id", required = false) String unitId,
        @RequestParam(name = "business_id", required = false) String businessId
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            var filters = new LinkedHashMap<String, String>();
            filters.put("status", status);
            filters.put("pay_period", payPeriod);
            filters.put("grouping_mode", groupingMode);
            filters.put("period_from", periodFrom);
            filters.put("period_to", periodTo);
            filters.put("unit_id", unitId);
            filters.put("business_id", businessId);
            return ResponseEntity.ok(hrPayrollService.listRuns(user.get().companyId(), filters));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/runs")
    public ResponseEntity<?> createRuns(HttpSession session, @RequestBody Map<String, Object> payload) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(
                hrPayrollService.createRuns(user.get().companyId(), user.get().userId(), payload)
            );
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/runs/{runId}")
    public ResponseEntity<?> runDetail(HttpSession session, @PathVariable long runId) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.ok(hrPayrollService.getRunDetail(user.get().companyId(), runId));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/runs/{runId}/lines/{lineId}")
    public ResponseEntity<?> updateRunLine(
        HttpSession session,
        @PathVariable long runId,
        @PathVariable long lineId,
        @RequestBody Map<String, Object> payload
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.ok(hrPayrollService.updateRunLine(user.get().companyId(), runId, lineId, payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/runs/{runId}/process")
    public ResponseEntity<?> processRun(HttpSession session, @PathVariable long runId) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.ok(hrPayrollService.processRun(user.get().companyId(), user.get().userId(), runId));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/runs/{runId}/approve")
    public ResponseEntity<?> approveRun(HttpSession session, @PathVariable long runId) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.ok(hrPayrollService.approveRun(user.get().companyId(), user.get().userId(), runId));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/runs/{runId}/mark-paid")
    public ResponseEntity<?> markRunPaid(HttpSession session, @PathVariable long runId) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.ok(hrPayrollService.markRunPaid(user.get().companyId(), user.get().userId(), runId));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/runs/{runId}/cancel")
    public ResponseEntity<?> cancelRun(HttpSession session, @PathVariable long runId) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.ok(hrPayrollService.cancelRun(user.get().companyId(), user.get().userId(), runId));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/runs/{runId}/export.csv")
    public ResponseEntity<?> exportCsv(HttpSession session, @PathVariable long runId) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            var csv = hrPayrollService.exportRunCsv(user.get().companyId(), runId);
            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                    .filename("payroll-run-" + runId + ".csv", StandardCharsets.UTF_8)
                    .build()
                    .toString())
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(csv);
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/runs/{runId}/export.pdf")
    public ResponseEntity<?> exportPdf(HttpSession session, @PathVariable long runId) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            var pdf = hrPayrollService.exportRunPdf(user.get().companyId(), runId);
            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                    .filename("payroll-run-" + runId + ".pdf", StandardCharsets.UTF_8)
                    .build()
                    .toString())
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }
}
