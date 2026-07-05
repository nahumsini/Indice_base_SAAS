package com.indice.erp.hr.payroll;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.hr.HrAccessDeniedException;
import com.indice.erp.hr.HrAccessService;
import com.indice.erp.hr.HrAccessService.HrTab;
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
    private final HrAccessService hrAccessService;

    public HrPayrollApiController(
        SessionAuthService sessionAuthService,
        HrPayrollService hrPayrollService,
        HrAccessService hrAccessService
    ) {
        this.sessionAuthService = sessionAuthService;
        this.hrPayrollService = hrPayrollService;
        this.hrAccessService = hrAccessService;
    }

    @GetMapping("/overview")
    public ResponseEntity<?> overview(HttpSession session) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessPayroll(user.get())) {
            return forbidden();
        }

        try {
            return ResponseEntity.ok(hrPayrollService.overview(user.get()));
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        }
    }

    @GetMapping("/preferences")
    public ResponseEntity<?> preferences(HttpSession session) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessPayroll(user.get())) {
            return forbidden();
        }

        return ResponseEntity.ok(hrPayrollService.getPreferences(user.get().companyId()));
    }

    @GetMapping("/colombia/config")
    public ResponseEntity<?> colombiaConfig(HttpSession session) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessPayroll(user.get())) {
            return forbidden();
        }

        return ResponseEntity.ok(hrPayrollService.getColombiaConfig(user.get()));
    }

    @PutMapping("/colombia/config")
    public ResponseEntity<?> updateColombiaConfig(HttpSession session, @RequestBody Map<String, Object> payload) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessPayroll(user.get())) {
            return forbidden();
        }

        try {
            return ResponseEntity.ok(hrPayrollService.saveColombiaConfig(user.get(), payload));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/colombia/profiles/{userCompanyId}")
    public ResponseEntity<?> colombiaProfile(HttpSession session, @PathVariable long userCompanyId) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessPayroll(user.get())) {
            return forbidden();
        }

        try {
            return ResponseEntity.ok(hrPayrollService.getColombiaEmployeeProfile(user.get(), userCompanyId));
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/colombia/profiles/{userCompanyId}")
    public ResponseEntity<?> updateColombiaProfile(
        HttpSession session,
        @PathVariable long userCompanyId,
        @RequestBody Map<String, Object> payload
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessPayroll(user.get())) {
            return forbidden();
        }

        try {
            return ResponseEntity.ok(hrPayrollService.saveColombiaEmployeeProfile(user.get(), userCompanyId, payload));
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/colombia/novelties")
    public ResponseEntity<?> colombiaNovelties(
        HttpSession session,
        @RequestParam(name = "user_company_id", required = false) Long userCompanyId,
        @RequestParam(name = "period_from", required = false) String periodFrom,
        @RequestParam(name = "period_to", required = false) String periodTo,
        @RequestParam(required = false) String status
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessPayroll(user.get())) {
            return forbidden();
        }

        try {
            return ResponseEntity.ok(hrPayrollService.listColombiaNovelties(
                user.get(),
                userCompanyId,
                periodFrom,
                periodTo,
                status
            ));
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/colombia/novelties")
    public ResponseEntity<?> createColombiaNovelty(HttpSession session, @RequestBody Map<String, Object> payload) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessPayroll(user.get())) {
            return forbidden();
        }

        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(hrPayrollService.createColombiaNovelty(user.get(), payload));
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/colombia/novelties/{noveltyId}")
    public ResponseEntity<?> updateColombiaNovelty(
        HttpSession session,
        @PathVariable long noveltyId,
        @RequestBody Map<String, Object> payload
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessPayroll(user.get())) {
            return forbidden();
        }

        try {
            return ResponseEntity.ok(hrPayrollService.updateColombiaNovelty(user.get(), noveltyId, payload));
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/preferences")
    public ResponseEntity<?> updatePreferences(HttpSession session, @RequestBody Map<String, Object> payload) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessPayroll(user.get())) {
            return forbidden();
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
        if (!canAccessPayroll(user.get())) {
            return forbidden();
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
            return ResponseEntity.ok(hrPayrollService.listRuns(user.get(), filters));
        } catch (HrAccessDeniedException ex) {
            return forbidden();
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
        if (!canAccessPayroll(user.get())) {
            return forbidden();
        }

        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(
                hrPayrollService.createRuns(user.get(), payload)
            );
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/runs/regenerate")
    public ResponseEntity<?> regenerateRuns(HttpSession session) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessPayroll(user.get())) {
            return forbidden();
        }

        try {
            return ResponseEntity.ok(hrPayrollService.regenerateOpenRuns(user.get()));
        } catch (HrAccessDeniedException ex) {
            return forbidden();
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
        if (!canAccessPayroll(user.get())) {
            return forbidden();
        }

        try {
            return ResponseEntity.ok(hrPayrollService.getRunDetail(user.get(), runId));
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/runs/{runId}/government-reporting")
    public ResponseEntity<?> governmentReportingSnapshots(
        HttpSession session,
        @PathVariable long runId,
        @RequestParam(name = "report_type", required = false) String reportType
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessPayroll(user.get())) {
            return forbidden();
        }

        try {
            return ResponseEntity.ok(hrPayrollService.listGovernmentReportingSnapshots(user.get(), runId, reportType));
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/government-reporting/{snapshotId}/response")
    public ResponseEntity<?> updateGovernmentReportingResponse(
        HttpSession session,
        @PathVariable long snapshotId,
        @RequestBody Map<String, Object> payload
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessPayroll(user.get())) {
            return forbidden();
        }

        try {
            return ResponseEntity.ok(hrPayrollService.updateGovernmentReportingSnapshotResponse(user.get(), snapshotId, payload));
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
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
        if (!canAccessPayroll(user.get())) {
            return forbidden();
        }

        try {
            return ResponseEntity.ok(hrPayrollService.updateRunLine(user.get(), runId, lineId, payload));
        } catch (HrAccessDeniedException ex) {
            return forbidden();
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
        if (!canAccessPayroll(user.get())) {
            return forbidden();
        }

        try {
            return ResponseEntity.ok(hrPayrollService.processRun(user.get(), runId));
        } catch (HrAccessDeniedException ex) {
            return forbidden();
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
        if (!canAccessPayroll(user.get())) {
            return forbidden();
        }

        try {
            return ResponseEntity.ok(hrPayrollService.approveRun(user.get(), runId));
        } catch (HrAccessDeniedException ex) {
            return forbidden();
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
        if (!canAccessPayroll(user.get())) {
            return forbidden();
        }

        try {
            return ResponseEntity.ok(hrPayrollService.markRunPaid(user.get(), runId));
        } catch (HrAccessDeniedException ex) {
            return forbidden();
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
        if (!canAccessPayroll(user.get())) {
            return forbidden();
        }

        try {
            return ResponseEntity.ok(hrPayrollService.cancelRun(user.get(), runId));
        } catch (HrAccessDeniedException ex) {
            return forbidden();
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
        if (!canAccessPayroll(user.get())) {
            return forbidden();
        }

        try {
            var csv = hrPayrollService.exportRunCsv(user.get(), runId);
            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                    .filename("payroll-run-" + runId + ".csv", StandardCharsets.UTF_8)
                    .build()
                    .toString())
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(csv);
        } catch (HrAccessDeniedException ex) {
            return forbidden();
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
        if (!canAccessPayroll(user.get())) {
            return forbidden();
        }

        try {
            var pdf = hrPayrollService.exportRunPdf(user.get(), runId);
            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                    .filename("payroll-run-" + runId + ".pdf", StandardCharsets.UTF_8)
                    .build()
                    .toString())
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    private boolean canAccessPayroll(AuthSessionUser user) {
        return hrAccessService.canAccessManagementTab(user, HrTab.PAYROLL);
    }

    private ResponseEntity<?> forbidden() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Forbidden"));
    }
}
