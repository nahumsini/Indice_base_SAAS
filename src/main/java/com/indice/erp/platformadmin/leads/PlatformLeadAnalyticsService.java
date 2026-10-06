package com.indice.erp.platformadmin.leads;

import static com.indice.erp.platformadmin.leads.PlatformLeadAnalyticsContracts.*;
import static com.indice.erp.platformadmin.leads.PlatformLeadAnalyticsRepository.rate;

import com.indice.erp.platformadmin.PlatformAdminAccessService;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlatformLeadAnalyticsService {
    private static final Set<String> VIEWS = Set.of("received", "contacted", "scheduled", "diagnosed", "trial",
        "proposal", "won", "lost", "nurture", "sla_missed", "overdue", "unassigned", "missing_action", "uncontacted", "trial_attention");
    private final PlatformLeadAnalyticsRepository repository;
    private final PlatformAdminAccessService access;
    private final Clock clock;

    public PlatformLeadAnalyticsService(PlatformLeadAnalyticsRepository repository, PlatformAdminAccessService access, Clock clock) {
        this.repository = repository; this.access = access; this.clock = clock;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Dashboard dashboard(long actorUserId, int days, String market) {
        access.require(actorUserId, "MANAGE_LEADS");
        var period = period(days, market);
        var from = period.from().atStartOfDay(ZoneOffset.UTC).toInstant();
        var totals = repository.totals(from, period.measuredAt(), market);
        var stages = List.of(
            new Stage("received", totals.received(), rate(totals.received(), totals.received())),
            new Stage("contacted", totals.contacted(), rate(totals.contacted(), totals.received())),
            new Stage("scheduled", totals.scheduled(), rate(totals.scheduled(), totals.received())),
            new Stage("diagnosed", totals.diagnosed(), rate(totals.diagnosed(), totals.received())),
            new Stage("proposal", totals.proposals(), rate(totals.proposals(), totals.received())),
            new Stage("won", totals.won(), rate(totals.won(), totals.received())));
        return new Dashboard(period, totals, new Rates(rate(totals.slaMet(), totals.slaEligible()),
            rate(totals.diagnosed(), totals.received()), rate(totals.won(), totals.proposals())), stages,
            repository.attention(period.measuredAt(), market), repository.breakdown(from, period.measuredAt(), market, false),
            repository.sourceGroups(from, period.measuredAt(), market), repository.breakdown(from, period.measuredAt(), market, true));
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public DetailPage details(long actorUserId, int days, String market, String view, String source,
                              String medium, String campaign, String plan, int page, int pageSize) {
        access.require(actorUserId, "MANAGE_LEADS");
        var period = period(days, market);
        if (!VIEWS.contains(view)) throw new IllegalArgumentException("Unknown analytics view.");
        if (page < 1 || page > 100000 || pageSize < 1 || pageSize > 100)
            throw new IllegalArgumentException("Invalid analytics pagination.");
        var result = repository.details(period.from().atStartOfDay(ZoneOffset.UTC).toInstant(), period.measuredAt(),
            market, view, dimension(source, 100), dimension(medium, 100), dimension(campaign, 150),
            dimension(plan, 32), page, pageSize);
        return new DetailPage(period, view, PlatformLeadAnalyticsRepository.isCurrentView(view), result.items(),
            result.total(), page, pageSize, Math.max(1, (int) Math.ceil(result.total() / (double) pageSize)));
    }

    private Period period(int days, String market) {
        if (!Set.of(7, 30, 90).contains(days)) throw new IllegalArgumentException("Choose a 7, 30 or 90 day period.");
        if (!Set.of("all", "MX", "CA", "OTHER").contains(market)) throw new IllegalArgumentException("Unknown lead market.");
        Instant now = clock.instant();
        LocalDate to = LocalDate.ofInstant(now, ZoneOffset.UTC);
        return new Period(days, to.minusDays(days - 1L), to, market, now);
    }

    private String dimension(String value, int maximum) {
        var result = value == null ? "" : value.trim();
        if (result.length() > maximum) throw new IllegalArgumentException("Analytics filter is too long.");
        return result;
    }
}
