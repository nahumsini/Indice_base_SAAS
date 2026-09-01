package com.indice.erp.finance.reporting;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.finance.reporting.FinancialReportingContracts.ReopenPeriodRequest;
import com.indice.erp.finance.reporting.FinancialReportingContracts.SynchronizeRequest;
import jakarta.servlet.http.HttpSession;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Map;
import java.util.Optional;
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
@RequestMapping("/api/v1/kpis/accounting-reports")
public class FinancialReportingController {

    private final SessionAuthService sessionAuthService;
    private final SessionCsrfService csrfService;
    private final FinancialReportingService reportingService;
    private final FinancialSynchronizationService synchronizationService;
    private final FinancialAnalyticsService analyticsService;

    public FinancialReportingController(
        SessionAuthService sessionAuthService,
        SessionCsrfService csrfService,
        FinancialReportingService reportingService,
        FinancialSynchronizationService synchronizationService,
        FinancialAnalyticsService analyticsService
    ) {
        this.sessionAuthService = sessionAuthService;
        this.csrfService = csrfService;
        this.reportingService = reportingService;
        this.synchronizationService = synchronizationService;
        this.analyticsService = analyticsService;
    }

    @GetMapping("/analytics")
    public ResponseEntity<?> analytics(
        HttpSession session,
        @RequestParam(required = false) LocalDate from,
        @RequestParam(required = false) LocalDate to,
        @RequestParam(required = false) Long unitId,
        @RequestParam(required = false) Long businessId,
        @RequestParam(defaultValue = "12") int months
    ) {
        var user = currentUser(session);
        if (user.isEmpty()) return unauthorized();
        var range = resolveRange(from, to);
        try {
            return ResponseEntity.ok(analyticsService.analytics(user.get().companyId(), range.from(), range.to(),
                unitId, businessId, months));
        } catch (IllegalStateException ex) {
            return accountingNotReady();
        } catch (IllegalArgumentException ex) {
            return invalidRequest(ex.getMessage());
        }
    }

    @GetMapping("/drilldown")
    public ResponseEntity<?> drilldown(
        HttpSession session,
        @RequestParam(required = false) LocalDate from,
        @RequestParam(required = false) LocalDate to,
        @RequestParam(required = false) Long unitId,
        @RequestParam(required = false) Long businessId,
        @RequestParam String subjectType,
        @RequestParam String subjectId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "25") int pageSize,
        @RequestParam(defaultValue = "entryDate") String sortBy,
        @RequestParam(defaultValue = "desc") String sortDirection
    ) {
        var user = currentUser(session);
        if (user.isEmpty()) return unauthorized();
        var range = resolveRange(from, to);
        try {
            return ResponseEntity.ok(analyticsService.drilldown(user.get().companyId(), range.from(), range.to(),
                unitId, businessId, subjectType, subjectId, page, pageSize, sortBy, sortDirection));
        } catch (IllegalStateException ex) {
            return accountingNotReady();
        } catch (IllegalArgumentException ex) {
            return invalidRequest(ex.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<?> report(
        HttpSession session,
        @RequestParam(required = false) LocalDate from,
        @RequestParam(required = false) LocalDate to,
        @RequestParam(required = false) Long unitId,
        @RequestParam(required = false) Long businessId
    ) {
        var user = currentUser(session);
        if (user.isEmpty()) {
            return unauthorized();
        }
        YearMonth month = YearMonth.now();
        LocalDate resolvedFrom = from == null ? month.atDay(1) : from;
        LocalDate resolvedTo = to == null ? month.atEndOfMonth() : to;
        try {
            return ResponseEntity.ok(reportingService.report(user.get().companyId(), resolvedFrom, resolvedTo,
                unitId, businessId));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", ex.getMessage(), "code", "ACCOUNTING_NOT_READY"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/synchronize")
    public ResponseEntity<?> synchronize(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody SynchronizeRequest request
    ) {
        var user = currentUser(session);
        if (user.isEmpty()) {
            return unauthorized();
        }
        try {
            csrfService.requireCsrf(session, csrfToken);
            if (request == null) {
                throw new IllegalArgumentException("Synchronization period is required.");
            }
            return ResponseEntity.ok(synchronizationService.synchronize(user.get().companyId(), user.get().userId(),
                request.from(), request.to()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/periods/{periodKey}/close")
    public ResponseEntity<?> closePeriod(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @PathVariable String periodKey
    ) {
        var user = currentUser(session);
        if (user.isEmpty()) {
            return unauthorized();
        }
        try {
            csrfService.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(reportingService.closePeriod(user.get().companyId(), user.get().userId(), periodKey));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/periods/{periodKey}/reopen")
    public ResponseEntity<?> reopenPeriod(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @PathVariable String periodKey,
        @RequestBody ReopenPeriodRequest request
    ) {
        var user = currentUser(session);
        if (user.isEmpty()) {
            return unauthorized();
        }
        try {
            csrfService.requireCsrf(session, csrfToken);
            return ResponseEntity.ok(reportingService.reopenPeriod(user.get().companyId(), user.get().userId(), periodKey,
                request == null ? null : request.reason()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", ex.getMessage()));
        }
    }

    private Optional<AuthSessionUser> currentUser(HttpSession session) {
        return sessionAuthService.currentUser(session);
    }

    private static DateRange resolveRange(LocalDate from, LocalDate to) {
        YearMonth month = YearMonth.now();
        return new DateRange(from == null ? month.atDay(1) : from, to == null ? month.atEndOfMonth() : to);
    }

    private static ResponseEntity<Map<String, String>> accountingNotReady() {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
            "message", "Accounting reporting is not initialized for the authenticated company.",
            "code", "ACCOUNTING_NOT_READY"));
    }

    private static ResponseEntity<Map<String, String>> invalidRequest(String message) {
        return ResponseEntity.badRequest().body(Map.of(
            "message", message == null ? "Invalid financial reporting request." : message,
            "code", "INVALID_ACCOUNTING_REQUEST"));
    }

    private static ResponseEntity<Map<String, String>> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
            "message", "Unauthorized", "code", "AUTHENTICATION_REQUIRED"));
    }

    private record DateRange(LocalDate from, LocalDate to) {
    }
}
