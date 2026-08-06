package com.indice.erp.kpis.currency;

import com.indice.erp.auth.SessionAuthService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import java.util.LinkedHashMap;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/kpis")
public class BasicModuleKpiCurrencyController {

    private final SessionAuthService sessionAuthService;
    private final BasicModuleKpiCurrencyService service;

    public BasicModuleKpiCurrencyController(SessionAuthService sessionAuthService, BasicModuleKpiCurrencyService service) {
        this.sessionAuthService = sessionAuthService;
        this.service = service;
    }

    @GetMapping("/monetary-aggregate")
    public ResponseEntity<?> aggregate(
        HttpSession session,
        @RequestParam String metric,
        @RequestParam(required = false) String preferredCurrency,
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to,
        @RequestParam(required = false) String ids
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        try {
            return ResponseEntity.ok(service.aggregate(user.get().companyId(), metric, preferredCurrency, from, to, ids, ids != null));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/monetary-aggregate/query")
    public ResponseEntity<?> aggregateQuery(HttpSession session, @RequestBody MonetaryAggregateQuery query) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        try {
            var ids = query.ids() == null ? null : query.ids().stream().map(String::valueOf).reduce((left, right) -> left + "," + right).orElse(null);
            return ResponseEntity.ok(service.aggregate(
                user.get().companyId(), query.metric(), query.preferredCurrency(), query.from(), query.to(), ids, query.ids() != null
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/monetary-aggregate/batch")
    public ResponseEntity<?> aggregateBatch(HttpSession session, @RequestBody MonetaryAggregateBatchQuery batch) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        try {
            if (batch.queries() == null || batch.queries().isEmpty() || batch.queries().size() > 100) {
                throw new IllegalArgumentException("queries must contain between 1 and 100 items");
            }
            var results = new LinkedHashMap<String, KpiMonetaryAggregate>();
            for (var query : batch.queries()) {
                if (query.key() == null || query.key().isBlank() || results.containsKey(query.key())) {
                    throw new IllegalArgumentException("each query requires a unique key");
                }
                var ids = query.ids() == null ? null : query.ids().stream().map(String::valueOf).reduce((left, right) -> left + "," + right).orElse(null);
                results.put(query.key(), service.aggregate(
                    user.get().companyId(), query.metric(), query.preferredCurrency(), query.from(), query.to(), ids, query.ids() != null
                ));
            }
            return ResponseEntity.ok(Map.of("results", results));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    public record MonetaryAggregateQuery(
        String metric,
        String preferredCurrency,
        String from,
        String to,
        java.util.List<Long> ids
    ) {
    }

    public record MonetaryAggregateBatchItem(
        String key,
        String metric,
        String preferredCurrency,
        String from,
        String to,
        java.util.List<Long> ids
    ) {
    }

    public record MonetaryAggregateBatchQuery(java.util.List<MonetaryAggregateBatchItem> queries) {
    }
}
