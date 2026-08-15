package com.indice.erp.distributorportal;

import com.indice.erp.auth.AuthSessionUser;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class DistributorPortalService {

    private static final Set<String> ATTENTION_STATUSES = Set.of("past_due", "unpaid", "incomplete");
    private static final Set<String> ACTIVE_STATUSES = Set.of("active");

    private final JdbcTemplate jdbcTemplate;
    private final DistributorPortfolioAccessPolicy accessPolicy;
    private final Clock clock;

    public DistributorPortalService(
        JdbcTemplate jdbcTemplate,
        DistributorPortfolioAccessPolicy accessPolicy,
        Clock clock
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.accessPolicy = accessPolicy;
        this.clock = clock;
    }

    public DistributorPortalResponse.Context context(AuthSessionUser actor) {
        var distributor = accessPolicy.requireDistributor(actor);
        return new DistributorPortalResponse.Context(
            distributor.companyId(),
            distributor.companyName(),
            actor.userName(),
            "DISTRIBUTOR",
            normalize(actor.role()),
            List.of("CONTRACTS_ACCESS", "CONSULTING", "SYSTEM_TICKETS")
        );
    }

    public DistributorPortalResponse.Portfolio portfolio(AuthSessionUser actor, String rawQuery, String rawStage) {
        var distributor = accessPolicy.requireDistributor(actor);
        var query = normalize(rawQuery);
        var stage = normalizeStage(rawStage);
        var allClients = loadClients(distributor.companyId());
        var clients = allClients.stream()
            .filter(client -> query.isBlank()
                || normalize(client.company_name()).contains(query)
                || normalize(client.owner_email()).contains(query)
                || String.valueOf(client.company_id()).equals(query))
            .filter(client -> "ALL".equals(stage) || stage.equals(client.commercial_stage()))
            .toList();

        var summary = new DistributorPortalResponse.Summary(
            allClients.size(),
            countStage(allClients, "PROSPECT"),
            countStages(allClients, Set.of("DEMO", "TRIAL")),
            countStage(allClients, "ACTIVE"),
            countStage(allClients, "ATTENTION")
        );
        return new DistributorPortalResponse.Portfolio(summary, clients, clients.size());
    }

    private List<DistributorPortalResponse.Client> loadClients(long distributorCompanyId) {
        return jdbcTemplate.query(
            """
                SELECT client.id,
                       client.name,
                       COALESCE(ownership_owner.email, (
                           SELECT member_user.email
                           FROM user_companies member
                           JOIN users member_user ON member_user.id = member.user_id
                           WHERE member.company_id = client.id
                             AND LOWER(COALESCE(member.status, 'active')) = 'active'
                           ORDER BY FIELD(LOWER(COALESCE(member.role, 'user')),
                               'root', 'superadmin', 'owner', 'admin', 'manager', 'user'), member.id
                           LIMIT 1
                       ), '') AS owner_email,
                       signup.country_code,
                       subscription.status AS billing_status,
                       subscription.offer_code,
                       subscription.billing_interval,
                       subscription.currency,
                       subscription.last_payment_status,
                       subscription.trial_ends_at,
                       (
                           SELECT MAX(trial.ends_at)
                           FROM company_trial_product_grants trial
                           WHERE trial.company_id = client.id
                             AND trial.status = 'ACTIVE'
                       ) AS granted_trial_ends_at,
                       (
                           SELECT MAX(benefit.ends_at)
                           FROM company_benefit_grants benefit
                           WHERE benefit.company_id = client.id
                             AND benefit.benefit_type = 'PRODUCT'
                             AND benefit.source_type IN ('COURTESY', 'PROMOTION', 'SUPPORT', 'TEST')
                             AND benefit.status = 'ACTIVE'
                             AND benefit.ends_at IS NOT NULL
                       ) AS local_demo_ends_at,
                       EXISTS (
                           SELECT 1
                           FROM company_benefit_grants benefit
                           WHERE benefit.company_id = client.id
                             AND benefit.benefit_type = 'PRODUCT'
                             AND benefit.status = 'ACTIVE'
                             AND benefit.ends_at IS NULL
                       ) AS permanent_demo,
                       subscription.current_period_ends_at,
                       lifecycle.state AS lifecycle_state,
                       lifecycle.access_mode,
                       COALESCE(seats.included_seats, 0)
                       + COALESCE(seats.purchased_extra_seats, 0)
                       + COALESCE((
                           SELECT SUM(seat_benefit.quantity)
                           FROM company_benefit_grants seat_benefit
                           WHERE seat_benefit.company_id = client.id
                             AND seat_benefit.benefit_type = 'SEAT'
                             AND seat_benefit.status = 'ACTIVE'
                             AND seat_benefit.starts_at <= CURRENT_TIMESTAMP(6)
                             AND (seat_benefit.ends_at IS NULL OR seat_benefit.ends_at > CURRENT_TIMESTAMP(6))
                       ), 0) AS seat_capacity,
                       (SELECT COUNT(*)
                          FROM user_companies membership
                         WHERE membership.company_id = client.id
                           AND LOWER(COALESCE(membership.status, 'active')) = 'active') AS active_members,
                       (SELECT COUNT(*)
                          FROM company_benefit_grants benefit
                         WHERE benefit.company_id = client.id
                           AND benefit.status = 'ACTIVE'
                           AND benefit.starts_at <= CURRENT_TIMESTAMP(6)
                           AND (benefit.ends_at IS NULL OR benefit.ends_at > CURRENT_TIMESTAMP(6))) AS active_benefits,
                       (SELECT COUNT(*)
                          FROM company_benefit_grants benefit
                         WHERE benefit.company_id = client.id
                           AND benefit.status = 'ACTIVE'
                           AND benefit.starts_at <= CURRENT_TIMESTAMP(6)
                           AND benefit.ends_at > CURRENT_TIMESTAMP(6)) AS temporary_benefits,
                       (SELECT GROUP_CONCAT(DISTINCT module.name ORDER BY module.sort_order SEPARATOR '|')
                          FROM company_module_entitlements entitlement
                          JOIN modules module ON module.slug = entitlement.module_slug
                         WHERE entitlement.company_id = client.id
                           AND LOWER(COALESCE(entitlement.status, 'active')) = 'active') AS module_names
                FROM companies client
                LEFT JOIN company_ownerships ownership
                  ON ownership.company_id = client.id AND ownership.status = 'ACTIVE'
                LEFT JOIN users ownership_owner ON ownership_owner.id = ownership.owner_user_id
                LEFT JOIN company_billing_subscriptions subscription
                  ON subscription.id = (
                      SELECT MAX(candidate.id)
                      FROM company_billing_subscriptions candidate
                      WHERE candidate.company_id = client.id
                  )
                LEFT JOIN billing_signup_intents signup ON signup.id = subscription.signup_intent_id
                LEFT JOIN company_commercial_states lifecycle ON lifecycle.company_id = client.id
                LEFT JOIN company_seat_states seats ON seats.company_id = client.id
                WHERE UPPER(COALESCE(client.commercial_account_type, '')) = 'SUPER_ADMIN'
                  AND (
                      client.distributor_company_id = ?
                      OR (
                          client.distributor_company_id IS NULL
                          AND client.created_by_distributor_company_id = ?
                      )
                  )
                  AND client.id <> ?
                ORDER BY client.name ASC, client.id ASC
                """,
            (rs, rowNum) -> {
                var billingStatus = nullable(rs.getString("billing_status"));
                var lifecycleState = nullable(rs.getString("lifecycle_state"));
                var activeBenefits = rs.getInt("active_benefits");
                var temporaryBenefits = rs.getInt("temporary_benefits");
                var stripeTrialEndsAt = instant(rs.getTimestamp("trial_ends_at"));
                var grantedTrialEndsAt = instant(rs.getTimestamp("granted_trial_ends_at"));
                var localDemoEndsAt = instant(rs.getTimestamp("local_demo_ends_at"));
                var stripeTrial = "trialing".equalsIgnoreCase(billingStatus) && stripeTrialEndsAt != null;
                var localDemo = billingStatus == null && localDemoEndsAt != null && !rs.getBoolean("permanent_demo");
                var grantedTrial = !stripeTrial && !localDemo && grantedTrialEndsAt != null;
                var effectiveTrialEndsAt = stripeTrial
                    ? stripeTrialEndsAt
                    : localDemo
                        ? localDemoEndsAt
                        : grantedTrialEndsAt;
                var trialSource = stripeTrial ? "STRIPE" : (localDemo || grantedTrial) ? "LOCAL_DEMO" : null;
                return new DistributorPortalResponse.Client(
                    rs.getLong("id"),
                    rs.getString("name"),
                    nullable(rs.getString("owner_email")),
                    nullable(rs.getString("country_code")),
                    commercialStage(billingStatus, lifecycleState, activeBenefits, temporaryBenefits),
                    billingStatus,
                    nullable(rs.getString("offer_code")),
                    nullable(rs.getString("billing_interval")),
                    nullable(rs.getString("currency")),
                    nullable(rs.getString("access_mode")),
                    split(rs.getString("module_names")),
                    rs.getInt("active_members"),
                    rs.getInt("seat_capacity"),
                    nullable(rs.getString("last_payment_status")),
                    nextEvent(effectiveTrialEndsAt, rs.getTimestamp("current_period_ends_at")),
                    effectiveTrialEndsAt,
                    trialSource,
                    remainingDays(effectiveTrialEndsAt),
                    trialSource != null,
                    rs.getBoolean("permanent_demo")
                );
            },
            distributorCompanyId,
            distributorCompanyId,
            distributorCompanyId
        );
    }

    private String commercialStage(String billingStatus, String lifecycleState, int activeBenefits, int temporaryBenefits) {
        var billing = normalize(billingStatus);
        var lifecycle = normalize(lifecycleState);
        if (ATTENTION_STATUSES.contains(billing)) return "ATTENTION";
        if (Set.of("suspended", "cancelled", "retention").contains(lifecycle)) return "INACTIVE";
        if (ACTIVE_STATUSES.contains(billing)) return "ACTIVE";
        if ("trialing".equals(billing)) return "TRIAL";
        if (temporaryBenefits > 0) return "DEMO";
        if (activeBenefits > 0) return "ACTIVE";
        return "PROSPECT";
    }

    private int countStage(List<DistributorPortalResponse.Client> clients, String stage) {
        return (int) clients.stream().filter(client -> stage.equals(client.commercial_stage())).count();
    }

    private int countStages(List<DistributorPortalResponse.Client> clients, Set<String> stages) {
        return (int) clients.stream().filter(client -> stages.contains(client.commercial_stage())).count();
    }

    private String normalizeStage(String value) {
        var normalized = value == null ? "ALL" : value.trim().toUpperCase(Locale.ROOT);
        return Set.of("ALL", "PROSPECT", "DEMO", "TRIAL", "ACTIVE", "ATTENTION", "INACTIVE").contains(normalized)
            ? normalized
            : "ALL";
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String nullable(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private List<String> split(String value) {
        return value == null || value.isBlank()
            ? List.of()
            : Arrays.stream(value.split("\\|"))
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .distinct()
                .toList();
    }

    private Instant nextEvent(Instant trialEnd, Timestamp periodEnd) {
        if (trialEnd != null) return trialEnd;
        return periodEnd == null ? null : periodEnd.toInstant();
    }

    private Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }

    private int remainingDays(Instant endsAt) {
        if (endsAt == null || !endsAt.isAfter(clock.instant())) return 0;
        var seconds = Duration.between(clock.instant(), endsAt).getSeconds();
        return Math.toIntExact((seconds + 86_399L) / 86_400L);
    }
}
