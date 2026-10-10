package com.indice.erp.maintenance;

import com.indice.erp.auth.AuthSessionUser;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.indice.erp.maintenance.MaintenancePolicy.require;

@Service
public class MaintenanceCostSummaryService {
    public record CurrencyTotal(String currency, long orders, BigDecimal estimated,
        BigDecimal actual, BigDecimal paidServices, boolean complete) {}
    public record Summary(long orders, int limit, boolean limited, List<CurrencyTotal> currencies) {}
    private static final int LIMIT = 500;
    private final MaintenanceRepository db;
    private final MaintenanceAccess access;
    private final MaintenanceCostService costs;

    public MaintenanceCostSummaryService(MaintenanceRepository db, MaintenanceAccess access, MaintenanceCostService costs) {
        this.db = db; this.access = access; this.costs = costs;
    }

    @Transactional(readOnly = true)
    public Summary summary(AuthSessionUser actor, Instant from, Instant to) {
        MaintenanceAccess.manage(actor);
        require(from.isBefore(to) && !to.isAfter(from.plusSeconds(366 * 86400L)), "maintenance_period_invalid");
        var scope = access.filter(actor, "o", "ORDER");
        var args = new ArrayList<Object>(List.of(actor.companyId(), MaintenanceRepository.time(from), MaintenanceRepository.time(to)));
        args.addAll(scope.args());
        String where = " FROM maintenance_orders o WHERE o.company_id=? AND o.status='CLOSED' AND o.closed_at>=? AND o.closed_at<?" + scope.sql();
        long count = db.jdbc().queryForObject("SELECT COUNT(*)" + where, Long.class, args.toArray());
        if (count > LIMIT) return new Summary(count, LIMIT, true, List.of());
        var ids = db.jdbc().queryForList("SELECT o.id" + where + " ORDER BY o.id", Long.class, args.toArray());
        var totals = new TreeMap<String, CurrencyTotal>();
        for (long id : ids) {
            var value = costs.costs(actor, id);
            var old = totals.getOrDefault(value.currency(), new CurrencyTotal(value.currency(), 0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, true));
            boolean complete = old.complete() && value.complete();
            totals.put(value.currency(), new CurrencyTotal(value.currency(), old.orders() + 1,
                old.estimated().add(value.estimated()), complete ? old.actual().add(value.actual()) : null,
                complete ? old.paidServices().add(value.paidServices()) : null, complete));
        }
        return new Summary(count, LIMIT, false, List.copyOf(totals.values()));
    }
}
