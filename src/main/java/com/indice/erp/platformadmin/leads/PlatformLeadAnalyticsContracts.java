package com.indice.erp.platformadmin.leads;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Platform-owned reporting; a recorded commercial outcome does not grant account access. */
public final class PlatformLeadAnalyticsContracts {
    private PlatformLeadAnalyticsContracts() { }

    public record Period(int days, LocalDate from, LocalDate to, String market, Instant measuredAt) { }
    public record Totals(long received, long contacted, long scheduled, long diagnosed, long trials,
                         long proposals, long won, long lost, long nurture, long slaEligible,
                         long slaMet, BigDecimal averageContactHours) { }
    public record Rates(BigDecimal contactSla, BigDecimal diagnosis, BigDecimal proposalWin) { }
    public record Stage(String code, long count, BigDecimal cohortRate) { }
    public record Attention(long overdue, long unassigned, long missingAction, long uncontacted,
                            long trialsEnding, long trialsExpired) { }
    public record Breakdown(String source, String medium, String campaign, String plan,
                            long received, long diagnosed, long proposals, long won,
                            BigDecimal diagnosisRate, BigDecimal proposalWinRate) { }
    public record Dashboard(Period period, Totals totals, Rates rates, List<Stage> stages,
                            Attention attention, List<Breakdown> sources, long sourceGroups,
                            List<Breakdown> plans) { }
    public record LeadRow(long id, String companyName, String status, String market,
                          String assignedName, String source, String medium, String campaign,
                          String plan, Instant createdAt, Instant nextActionAt, Instant firstContactAt) { }
    public record DetailPage(Period period, String view, boolean currentBacklog, List<LeadRow> items,
                             long total, int page, int pageSize, int totalPages) { }
}
