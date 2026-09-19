package com.indice.erp.hr.payroll;

import static com.indice.erp.hr.shared.HrPayloadUtils.nullable;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseBigDecimal;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseDate;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseLong;
import static com.indice.erp.hr.shared.HrPayloadUtils.safe;
import static com.indice.erp.hr.shared.HrPayloadUtils.stringValue;

import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.finance.expenses.ExpenseService;
import com.indice.erp.finance.expenses.ExpenseType;
import com.indice.erp.finance.expenses.dto.CreateExpenseRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.hr.HrAccessDeniedException;
import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.incentives.HrIncentivePayrollSupplyService;
import com.indice.erp.hr.payroll.engine.PayrollAttendanceInputService;
import com.indice.erp.hr.payroll.engine.PayrollCalculatedLineItem;
import com.indice.erp.hr.payroll.engine.PayrollCalculationContext;
import com.indice.erp.hr.payroll.engine.PayrollCalculationEngine;
import com.indice.erp.hr.payroll.engine.PayrollFiscalAccumulatorService;
import com.indice.erp.hr.payroll.engine.PayrollCalculationResult;
import com.indice.erp.hr.payroll.engine.PayrollLineCalculationResult;
import com.indice.erp.hr.payroll.engine.PayrollManualAdjustmentService;
import com.indice.erp.hr.payroll.engine.PayrollRuleResolver;
import com.indice.erp.hr.payroll.engine.PayrollSnapshotService;
import com.indice.erp.hr.payroll.reporting.co.ColombiaPayrollReportingService;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.stream.Collectors;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HrPayrollService {

    private static final String PAYROLL_TREATMENT_FISCAL = "fiscal_payroll";
    private static final String PAYROLL_TREATMENT_OPERATIONAL = "operational_payroll";
    private static final String PAYROLL_TREATMENT_ACCOUNTS_PAYABLE = "accounts_payable";
    private static final String PAYROLL_TREATMENT_NO_PAYROLL = "no_payroll";
    private static final String PAYMENT_ROUTE_PAYROLL = "payroll";
    private static final String PAYMENT_ROUTE_EXPENSES = "expenses";
    private static final String PAYMENT_ROUTE_NONE = "none";

    private final JdbcTemplate jdbcTemplate;
    private final HrPayrollScopeAccess hrPayrollScopeAccess;
    private final PayrollCalculationEngine payrollCalculationEngine;
    private final PayrollAttendanceInputService payrollAttendanceInputService;
    private final PayrollFiscalAccumulatorService payrollFiscalAccumulatorService;
    private final PayrollManualAdjustmentService payrollManualAdjustmentService;
    private final PayrollSnapshotService payrollSnapshotService;
    private final PayrollRuleResolver payrollRuleResolver;
    private final ColombiaPayrollReportingService colombiaPayrollReportingService;
    private final HrIncentivePayrollSupplyService hrIncentivePayrollSupplyService;
    private final ExpenseService expenseService;
    private final HrPayrollAuthorizationService authorizationService;

    public HrPayrollService(
        JdbcTemplate jdbcTemplate,
        HrPayrollScopeAccess hrPayrollScopeAccess,
        PayrollCalculationEngine payrollCalculationEngine,
        PayrollAttendanceInputService payrollAttendanceInputService,
        PayrollFiscalAccumulatorService payrollFiscalAccumulatorService,
        PayrollManualAdjustmentService payrollManualAdjustmentService,
        PayrollSnapshotService payrollSnapshotService,
        PayrollRuleResolver payrollRuleResolver,
        ColombiaPayrollReportingService colombiaPayrollReportingService,
        HrIncentivePayrollSupplyService hrIncentivePayrollSupplyService,
        ExpenseService expenseService,
        HrPayrollAuthorizationService authorizationService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.hrPayrollScopeAccess = hrPayrollScopeAccess;
        this.payrollCalculationEngine = payrollCalculationEngine;
        this.payrollAttendanceInputService = payrollAttendanceInputService;
        this.payrollFiscalAccumulatorService = payrollFiscalAccumulatorService;
        this.payrollManualAdjustmentService = payrollManualAdjustmentService;
        this.payrollSnapshotService = payrollSnapshotService;
        this.payrollRuleResolver = payrollRuleResolver;
        this.colombiaPayrollReportingService = colombiaPayrollReportingService;
        this.hrIncentivePayrollSupplyService = hrIncentivePayrollSupplyService;
        this.expenseService = expenseService;
        this.authorizationService = authorizationService;
    }

    public Map<String, Object> overview(long companyId) {
        return overview(companyId, HrOperationalScope.corporateOffice());
    }

    public Map<String, Object> overview(AuthSessionUser currentUser) {
        return overview(currentUser.companyId(), hrPayrollScopeAccess.resolve(currentUser));
    }

    private Map<String, Object> overview(long companyId, HrOperationalScope scope) {
        reconcilePaidPayrollRuns(companyId);
        var preferences = ensurePreferences(companyId);
        var runs = loadRuns(companyId, scope);

        int draftCount = 0;
        int approvedCount = 0;
        int paidCount = 0;
        int cancelledCount = 0;
        var grossTotalsByCurrency = new LinkedHashMap<String, BigDecimal>();
        var netTotalsByCurrency = new LinkedHashMap<String, BigDecimal>();

        for (var run : runs) {
            switch (run.status()) {
                case "draft", "processed" -> draftCount++;
                case "approved" -> approvedCount++;
                case "paid" -> paidCount++;
                case "cancelled" -> cancelledCount++;
                default -> {
                }
            }

            if (!"cancelled".equals(run.status())) {
                for (var signal : loadRunCurrencySignals(run.id())) {
                    var currency = resolveCurrencyCode(signal.country());
                    grossTotalsByCurrency.merge(currency, signal.grossAmount(), BigDecimal::add);
                    netTotalsByCurrency.merge(currency, signal.netAmount(), BigDecimal::add);
                }
            }
        }

        var singleCurrency = netTotalsByCurrency.size() == 1;
        var totalGross = singleCurrency
            ? grossTotalsByCurrency.values().stream().findFirst().orElse(BigDecimal.ZERO)
            : BigDecimal.ZERO;
        var totalNet = singleCurrency
            ? netTotalsByCurrency.values().stream().findFirst().orElse(BigDecimal.ZERO)
            : BigDecimal.ZERO;

        var summary = new LinkedHashMap<String, Object>();
        summary.put("runs_count", runs.size());
        summary.put("draft_count", draftCount);
        // Compatibility field for older clients. Recalculation is now an action,
        // not a visible lifecycle state.
        summary.put("processed_count", 0);
        summary.put("approved_count", approvedCount);
        summary.put("paid_count", paidCount);
        summary.put("cancelled_count", cancelledCount);
        summary.put("total_gross_amount", scaled(totalGross));
        summary.put("total_net_amount", scaled(totalNet));
        summary.put("mixed_currency", netTotalsByCurrency.size() > 1);
        summary.put("gross_totals_by_currency", scaledCurrencyTotals(grossTotalsByCurrency));
        summary.put("net_totals_by_currency", scaledCurrencyTotals(netTotalsByCurrency));

        var body = new LinkedHashMap<String, Object>();
        body.put("summary", summary);
        body.put("preferences", toPreferencesMap(preferences));
        body.put("recent_runs", runs.stream().limit(6).map(this::toRunSummaryMap).toList());
        return body;
    }

    public Map<String, Object> getPreferences(long companyId) {
        return toPreferencesMap(ensurePreferences(companyId));
    }

    @Transactional
    public Map<String, Object> savePreferences(long companyId, Map<String, Object> payload) {
        var current = ensurePreferences(companyId);
        var groupingMode = normalizeGroupingMode(stringValue(payload, "grouping_mode"), current.groupingMode());
        var defaultDailyHours = normalizePositiveDecimal(parseBigDecimal(payload, "default_daily_hours"), current.defaultDailyHours(), "default_daily_hours");
        var payLeaveDays = parseBoolean(payload.getOrDefault("pay_leave_days", current.payLeaveDays()));
        var weeklyStartDay = normalizeIntegerInRange(payload.get("weekly_start_day"), current.weeklyStartDay(), 1, 7, "weekly_start_day");
        var biweeklyFirstDay = normalizeIntegerInRange(payload.get("biweekly_first_day"), current.biweeklyFirstDay(), 1, 27, "biweekly_first_day");
        var biweeklySecondDay = normalizeIntegerInRange(payload.get("biweekly_second_day"), current.biweeklySecondDay(), 2, 28, "biweekly_second_day");
        if (biweeklySecondDay <= biweeklyFirstDay) {
            throw new IllegalArgumentException("biweekly_second_day must be after biweekly_first_day.");
        }
        var monthlyStartDay = normalizeIntegerInRange(payload.get("monthly_start_day"), current.monthlyStartDay(), 1, 31, "monthly_start_day");
        var isrRate = normalizeRate(parseBigDecimal(payload, "isr_rate"), current.isrRate(), "isr_rate");
        var imssUserRate = normalizeRate(parseBigDecimal(payload, "imss_user_rate"), current.imssUserRate(), "imss_user_rate");
        var infonavitUserRate = normalizeRate(parseBigDecimal(payload, "infonavit_user_rate"), current.infonavitUserRate(), "infonavit_user_rate");
        var imssEmployerRate = normalizeRate(parseBigDecimal(payload, "imss_employer_rate"), current.imssEmployerRate(), "imss_employer_rate");
        var infonavitEmployerRate = normalizeRate(parseBigDecimal(payload, "infonavit_employer_rate"), current.infonavitEmployerRate(), "infonavit_employer_rate");
        var sarEmployerRate = normalizeRate(parseBigDecimal(payload, "sar_employer_rate"), current.sarEmployerRate(), "sar_employer_rate");

        jdbcTemplate.update(
            """
                UPDATE payroll_preferences
                SET grouping_mode = ?,
                    default_daily_hours = ?,
                    pay_leave_days = ?,
                    weekly_start_day = ?,
                    biweekly_first_day = ?,
                    biweekly_second_day = ?,
                    monthly_start_day = ?,
                    isr_rate = ?,
                    imss_user_rate = ?,
                    infonavit_user_rate = ?,
                    imss_employer_rate = ?,
                    infonavit_employer_rate = ?,
                    sar_employer_rate = ?
                WHERE company_id = ?
                """,
            groupingMode,
            defaultDailyHours,
            payLeaveDays,
            weeklyStartDay,
            biweeklyFirstDay,
            biweeklySecondDay,
            monthlyStartDay,
            isrRate,
            imssUserRate,
            infonavitUserRate,
            imssEmployerRate,
            infonavitEmployerRate,
            sarEmployerRate,
            companyId
        );

        return toPreferencesMap(ensurePreferences(companyId));
    }

    public Map<String, Object> getColombiaConfig(AuthSessionUser currentUser) {
        var row = loadCompanyCountryConfig(currentUser.companyId(), "CO");
        return toColombiaConfigMap(row);
    }

    @Transactional
    public Map<String, Object> saveColombiaConfig(AuthSessionUser currentUser, Map<String, Object> payload) {
        authorizationService.require(currentUser, HrPayrollAuthorizationService.Action.CONFIGURE);
        var current = loadCompanyCountryConfig(currentUser.companyId(), "CO");
        var defaultArlClass = normalizeArlClass(
            parseBigDecimal(payload, "default_arl_class", "defaultArlClass"),
            current == null ? null : current.defaultArlClass(),
            "default_arl_class"
        );
        var compensationFundCode = payloadText(payload, current == null ? "" : current.compensationFundCode(), "compensation_fund_code", "compensationFundCode");
        var compensationFundName = payloadText(payload, current == null ? "" : current.compensationFundName(), "compensation_fund_name", "compensationFundName");
        var employerHealthExemptionApplies = payloadNullableBoolean(payload, current == null ? null : current.employerHealthExemptionApplies(), "employer_health_exemption_applies", "employerHealthExemptionApplies");
        var senaApplies = payloadNullableBoolean(payload, current == null ? null : current.senaApplies(), "sena_applies", "senaApplies");
        var icbfApplies = payloadNullableBoolean(payload, current == null ? null : current.icbfApplies(), "icbf_applies", "icbfApplies");
        var ccfApplies = payloadNullableBoolean(payload, current == null ? null : current.ccfApplies(), "ccf_applies", "ccfApplies");
        var metadata = payloadObject(payload, current == null ? Map.of() : current.metadata(), "metadata", "metadata_json");

        jdbcTemplate.update(
            """
                INSERT INTO payroll_company_country_configs
                (company_id, country_code, default_arl_class, compensation_fund_code, compensation_fund_name,
                 employer_health_exemption_applies, sena_applies, icbf_applies, ccf_applies, metadata_json)
                VALUES (?, 'CO', ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  default_arl_class = VALUES(default_arl_class),
                  compensation_fund_code = VALUES(compensation_fund_code),
                  compensation_fund_name = VALUES(compensation_fund_name),
                  employer_health_exemption_applies = VALUES(employer_health_exemption_applies),
                  sena_applies = VALUES(sena_applies),
                  icbf_applies = VALUES(icbf_applies),
                  ccf_applies = VALUES(ccf_applies),
                  metadata_json = VALUES(metadata_json)
                """,
            currentUser.companyId(),
            defaultArlClass,
            nullable(compensationFundCode),
            nullable(compensationFundName),
            employerHealthExemptionApplies,
            senaApplies,
            icbfApplies,
            ccfApplies,
            payrollSnapshotService.jsonValue(metadata)
        );

        return getColombiaConfig(currentUser);
    }

    public Map<String, Object> getColombiaEmployeeProfile(AuthSessionUser currentUser, long userCompanyId) {
        requireHrUserInScope(currentUser, userCompanyId);
        var profile = loadEmployeeCountryProfile(currentUser.companyId(), userCompanyId, "CO");
        return toColombiaEmployeeProfileMap(userCompanyId, profile);
    }

    @Transactional
    public Map<String, Object> saveColombiaEmployeeProfile(
        AuthSessionUser currentUser,
        long userCompanyId,
        Map<String, Object> payload
    ) {
        authorizationService.require(currentUser, HrPayrollAuthorizationService.Action.PREPARE);
        requireHrUserInScope(currentUser, userCompanyId);
        var current = loadEmployeeCountryProfile(currentUser.companyId(), userCompanyId, "CO");
        var contributorType = payloadText(payload, current == null ? "" : current.contributorType(), "contributor_type", "contributorType");
        var contributorSubtype = payloadText(payload, current == null ? "" : current.contributorSubtype(), "contributor_subtype", "contributorSubtype");
        var integralSalary = payloadBoolean(payload, current != null && current.integralSalary(), "integral_salary", "integralSalary");
        var arlClass = normalizeArlClass(
            parseBigDecimal(payload, "arl_class", "arlClass"),
            current == null ? null : current.arlClass(),
            "arl_class"
        );
        var epsCode = payloadText(payload, current == null ? "" : current.epsCode(), "eps_code", "epsCode");
        var epsName = payloadText(payload, current == null ? "" : current.epsName(), "eps_name", "epsName");
        var afpCode = payloadText(payload, current == null ? "" : current.afpCode(), "afp_code", "afpCode");
        var afpName = payloadText(payload, current == null ? "" : current.afpName(), "afp_name", "afpName");
        var compensationFundCode = payloadText(payload, current == null ? "" : current.compensationFundCode(), "compensation_fund_code", "compensationFundCode");
        var compensationFundName = payloadText(payload, current == null ? "" : current.compensationFundName(), "compensation_fund_name", "compensationFundName");
        var employerHealthExemptionApplies = payloadNullableBoolean(payload, current == null ? null : current.employerHealthExemptionApplies(), "employer_health_exemption_applies", "employerHealthExemptionApplies");
        var senaApplies = payloadNullableBoolean(payload, current == null ? null : current.senaApplies(), "sena_applies", "senaApplies");
        var icbfApplies = payloadNullableBoolean(payload, current == null ? null : current.icbfApplies(), "icbf_applies", "icbfApplies");
        var ccfApplies = payloadNullableBoolean(payload, current == null ? null : current.ccfApplies(), "ccf_applies", "ccfApplies");
        var withholdingProcedure = normalizeColombiaWithholdingProcedure(payloadText(payload, current == null ? "procedure_1" : current.withholdingProcedure(), "withholding_procedure", "withholdingProcedure"));
        var dependentsMonthlyDeduction = normalizeNonNegativeMoney(parseBigDecimal(payload, "dependents_monthly_deduction", "dependentsMonthlyDeduction"), current == null ? BigDecimal.ZERO : current.dependentsMonthlyDeduction(), "dependents_monthly_deduction");
        var prepaidMedicineMonthly = normalizeNonNegativeMoney(parseBigDecimal(payload, "prepaid_medicine_monthly", "prepaidMedicineMonthly"), current == null ? BigDecimal.ZERO : current.prepaidMedicineMonthly(), "prepaid_medicine_monthly");
        var housingInterestMonthly = normalizeNonNegativeMoney(parseBigDecimal(payload, "housing_interest_monthly", "housingInterestMonthly"), current == null ? BigDecimal.ZERO : current.housingInterestMonthly(), "housing_interest_monthly");
        var voluntaryPensionMonthly = normalizeNonNegativeMoney(parseBigDecimal(payload, "voluntary_pension_monthly", "voluntaryPensionMonthly"), current == null ? BigDecimal.ZERO : current.voluntaryPensionMonthly(), "voluntary_pension_monthly");
        var afcMonthly = normalizeNonNegativeMoney(parseBigDecimal(payload, "afc_monthly", "afcMonthly"), current == null ? BigDecimal.ZERO : current.afcMonthly(), "afc_monthly");
        var otherExemptIncomeMonthly = normalizeNonNegativeMoney(parseBigDecimal(payload, "other_exempt_income_monthly", "otherExemptIncomeMonthly"), current == null ? BigDecimal.ZERO : current.otherExemptIncomeMonthly(), "other_exempt_income_monthly");
        var procedure2FixedRate = normalizeNullableRate(
            parseBigDecimal(payload, "procedure_2_fixed_rate", "procedure2FixedRate"),
            current == null ? BigDecimal.ZERO : current.procedure2FixedRate(),
            "procedure_2_fixed_rate"
        );
        var metadata = payloadObject(payload, current == null ? Map.of() : current.metadata(), "metadata", "metadata_json");

        jdbcTemplate.update(
            """
                INSERT INTO payroll_employee_country_profiles
                (company_id, user_company_id, country_code, contributor_type, contributor_subtype, integral_salary,
                 arl_class, eps_code, eps_name, afp_code, afp_name, compensation_fund_code, compensation_fund_name,
                 employer_health_exemption_applies, sena_applies, icbf_applies, ccf_applies, withholding_procedure,
                 dependents_monthly_deduction, prepaid_medicine_monthly, housing_interest_monthly, voluntary_pension_monthly,
                 afc_monthly, other_exempt_income_monthly, procedure_2_fixed_rate, metadata_json)
                VALUES (?, ?, 'CO', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  contributor_type = VALUES(contributor_type),
                  contributor_subtype = VALUES(contributor_subtype),
                  integral_salary = VALUES(integral_salary),
                  arl_class = VALUES(arl_class),
                  eps_code = VALUES(eps_code),
                  eps_name = VALUES(eps_name),
                  afp_code = VALUES(afp_code),
                  afp_name = VALUES(afp_name),
                  compensation_fund_code = VALUES(compensation_fund_code),
                  compensation_fund_name = VALUES(compensation_fund_name),
                  employer_health_exemption_applies = VALUES(employer_health_exemption_applies),
                  sena_applies = VALUES(sena_applies),
                  icbf_applies = VALUES(icbf_applies),
                  ccf_applies = VALUES(ccf_applies),
                  withholding_procedure = VALUES(withholding_procedure),
                  dependents_monthly_deduction = VALUES(dependents_monthly_deduction),
                  prepaid_medicine_monthly = VALUES(prepaid_medicine_monthly),
                  housing_interest_monthly = VALUES(housing_interest_monthly),
                  voluntary_pension_monthly = VALUES(voluntary_pension_monthly),
                  afc_monthly = VALUES(afc_monthly),
                  other_exempt_income_monthly = VALUES(other_exempt_income_monthly),
                  procedure_2_fixed_rate = VALUES(procedure_2_fixed_rate),
                  metadata_json = VALUES(metadata_json)
                """,
            currentUser.companyId(),
            userCompanyId,
            nullable(contributorType),
            nullable(contributorSubtype),
            integralSalary,
            arlClass,
            nullable(epsCode),
            nullable(epsName),
            nullable(afpCode),
            nullable(afpName),
            nullable(compensationFundCode),
            nullable(compensationFundName),
            employerHealthExemptionApplies,
            senaApplies,
            icbfApplies,
            ccfApplies,
            withholdingProcedure,
            dependentsMonthlyDeduction,
            prepaidMedicineMonthly,
            housingInterestMonthly,
            voluntaryPensionMonthly,
            afcMonthly,
            otherExemptIncomeMonthly,
            procedure2FixedRate,
            payrollSnapshotService.jsonValue(metadata)
        );

        return getColombiaEmployeeProfile(currentUser, userCompanyId);
    }

    public Map<String, Object> listColombiaNovelties(
        AuthSessionUser currentUser,
        Long userCompanyId,
        String periodFrom,
        String periodTo,
        String status
    ) {
        if (userCompanyId != null) {
            requireHrUserInScope(currentUser, userCompanyId);
        }
        var from = parseOptionalDate(periodFrom);
        var to = parseOptionalDate(periodTo);
        if (from != null && to != null && to.isBefore(from)) {
            throw new IllegalArgumentException("period_to must be on or after period_from.");
        }

        var scope = hrPayrollScopeAccess.resolve(currentUser);
        var params = new ArrayList<Object>();
        params.add(currentUser.companyId());

        var sql = new StringBuilder("""
            SELECT n.id,
                   n.company_id,
                   n.user_company_id,
                   n.country_code,
                   COALESCE(e.user_code, '') AS user_code,
                   COALESCE(e.full_name, '') AS user_name,
                   COALESCE(n.novelty_code, '') AS novelty_code,
                   COALESCE(n.novelty_label, '') AS novelty_label,
                   n.start_date,
                   n.end_date,
                   COALESCE(n.days, 0) AS days,
                   COALESCE(n.hours, 0) AS hours,
                   n.paid,
                   n.affects_ibc,
                   COALESCE(n.ibc_impact_amount, 0) AS ibc_impact_amount,
                   COALESCE(n.source, '') AS source,
                   COALESCE(n.status, '') AS status,
                   n.metadata_json,
                   n.created_at,
                   n.updated_at
            FROM payroll_employee_country_novelties n
            JOIN hr_users e
              ON e.company_id = n.company_id
             AND e.id = n.user_company_id
            WHERE n.company_id = ?
              AND n.country_code = 'CO'
            """);

        if (userCompanyId != null) {
            sql.append(" AND n.user_company_id = ?\n");
            params.add(userCompanyId);
        }
        appendNoveltyStatusPredicate(sql, params, status);
        if (from != null) {
            sql.append(" AND (n.end_date IS NULL OR n.end_date >= ?)\n");
            params.add(from);
        }
        if (to != null) {
            sql.append(" AND n.start_date <= ?\n");
            params.add(to);
        }
        sql.append(scope.hrUserPredicate("e"));
        params.addAll(scope.hrUserParameters());
        sql.append(" ORDER BY n.start_date DESC, n.id DESC");

        var items = jdbcTemplate.query(sql.toString(), (rs, rowNum) -> toColombiaNoveltyMap(mapColombiaNoveltyRow(rs)), params.toArray());
        return Map.of("items", items, "count", items.size());
    }

    @Transactional
    public Map<String, Object> createColombiaNovelty(AuthSessionUser currentUser, Map<String, Object> payload) {
        authorizationService.require(currentUser, HrPayrollAuthorizationService.Action.PREPARE);
        var userCompanyId = parseLong(payload, "user_company_id", "userCompanyId");
        if (userCompanyId == null) {
            throw new IllegalArgumentException("user_company_id is required.");
        }
        requireHrUserInScope(currentUser, userCompanyId);

        var noveltyCode = normalizeColombiaNoveltyCode(stringValue(payload, "novelty_code", "noveltyCode", "code"));
        var startDate = parseDate(payload, "start_date", "startDate");
        if (startDate == null) {
            throw new IllegalArgumentException("start_date is required.");
        }
        var endDate = parseDate(payload, "end_date", "endDate");
        validateDateRange(startDate, endDate);
        var noveltyLabel = payloadText(payload, defaultColombiaNoveltyLabel(noveltyCode), "novelty_label", "noveltyLabel", "label");
        var days = normalizeNonNegativeQuantity(parseBigDecimal(payload, "days"), BigDecimal.ZERO, "days");
        var hours = normalizeNonNegativeQuantity(parseBigDecimal(payload, "hours"), BigDecimal.ZERO, "hours");
        var paid = payloadBoolean(payload, false, "paid");
        var affectsIbc = payloadBoolean(payload, false, "affects_ibc", "affectsIbc");
        var ibcImpactAmount = normalizeSignedMoney(parseBigDecimal(payload, "ibc_impact_amount", "ibcImpactAmount"), BigDecimal.ZERO, "ibc_impact_amount");
        var source = normalizeColombiaNoveltySource(payloadText(payload, "manual", "source"));
        var status = normalizeColombiaNoveltyStatus(payloadText(payload, "active", "status"));
        var metadata = payloadObject(payload, Map.of(), "metadata", "metadata_json");

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO payroll_employee_country_novelties
                    (company_id, user_company_id, country_code, novelty_code, novelty_label, start_date, end_date,
                     days, hours, paid, affects_ibc, ibc_impact_amount, source, status, metadata_json)
                    VALUES (?, ?, 'CO', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                new String[] {"id"}
            );
            statement.setLong(1, currentUser.companyId());
            statement.setLong(2, userCompanyId);
            statement.setString(3, noveltyCode);
            statement.setString(4, noveltyLabel);
            statement.setObject(5, startDate);
            statement.setObject(6, endDate);
            statement.setBigDecimal(7, days);
            statement.setBigDecimal(8, hours);
            statement.setBoolean(9, paid);
            statement.setBoolean(10, affectsIbc);
            statement.setBigDecimal(11, ibcImpactAmount);
            statement.setString(12, source);
            statement.setString(13, status);
            statement.setString(14, payrollSnapshotService.jsonValue(metadata));
            return statement;
        }, keyHolder);

        var id = keyHolder.getKey();
        if (id == null) {
            throw new IllegalStateException("Colombia novelty could not be created.");
        }
        return Map.of("item", toColombiaNoveltyMap(loadColombiaNoveltyInScope(currentUser, id.longValue())));
    }

    @Transactional
    public Map<String, Object> updateColombiaNovelty(
        AuthSessionUser currentUser,
        long noveltyId,
        Map<String, Object> payload
    ) {
        authorizationService.require(currentUser, HrPayrollAuthorizationService.Action.PREPARE);
        var current = loadColombiaNoveltyInScope(currentUser, noveltyId);
        var noveltyCode = payloadHasAny(payload, "novelty_code", "noveltyCode", "code")
            ? normalizeColombiaNoveltyCode(stringValue(payload, "novelty_code", "noveltyCode", "code"))
            : current.noveltyCode();
        var noveltyLabel = payloadText(payload, current.noveltyLabel(), "novelty_label", "noveltyLabel", "label");
        var startDate = payloadHasAny(payload, "start_date", "startDate")
            ? parseDate(payload, "start_date", "startDate")
            : current.startDate();
        if (startDate == null) {
            throw new IllegalArgumentException("start_date is required.");
        }
        var endDate = payloadHasAny(payload, "end_date", "endDate")
            ? parseDate(payload, "end_date", "endDate")
            : current.endDate();
        validateDateRange(startDate, endDate);
        var days = normalizeNonNegativeQuantity(parseBigDecimal(payload, "days"), current.days(), "days");
        var hours = normalizeNonNegativeQuantity(parseBigDecimal(payload, "hours"), current.hours(), "hours");
        var paid = payloadBoolean(payload, current.paid(), "paid");
        var affectsIbc = payloadBoolean(payload, current.affectsIbc(), "affects_ibc", "affectsIbc");
        var ibcImpactAmount = normalizeSignedMoney(parseBigDecimal(payload, "ibc_impact_amount", "ibcImpactAmount"), current.ibcImpactAmount(), "ibc_impact_amount");
        var source = normalizeColombiaNoveltySource(payloadText(payload, current.source(), "source"));
        var status = normalizeColombiaNoveltyStatus(payloadText(payload, current.status(), "status"));
        var metadata = payloadObject(payload, current.metadata(), "metadata", "metadata_json");

        jdbcTemplate.update(
            """
                UPDATE payroll_employee_country_novelties
                SET novelty_code = ?,
                    novelty_label = ?,
                    start_date = ?,
                    end_date = ?,
                    days = ?,
                    hours = ?,
                    paid = ?,
                    affects_ibc = ?,
                    ibc_impact_amount = ?,
                    source = ?,
                    status = ?,
                    metadata_json = ?
                WHERE company_id = ?
                  AND country_code = 'CO'
                  AND id = ?
                """,
            noveltyCode,
            noveltyLabel,
            startDate,
            endDate,
            days,
            hours,
            paid,
            affectsIbc,
            ibcImpactAmount,
            source,
            status,
            payrollSnapshotService.jsonValue(metadata),
            currentUser.companyId(),
            noveltyId
        );

        return Map.of("item", toColombiaNoveltyMap(loadColombiaNoveltyInScope(currentUser, noveltyId)));
    }

    public Map<String, Object> listGovernmentReportingSnapshots(
        AuthSessionUser currentUser,
        long runId,
        String reportType
    ) {
        var scope = hrPayrollScopeAccess.resolve(currentUser);
        var run = loadRun(currentUser.companyId(), runId, scope);
        var normalizedReportType = normalizeGovernmentReportType(reportType);
        var params = new ArrayList<Object>();
        params.add(currentUser.companyId());
        params.add(run.id());

        var sql = new StringBuilder("""
            SELECT id,
                   run_id,
                   run_line_id,
                   company_id,
                   user_company_id,
                   country_code,
                   report_type,
                   report_period_start,
                   report_period_end,
                   status,
                   payload_hash,
                   payload_json,
                   validation_json,
                   response_json,
                   generated_by_source,
                   generated_at,
                   updated_at
            FROM payroll_government_reporting_snapshots
            WHERE company_id = ?
              AND run_id = ?
            """);
        if (!normalizedReportType.isBlank()) {
            sql.append(" AND report_type = ?\n");
            params.add(normalizedReportType);
        }
        sql.append(" ORDER BY report_type ASC, run_line_id ASC, id ASC");

        var items = jdbcTemplate.query(
            sql.toString(),
            (rs, rowNum) -> {
                var body = new LinkedHashMap<String, Object>();
                body.put("id", rs.getLong("id"));
                body.put("run_id", rs.getLong("run_id"));
                body.put("run_line_id", rs.getLong("run_line_id"));
                body.put("company_id", rs.getLong("company_id"));
                body.put("user_company_id", rs.getLong("user_company_id"));
                body.put("country_code", safe(rs.getString("country_code")));
                body.put("report_type", safe(rs.getString("report_type")));
                body.put("report_period_start", rs.getObject("report_period_start", LocalDate.class).toString());
                body.put("report_period_end", rs.getObject("report_period_end", LocalDate.class).toString());
                body.put("status", safe(rs.getString("status")));
                body.put("payload_hash", safe(rs.getString("payload_hash")));
                body.put("payload", payrollSnapshotService.parseObject(rs.getString("payload_json")));
                body.put("validation", payrollSnapshotService.parseObject(rs.getString("validation_json")));
                body.put("response", payrollSnapshotService.parseObject(rs.getString("response_json")));
                body.put("generated_by_source", safe(rs.getString("generated_by_source")));
                var generatedAt = toLocalDateTime(rs.getTimestamp("generated_at"));
                var updatedAt = toLocalDateTime(rs.getTimestamp("updated_at"));
                body.put("generated_at", generatedAt == null ? null : generatedAt.toString());
                body.put("updated_at", updatedAt == null ? null : updatedAt.toString());
                return body;
            },
            params.toArray()
        );

        return Map.of("run", toRunSummaryMap(run), "items", items, "count", items.size());
    }

    @Transactional
    public Map<String, Object> updateGovernmentReportingSnapshotResponse(
        AuthSessionUser currentUser,
        long snapshotId,
        Map<String, Object> payload
    ) {
        authorizationService.require(currentUser, HrPayrollAuthorizationService.Action.REPORTING);
        var scope = hrPayrollScopeAccess.resolve(currentUser);
        var snapshot = loadGovernmentReportingSnapshotInScope(currentUser, snapshotId, scope);
        var status = normalizeGovernmentResponseStatus(payloadText(
            payload,
            snapshot.status(),
            "status",
            "government_status",
            "governmentStatus"
        ));
        var responseAt = payloadText(payload, "", "response_at", "responseAt");
        if (responseAt.isBlank()) {
            responseAt = LocalDateTime.now().toString();
        } else {
            try {
                responseAt = LocalDateTime.parse(responseAt.replace(" ", "T")).toString();
            } catch (DateTimeParseException ex) {
                throw new IllegalArgumentException("response_at must use ISO local date-time format.");
            }
        }

        var response = new LinkedHashMap<>(snapshot.response());
        response.put("status", status.toUpperCase(Locale.ROOT));
        response.put("readyForTransmission", !governmentResponseBlocksApproval(status));
        var currentExternalId = snapshot.response().get("externalId") == null
            ? ""
            : String.valueOf(snapshot.response().get("externalId"));
        response.put("externalId", payloadText(payload, currentExternalId, "external_id", "externalId", "reference"));
        response.put("requestHash", snapshot.payloadHash());
        response.put("message", payloadText(payload, "", "message", "mensaje", "description"));
        response.put("responseAt", responseAt);
        response.put("recordedByUserId", currentUser.userId());
        response.put("recordedAt", LocalDateTime.now().toString());
        if (payload.containsKey("issues")) {
            response.put("issues", normalizeGovernmentResponseIssues(payload.get("issues")));
        }

        var validation = new LinkedHashMap<>(snapshot.validation());
        validation.put("externalStatus", status);
        validation.put("externalBlocking", governmentResponseBlocksApproval(status));
        validation.put("blocking", Boolean.TRUE.equals(snapshot.validation().get("blocking")) || governmentResponseBlocksApproval(status));

        jdbcTemplate.update(
            """
                UPDATE payroll_government_reporting_snapshots
                SET status = ?,
                    response_json = ?,
                    validation_json = ?
                WHERE company_id = ?
                  AND id = ?
                """,
            status,
            payrollSnapshotService.jsonValue(response),
            payrollSnapshotService.jsonValue(validation),
            currentUser.companyId(),
            snapshotId
        );

        return Map.of(
            "item",
            toGovernmentReportingSnapshotMap(loadGovernmentReportingSnapshotInScope(currentUser, snapshotId, scope))
        );
    }

    private PayrollGovernmentReportingSnapshotRow loadGovernmentReportingSnapshotInScope(
        AuthSessionUser currentUser,
        long snapshotId,
        HrOperationalScope scope
    ) {
        var params = new ArrayList<Object>();
        params.add(currentUser.companyId());
        params.add(snapshotId);
        params.addAll(hrPayrollScopeAccess.runLineParameters(scope));

        var rows = jdbcTemplate.query(
            """
                SELECT s.id,
                       s.run_id,
                       s.run_line_id,
                       s.company_id,
                       s.user_company_id,
                       s.country_code,
                       s.report_type,
                       s.report_period_start,
                       s.report_period_end,
                       s.status,
                       s.payload_hash,
                       s.payload_json,
                       s.validation_json,
                       s.response_json,
                       s.generated_by_source,
                       s.generated_at,
                       s.updated_at
                FROM payroll_government_reporting_snapshots s
                JOIN payroll_run_lines l
                  ON l.company_id = s.company_id
                 AND l.id = s.run_line_id
                WHERE s.company_id = ?
                  AND s.id = ?
                """
                + hrPayrollScopeAccess.runLinePredicate(scope, "l")
                + """
                LIMIT 1
                """,
            (rs, rowNum) -> mapGovernmentReportingSnapshotRow(rs),
            params.toArray()
        );
        if (rows.isEmpty()) {
            var exists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM payroll_government_reporting_snapshots WHERE company_id = ? AND id = ?",
                Long.class,
                currentUser.companyId(),
                snapshotId
            );
            if (exists != null && exists > 0) {
                throw new HrAccessDeniedException("Forbidden");
            }
            throw new NoSuchElementException("Payroll government reporting snapshot not found.");
        }
        return rows.getFirst();
    }

    private PayrollGovernmentReportingSnapshotRow mapGovernmentReportingSnapshotRow(ResultSet rs) throws SQLException {
        return new PayrollGovernmentReportingSnapshotRow(
            rs.getLong("id"),
            rs.getLong("run_id"),
            rs.getLong("run_line_id"),
            rs.getLong("company_id"),
            rs.getLong("user_company_id"),
            safe(rs.getString("country_code")),
            safe(rs.getString("report_type")),
            rs.getObject("report_period_start", LocalDate.class),
            rs.getObject("report_period_end", LocalDate.class),
            safe(rs.getString("status")),
            safe(rs.getString("payload_hash")),
            payrollSnapshotService.parseObject(rs.getString("payload_json")),
            payrollSnapshotService.parseObject(rs.getString("validation_json")),
            payrollSnapshotService.parseObject(rs.getString("response_json")),
            safe(rs.getString("generated_by_source")),
            toLocalDateTime(rs.getTimestamp("generated_at")),
            toLocalDateTime(rs.getTimestamp("updated_at"))
        );
    }

    private Map<String, Object> toGovernmentReportingSnapshotMap(PayrollGovernmentReportingSnapshotRow snapshot) {
        var body = new LinkedHashMap<String, Object>();
        body.put("id", snapshot.id());
        body.put("run_id", snapshot.runId());
        body.put("run_line_id", snapshot.runLineId());
        body.put("company_id", snapshot.companyId());
        body.put("user_company_id", snapshot.userCompanyId());
        body.put("country_code", snapshot.countryCode());
        body.put("report_type", snapshot.reportType());
        body.put("report_period_start", snapshot.reportPeriodStart().toString());
        body.put("report_period_end", snapshot.reportPeriodEnd().toString());
        body.put("status", snapshot.status());
        body.put("payload_hash", snapshot.payloadHash());
        body.put("payload", snapshot.payload());
        body.put("validation", snapshot.validation());
        body.put("response", snapshot.response());
        body.put("generated_by_source", snapshot.generatedBySource());
        body.put("generated_at", snapshot.generatedAt() == null ? null : snapshot.generatedAt().toString());
        body.put("updated_at", snapshot.updatedAt() == null ? null : snapshot.updatedAt().toString());
        return body;
    }

    private void ensureColombiaGovernmentReportingReadyForApproval(long companyId, long runId) {
        var colombiaLineIds = jdbcTemplate.queryForList(
            """
                SELECT id
                FROM payroll_run_lines
                WHERE company_id = ?
                  AND run_id = ?
                  AND country_code_snapshot = 'CO'
                """,
            Long.class,
            companyId,
            runId
        );
        if (colombiaLineIds.isEmpty()) {
            return;
        }

        var snapshotRows = jdbcTemplate.query(
            """
                SELECT run_line_id,
                       status,
                       report_type,
                       validation_json
                FROM payroll_government_reporting_snapshots
                WHERE company_id = ?
                  AND run_id = ?
                  AND country_code = 'CO'
            """,
            (rs, rowNum) -> new PayrollGovernmentReportingValidationRow(
                rs.getLong("run_line_id"),
                safe(rs.getString("status")),
                safe(rs.getString("report_type")),
                payrollSnapshotService.parseObject(rs.getString("validation_json"))
            ),
            companyId,
            runId
        );

        var reportsByLine = new HashMap<Long, List<PayrollGovernmentReportingValidationRow>>();
        for (var row : snapshotRows) {
            reportsByLine.computeIfAbsent(row.runLineId(), ignored -> new ArrayList<>()).add(row);
            if (Boolean.TRUE.equals(row.validation().get("blocking"))) {
                throw new IllegalArgumentException("Colombia payroll has blocking PILA/DIAN validation issues before approval.");
            }
            if (governmentResponseBlocksApproval(row.status())) {
                throw new IllegalArgumentException("Colombia payroll has rejected PILA/DIAN government responses before approval.");
            }
        }

        for (var lineId : colombiaLineIds) {
            var reports = reportsByLine.getOrDefault(lineId, List.of());
            var reportTypes = reports.stream().map(PayrollGovernmentReportingValidationRow::reportType).collect(Collectors.toSet());
            if (!reportTypes.contains("PILA") || !reportTypes.contains("DIAN_PAYROLL")) {
                throw new IllegalArgumentException("Colombia payroll requires PILA and DIAN snapshots before approval.");
            }
        }
    }

    public Map<String, Object> listRuns(long companyId, Map<String, String> filters) {
        return listRuns(companyId, filters, HrOperationalScope.corporateOffice());
    }

    public Map<String, Object> listRuns(AuthSessionUser currentUser, Map<String, String> filters) {
        return listRuns(
            currentUser.companyId(),
            filters,
            hrPayrollScopeAccess.resolve(currentUser)
        );
    }

    private Map<String, Object> listRuns(
        long companyId,
        Map<String, String> filters,
        HrOperationalScope scope
    ) {
        reconcilePaidPayrollRuns(companyId);
        var items = loadRuns(companyId, scope).stream()
            .filter((run) -> matchesRunFilters(run, filters))
            .map(this::toRunSummaryMap)
            .toList();

        return Map.of("items", items);
    }

    /**
     * Serializes run generation per company in the database. Unlike a JVM monitor,
     * this lock also protects deployments with multiple backend replicas.
     */
    private void lockPayrollGeneration(long companyId) {
        jdbcTemplate.queryForObject(
            "SELECT id FROM companies WHERE id = ? FOR UPDATE",
            Long.class,
            companyId
        );
    }

    @Transactional
    public Map<String, Object> createRuns(long companyId, long userId, Map<String, Object> payload) {
        return createRuns(companyId, userId, payload, HrOperationalScope.corporateOffice());
    }

    @Transactional
    public Map<String, Object> createRuns(AuthSessionUser currentUser, Map<String, Object> payload) {
        authorizationService.require(currentUser, HrPayrollAuthorizationService.Action.PREPARE);
        return createRuns(
            currentUser.companyId(),
            currentUser.userId(),
            payload,
            hrPayrollScopeAccess.resolve(currentUser)
        );
    }

    private Map<String, Object> createRuns(
        long companyId,
        long userId,
        Map<String, Object> payload,
        HrOperationalScope scope
    ) {
        var preferences = ensurePreferences(companyId);
        var payPeriod = normalizePayPeriod(stringValue(payload, "pay_period"));
        var periodStartDate = parseDate(payload, "period_start_date", "start_date");
        var requestedPeriodEndDate = parseDate(payload, "period_end_date", "end_date");

        if (periodStartDate == null) {
            throw new IllegalArgumentException("period_start_date is required.");
        }
        if (requestedPeriodEndDate != null && requestedPeriodEndDate.isBefore(periodStartDate)) {
            throw new IllegalArgumentException("period_end_date must be on or after period_start_date.");
        }
        var calculatedPeriodEndDate = normalizeRunPeriodEndDate(payPeriod, periodStartDate, preferences);
        if (requestedPeriodEndDate != null && !requestedPeriodEndDate.equals(calculatedPeriodEndDate)) {
            throw new IllegalArgumentException(
                "period_end_date does not match the configured payroll calendar. Expected " + calculatedPeriodEndDate + "."
            );
        }

        var groupingMode = normalizeGroupingMode(stringValue(payload, "grouping_mode"), preferences.groupingMode());
        lockPayrollGeneration(companyId);
        return createRunsForPeriod(companyId, userId, preferences, payPeriod, periodStartDate, groupingMode, scope);
    }

    @Transactional
    public synchronized Map<String, Object> regenerateOpenRuns(AuthSessionUser currentUser) {
        authorizationService.require(currentUser, HrPayrollAuthorizationService.Action.PREPARE);
        var companyId = currentUser.companyId();
        var userId = currentUser.userId();
        var scope = hrPayrollScopeAccess.resolve(currentUser);
        var preferences = ensurePreferences(companyId);
        lockPayrollGeneration(companyId);
        var runs = loadRuns(companyId, scope);

        var regeneratableRuns = runs.stream()
            .filter((run) -> isRegeneratableRunStatus(run.status()))
            .toList();

        var periodKeys = regeneratableRuns.stream()
            .map((run) -> new PayrollRegenerationPeriod(
                normalizePayPeriod(run.payPeriod()),
                run.periodStartDate()
            ))
            .distinct()
            .toList();

        if (regeneratableRuns.isEmpty()) {
            return Map.of(
                "items", List.of(),
                "cancelled_count", 0,
                "regenerated_count", 0,
                "skipped_locked_count", 0
            );
        }

        var skippedLockedCount = runs.stream()
            .filter((run) -> isLockedPayrollRunStatus(run.status()))
            .filter((run) -> periodKeys.contains(new PayrollRegenerationPeriod(
                normalizePayPeriod(run.payPeriod()),
                run.periodStartDate()
            )))
            .count();

        var now = LocalDateTime.now();
        for (var run : regeneratableRuns) {
            hrPayrollScopeAccess.requireRunFullyInScope(companyId, scope, run.id());
            cancelRunForRegeneration(companyId, userId, run.id(), now);
        }

        var regeneratedRuns = new ArrayList<Map<String, Object>>();
        for (var periodKey : periodKeys) {
            var response = createRunsForPeriod(
                companyId,
                userId,
                preferences,
                periodKey.payPeriod(),
                periodKey.periodStartDate(),
                preferences.groupingMode(),
                scope
            );
            @SuppressWarnings("unchecked")
            var items = (List<Map<String, Object>>) response.getOrDefault("items", List.of());
            regeneratedRuns.addAll(items);
        }

        return Map.of(
            "items", regeneratedRuns,
            "cancelled_count", regeneratableRuns.size(),
            "regenerated_count", regeneratedRuns.size(),
            "skipped_locked_count", skippedLockedCount
        );
    }

    private Map<String, Object> createRunsForPeriod(
        long companyId,
        Long userId,
        PayrollPreferencesRow preferences,
        String payPeriod,
        LocalDate periodStartDate,
        String groupingMode,
        HrOperationalScope scope
    ) {
        var normalizedPeriodEndDate = normalizeRunPeriodEndDate(payPeriod, periodStartDate, preferences);
        var hrUsers = loadEligibleHrUsers(
            companyId,
            payPeriod,
            true,
            normalizedPeriodEndDate,
            periodStartDate,
            scope
        );
        if (hrUsers.isEmpty()) {
            throw new IllegalArgumentException("No hay colaboradores activos configurados para la frecuencia de pago seleccionada.");
        }

        var groupedHrUsers = groupHrUsers(hrUsers, groupingMode);
        var createdRuns = new ArrayList<Map<String, Object>>();

        for (var group : groupedHrUsers) {
            var existingRun = findExistingRun(
                companyId,
                groupingMode,
                group.groupingKey(),
                payPeriod,
                periodStartDate,
                normalizedPeriodEndDate,
                scope
            );
            if (existingRun != null) {
                var existingSummary = toRunSummaryMap(existingRun);
                existingSummary.put("reused", true);
                createdRuns.add(existingSummary);
                continue;
            }

            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                var statement = connection.prepareStatement(
                    """
                        INSERT INTO payroll_runs
                        (company_id, grouping_mode, grouping_key, grouping_label, pay_period, period_start_date, period_end_date, status, created_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?)
                        """,
                    new String[] {"id"}
                );
                statement.setLong(1, companyId);
                statement.setString(2, groupingMode);
                statement.setString(3, nullable(group.groupingKey()));
                statement.setString(4, nullable(group.groupingLabel()));
                statement.setString(5, payPeriod);
                statement.setObject(6, periodStartDate);
                statement.setObject(7, normalizedPeriodEndDate);
                if (userId == null) {
                    statement.setNull(8, Types.BIGINT);
                } else {
                    statement.setLong(8, userId);
                }
                return statement;
            }, keyHolder);

            var runId = keyHolder.getKey() == null ? null : keyHolder.getKey().longValue();
            if (runId == null) {
                throw new IllegalStateException("Payroll run could not be created.");
            }

            for (var hrUser : group.users()) {
                createRunLine(companyId, runId, hrUser, preferences, payPeriod, periodStartDate, normalizedPeriodEndDate);
            }

            recomputeRunTotals(runId);
            createdRuns.add(toRunSummaryMap(loadRun(companyId, runId, scope)));
        }

        return Map.of("items", createdRuns);
    }

    private boolean isRegeneratableRunStatus(String status) {
        var normalizedStatus = safe(status).toLowerCase(Locale.ROOT);
        return "draft".equals(normalizedStatus) || "processed".equals(normalizedStatus);
    }

    private boolean isLockedPayrollRunStatus(String status) {
        var normalizedStatus = safe(status).toLowerCase(Locale.ROOT);
        return "approved".equals(normalizedStatus) || "paid".equals(normalizedStatus);
    }

    public Map<String, Object> getRunDetail(long companyId, long runId) {
        return getRunDetail(companyId, runId, HrOperationalScope.corporateOffice());
    }

    public Map<String, Object> getRunDetail(AuthSessionUser currentUser, long runId) {
        return getRunDetail(currentUser.companyId(), runId, hrPayrollScopeAccess.resolve(currentUser));
    }

    private Map<String, Object> getRunDetail(long companyId, long runId, HrOperationalScope scope) {
        reconcilePaidPayrollRuns(companyId);
        var run = loadRun(companyId, runId, scope);
        var runLines = loadRunLines(companyId, runId, scope);
        var itemsByLineId = loadRunLineItems(runLines.stream().map(PayrollRunLineRow::id).toList());
        var lines = runLines.stream()
            .map((line) -> {
                var body = new LinkedHashMap<String, Object>();
                body.put("id", line.id());
                body.put("user_company_id", line.userCompanyId());
                body.put("user_code", line.userCodeSnapshot());
                body.put("user_name", line.userNameSnapshot());
                body.put("position_title", line.positionTitleSnapshot());
                body.put("department", line.departmentSnapshot());
                body.put("unit_id", line.unitIdSnapshot());
                body.put("unit_name", line.unitNameSnapshot());
                body.put("business_id", line.businessIdSnapshot());
                body.put("business_name", line.businessNameSnapshot());
                body.put("country_code", line.countryCodeSnapshot());
                body.put("jurisdiction_code", line.jurisdictionCodeSnapshot());
                body.put("currency_code", line.currencyCodeSnapshot());
                body.put("fx_rate", line.fxRate());
                body.put("pay_period", line.payPeriodSnapshot());
                body.put("salary_type", line.salaryTypeSnapshot());
                body.put("base_salary_amount", scaled(line.baseSalaryAmount()));
                body.put("hourly_rate_amount", scaledNullable(line.hourlyRateAmount()));
                body.put("days_payable", scaled(line.daysPayable()));
                body.put("leave_days", scaled(line.leaveDays()));
                body.put("absence_days", scaled(line.absenceDays()));
                body.put("rest_days", scaled(line.restDays()));
                body.put("missing_attendance_days", scaled(line.missingAttendanceDays()));
                body.put("paid_leave_days", scaled(line.paidLeaveDays()));
                body.put("unpaid_absence_days", scaled(line.unpaidAbsenceDays()));
                body.put("late_count", line.lateCount());
                body.put("regular_hours", scaled(line.regularHours()));
                body.put("overtime_hours", scaled(line.overtimeHours()));
                body.put("include_in_fiscal", line.includeInFiscal());
                body.put("payroll_treatment", line.payrollTreatmentSnapshot());
                body.put("payroll_treatment_label", payrollTreatmentLabel(line.payrollTreatmentSnapshot()));
                body.put("payment_route", line.paymentRoute());
                body.put("payment_route_label", paymentRouteLabel(line.paymentRoute()));
                body.put("payable_expense_id", line.payableExpenseId());
                body.put("payable_created_at", line.payableCreatedAt() == null ? null : line.payableCreatedAt().toString());
                body.put("payable_metadata", line.payableMetadata());
                body.put("gross_amount", scaled(line.grossAmount()));
                body.put("deductions_amount", scaled(line.deductionsAmount()));
                body.put("employer_contributions_amount", scaled(line.employerContributionsAmount()));
                body.put("net_amount", scaled(line.netAmount()));
                body.put("notes", line.notes());
                body.put("calculation_source", line.calculationSource());
                body.put("calculation_timestamp", line.calculationTimestamp() == null ? null : line.calculationTimestamp().toString());
                body.put("statutory_compliance", lineStatutoryCompliance(line));
                body.put("calculation_warnings", lineCalculationWarnings(line));
                body.put("employee_salary_snapshot", line.employeeSalarySnapshot());
                body.put("attendance_snapshot", line.attendanceSnapshot());
                body.put("manual_adjustments_snapshot", line.manualAdjustmentsSnapshot());
                body.put("calculation_inputs", line.calculationInputs());
                body.put("calculation_results", line.calculationResults());
                body.put("rule_snapshot", line.ruleSnapshot());
                body.put("attendance_warnings", line.attendanceWarnings());
                body.put(
                    "items",
                    itemsByLineId.getOrDefault(line.id(), List.of()).stream().map(this::toRunLineItemMap).toList()
                );
                return body;
            })
            .toList();

        var body = new LinkedHashMap<String, Object>();
        body.put("run", toRunSummaryMap(run));
        body.put("lines", lines);
        return body;
    }

    @Transactional
    public Map<String, Object> updateRunLine(long companyId, long runId, long lineId, Map<String, Object> payload) {
        return updateRunLine(companyId, runId, lineId, payload, HrOperationalScope.corporateOffice());
    }

    @Transactional
    public Map<String, Object> updateRunLine(AuthSessionUser currentUser, long runId, long lineId, Map<String, Object> payload) {
        authorizationService.require(currentUser, HrPayrollAuthorizationService.Action.PREPARE);
        return updateRunLine(
            currentUser.companyId(),
            runId,
            lineId,
            payload,
            hrPayrollScopeAccess.resolve(currentUser)
        );
    }

    private Map<String, Object> updateRunLine(
        long companyId,
        long runId,
        long lineId,
        Map<String, Object> payload,
        HrOperationalScope scope
    ) {
        var run = loadRunForUpdate(companyId, runId);
        requireRunStatus(run, "draft");
        hrPayrollScopeAccess.requireRunLineInScope(companyId, scope, runId, lineId);
        var line = loadRunLine(runId, lineId);

        var payrollTreatment = resolvePayrollTreatmentFromPayload(payload, line);
        var includeInFiscal = includeInFiscalForTreatment(payrollTreatment);
        var paymentRoute = paymentRouteForTreatment(payrollTreatment);
        var notes = payload.containsKey("notes") ? nullable(stringValue(payload, "notes")) : line.notes();
        var manualItems = parseManualItems(payload.get("manual_items"));

        jdbcTemplate.update(
            """
                UPDATE payroll_run_lines
                SET include_in_fiscal = ?,
                    payroll_treatment_snapshot = ?,
                    payment_route = ?,
                    payable_expense_id = CASE WHEN ? = 'expenses' THEN payable_expense_id ELSE NULL END,
                    payable_created_at = CASE WHEN ? = 'expenses' THEN payable_created_at ELSE NULL END,
                    payable_metadata_json = CASE WHEN ? = 'expenses' THEN payable_metadata_json ELSE NULL END,
                    notes = ?
                WHERE id = ? AND run_id = ?
                """,
            includeInFiscal,
            payrollTreatment,
            paymentRoute,
            paymentRoute,
            paymentRoute,
            paymentRoute,
            notes,
            lineId,
            runId
        );

        jdbcTemplate.update(
            "DELETE FROM payroll_run_line_items WHERE run_line_id = ? AND source_type = 'manual'",
            lineId
        );

        var lineJurisdiction = resolvePayrollJurisdiction(companyId, line.userCompanyId());
        var lineCountry = payrollRuleResolver.normalizeCountry(isBlank(line.countryCodeSnapshot()) ? lineJurisdiction.country() : line.countryCodeSnapshot());
        var lineJurisdictionCode = isBlank(line.jurisdictionCodeSnapshot())
            ? resolvePayrollJurisdictionCode(lineCountry, lineJurisdiction.province())
            : line.jurisdictionCodeSnapshot();
        var lineCurrency = resolveCurrencyCode(lineCountry);

        for (var index = 0; index < manualItems.size(); index++) {
            var manualItem = manualItems.get(index);
            var normalizedManual = payrollManualAdjustmentService.normalize(
                manualItem.category(),
                manualItem.label(),
                manualItem.amount(),
                lineCurrency
            );
            jdbcTemplate.update(
                """
                    INSERT INTO payroll_run_line_items
                    (run_line_id, code, category, label, amount, source_type, country_code, jurisdiction_code, tax_treatment,
                     taxable, exempt, affects_social_security, affects_employer_cost, legal_classification, calculation_formula,
                     calculation_base, currency_code, display_order)
                    VALUES (?, ?, ?, ?, ?, 'manual', ?, ?, ?, ?, 0, ?, ?, ?, 'manual adjustment amount', ?, ?, ?)
                    """,
                lineId,
                normalizedManual.code(),
                normalizedManual.category(),
                normalizedManual.label(),
                normalizedManual.amount(),
                lineCountry,
                lineJurisdictionCode,
                normalizedManual.taxTreatment(),
                normalizedManual.taxable(),
                normalizedManual.affectsSocialSecurity(),
                normalizedManual.affectsEmployerCost(),
                normalizedManual.legalClassification(),
                normalizedManual.amount(),
                normalizedManual.currency(),
                1000 + index
            );
        }

        recomputeRunLineFromStoredItems(lineId, ensurePreferences(companyId));
        recomputeRunTotals(runId);
        return getRunDetail(companyId, runId, scope);
    }

    public Map<String, Object> listRunLineIncentives(AuthSessionUser currentUser, long runId, long lineId) {
        var scope = hrPayrollScopeAccess.resolve(currentUser);
        var run = loadRun(currentUser.companyId(), runId, scope);
        hrPayrollScopeAccess.requireRunLineInScope(currentUser.companyId(), scope, runId, lineId);
        var line = loadRunLine(runId, lineId);
        var currency = isBlank(line.currencyCodeSnapshot())
            ? resolveCurrencyCode(line.countryCodeSnapshot())
            : line.currencyCodeSnapshot();
        var items = hrIncentivePayrollSupplyService.listPayrollLineIncentives(
            currentUser.companyId(),
            line.userCompanyId(),
            line.id(),
            run.periodStartDate(),
            run.periodEndDate(),
            currency
        );

        var body = new LinkedHashMap<String, Object>();
        body.put("run_status", run.status());
        body.put("editable", "draft".equals(run.status()) && authorizationService.can(currentUser, HrPayrollAuthorizationService.Action.PREPARE));
        body.put("items", items);
        return body;
    }

    @Transactional
    public Map<String, Object> applyRunLineIncentive(
        AuthSessionUser currentUser,
        long runId,
        long lineId,
        long applicationId
    ) {
        authorizationService.require(currentUser, HrPayrollAuthorizationService.Action.PREPARE);
        var scope = hrPayrollScopeAccess.resolve(currentUser);
        var run = loadRunForUpdate(currentUser.companyId(), runId);
        requireRunStatus(run, "draft");
        hrPayrollScopeAccess.requireRunLineInScope(currentUser.companyId(), scope, runId, lineId);
        var line = loadRunLine(runId, lineId);
        var jurisdiction = resolvePayrollJurisdiction(currentUser.companyId(), line.userCompanyId());
        var country = payrollRuleResolver.normalizeCountry(
            isBlank(line.countryCodeSnapshot()) ? jurisdiction.country() : line.countryCodeSnapshot()
        );
        var jurisdictionCode = isBlank(line.jurisdictionCodeSnapshot())
            ? resolvePayrollJurisdictionCode(country, jurisdiction.province())
            : line.jurisdictionCodeSnapshot();
        var currency = isBlank(line.currencyCodeSnapshot())
            ? resolveCurrencyCode(country)
            : line.currencyCodeSnapshot();
        var resolved = hrIncentivePayrollSupplyService.claimApprovedApplication(
            currentUser.companyId(),
            applicationId,
            line.userCompanyId(),
            runId,
            lineId,
            run.periodStartDate(),
            run.periodEndDate(),
            currency
        );
        var adjustment = resolved.adjustment();
        var itemExists = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM payroll_run_line_items WHERE run_line_id = ? AND code = ? AND source_type = 'incentive'",
            Integer.class,
            lineId,
            adjustment.code()
        );
        if (itemExists == null || itemExists == 0) {
            jdbcTemplate.update(
                """
                    INSERT INTO payroll_run_line_items
                    (run_line_id, code, category, label, amount, source_type, country_code, jurisdiction_code, tax_treatment,
                     taxable, exempt, affects_social_security, affects_employer_cost, legal_classification, calculation_formula,
                     calculation_base, currency_code, display_order)
                    VALUES (?, ?, ?, ?, ?, 'incentive', ?, ?, ?, ?, 0, ?, ?, ?, 'approved incentive amount', ?, ?, ?)
                    """,
                lineId,
                adjustment.code(),
                adjustment.category(),
                adjustment.label(),
                scaled(adjustment.amount()),
                country,
                jurisdictionCode,
                adjustment.taxTreatment(),
                adjustment.taxable(),
                adjustment.affectsSocialSecurity(),
                adjustment.affectsEmployerCost(),
                adjustment.legalClassification(),
                scaled(adjustment.amount()),
                adjustment.currency(),
                900 + Math.toIntExact(Math.min(resolved.applicationId(), 99L))
            );
        }

        recomputeRunLineFromStoredItems(lineId, ensurePreferences(currentUser.companyId()));
        recomputeRunTotals(runId);
        return getRunDetail(currentUser.companyId(), runId, scope);
    }

    @Transactional
    public Map<String, Object> processRun(long companyId, long userId, long runId) {
        return processRun(companyId, userId, runId, HrOperationalScope.corporateOffice());
    }

    @Transactional
    public Map<String, Object> processRun(AuthSessionUser currentUser, long runId) {
        authorizationService.require(currentUser, HrPayrollAuthorizationService.Action.PREPARE);
        return processRun(
            currentUser.companyId(),
            currentUser.userId(),
            runId,
            hrPayrollScopeAccess.resolve(currentUser)
        );
    }

    private Map<String, Object> processRun(
        long companyId,
        long userId,
        long runId,
        HrOperationalScope scope
    ) {
        var run = loadRunForUpdate(companyId, runId);
        requireEditableDraftStatus(run);
        hrPayrollScopeAccess.requireRunFullyInScope(companyId, scope, runId);
        recomputeRunLinesWithEngine(runId, ensurePreferences(companyId));
        recomputeRunTotals(runId);
        recordRunRecalculation(runId, userId);
        return Map.of("run", toRunSummaryMap(loadRun(companyId, runId, scope)));
    }

    @Transactional
    public Map<String, Object> approveRun(long companyId, long userId, long runId) {
        return approveRun(companyId, userId, "root", runId, HrOperationalScope.corporateOffice());
    }

    @Transactional
    public Map<String, Object> approveRun(AuthSessionUser currentUser, long runId) {
        authorizationService.require(currentUser, HrPayrollAuthorizationService.Action.APPROVE);
        return approveRun(
            currentUser.companyId(),
            currentUser.userId(),
            currentUser.role(),
            runId,
            hrPayrollScopeAccess.resolve(currentUser)
        );
    }

    private Map<String, Object> approveRun(
        long companyId,
        long userId,
        String actorRole,
        long runId,
        HrOperationalScope scope
    ) {
        var run = loadRunForUpdate(companyId, runId);
        requireEditableDraftStatus(run);
        hrPayrollScopeAccess.requireRunFullyInScope(companyId, scope, runId);
        var legacyProcessedRun = "processed".equals(run.status());
        ensureDifferentTransitionActor(runId, userId, actorRole, PayrollTransition.APPROVE);
        // Historical processed runs already contain their frozen calculation
        // and compliance snapshots. Validate those records before migrating
        // them through approval so the retired state remains auditable.
        if (!legacyProcessedRun) {
            recomputeRunLinesWithEngine(runId, ensurePreferences(companyId));
            recomputeRunTotals(runId);
        }
        ensureFinancialIntegrityForApproval(companyId, runId);
        ensureStatutoryComplianceForApproval(runId);
        ensureColombiaGovernmentReportingReadyForApproval(companyId, runId);
        updateRunStatus(runId, "approved", userId);
        createPayrollPayablesForApprovedRun(companyId, userId, runId);
        return Map.of("run", toRunSummaryMap(loadRun(companyId, runId, scope)));
    }

    @Transactional
    public Map<String, Object> markRunPaid(long companyId, long userId, long runId) {
        return markRunPaid(companyId, userId, "root", runId, HrOperationalScope.corporateOffice());
    }

    @Transactional
    public Map<String, Object> markRunPaid(AuthSessionUser currentUser, long runId) {
        authorizationService.require(currentUser, HrPayrollAuthorizationService.Action.PAY);
        return markRunPaid(
            currentUser.companyId(),
            currentUser.userId(),
            currentUser.role(),
            runId,
            hrPayrollScopeAccess.resolve(currentUser)
        );
    }

    private Map<String, Object> markRunPaid(
        long companyId,
        long userId,
        String actorRole,
        long runId,
        HrOperationalScope scope
    ) {
        var run = loadRunForUpdate(companyId, runId);
        requireRunStatus(run, "approved");
        hrPayrollScopeAccess.requireRunFullyInScope(companyId, scope, runId);
        ensureDifferentTransitionActor(runId, userId, actorRole, PayrollTransition.PAY);
        ensurePayrollAccountsPayableLinesArePaid(companyId, runId);
        updateRunStatus(runId, "paid", userId);
        return Map.of("run", toRunSummaryMap(loadRun(companyId, runId, scope)));
    }

    @Transactional
    public Map<String, Object> cancelRun(long companyId, long userId, long runId) {
        return cancelRun(companyId, userId, runId, HrOperationalScope.corporateOffice());
    }

    @Transactional
    public Map<String, Object> cancelRun(AuthSessionUser currentUser, long runId) {
        authorizationService.require(currentUser, HrPayrollAuthorizationService.Action.CANCEL);
        return cancelRun(
            currentUser.companyId(),
            currentUser.userId(),
            runId,
            hrPayrollScopeAccess.resolve(currentUser)
        );
    }

    private Map<String, Object> cancelRun(long companyId, long userId, long runId, HrOperationalScope scope) {
        var run = loadRunForUpdate(companyId, runId);
        hrPayrollScopeAccess.requireRunFullyInScope(companyId, scope, runId);
        if ("cancelled".equals(run.status())) {
            throw new IllegalArgumentException("Payroll run is already cancelled.");
        }
        if (!isEditableDraftStatus(run.status())) {
            throw new IllegalArgumentException("Payroll run in " + run.status() + " status cannot be cancelled.");
        }
        jdbcTemplate.update(
            """
                UPDATE payroll_runs
                SET status = 'cancelled',
                    cancelled_by = ?,
                    cancelled_at = ?
                WHERE id = ? AND company_id = ?
                """,
            userId,
            Timestamp.valueOf(LocalDateTime.now()),
            runId,
            companyId
        );
        return Map.of("run", toRunSummaryMap(loadRun(companyId, runId, scope)));
    }

    private void cancelRunForRegeneration(long companyId, long userId, long runId, LocalDateTime cancelledAt) {
        jdbcTemplate.update(
            """
                UPDATE payroll_runs
                SET status = 'cancelled',
                    cancelled_by = ?,
                    cancelled_at = ?
                WHERE id = ? AND company_id = ?
                  AND status IN ('draft', 'processed')
                """,
            userId,
            Timestamp.valueOf(cancelledAt),
            runId,
            companyId
        );
    }

    private void ensureDifferentTransitionActor(
        long runId,
        long actorUserId,
        String actorRole,
        PayrollTransition transition
    ) {
        if (authorizationService.canOverrideSeparationOfDuties(actorRole)) {
            return;
        }
        var rows = jdbcTemplate.query(
            "SELECT processed_by, approved_by FROM payroll_runs WHERE id = ? LIMIT 1",
            (rs, rowNum) -> new PayrollRunActors(
                getNullableLong(rs, "processed_by"),
                getNullableLong(rs, "approved_by")
            ),
            runId
        );
        if (rows.isEmpty()) {
            return;
        }
        var previousActor = transition == PayrollTransition.APPROVE
            ? rows.getFirst().processedBy()
            : rows.getFirst().approvedBy();
        if (previousActor != null && previousActor == actorUserId) {
            var message = transition == PayrollTransition.APPROVE
                ? "The user who processed the payroll run cannot approve it."
                : "The user who approved the payroll run cannot mark it as paid.";
            throw new IllegalArgumentException(message);
        }
    }

    private void ensureStatutoryComplianceForApproval(long runId) {
        var unsupportedFiscalLines = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM payroll_run_lines
                WHERE run_id = ?
                  AND payroll_treatment_snapshot = 'fiscal_payroll'
                  AND calculation_source = 'GENERIC_UNSUPPORTED_COUNTRY'
                """,
            Integer.class,
            runId
        );
        if (unsupportedFiscalLines != null && unsupportedFiscalLines > 0) {
            throw new IllegalArgumentException(
                "Fiscal payroll cannot be approved while it contains unsupported countries. "
                    + "Change those lines to operational payroll or configure a supported statutory provider."
            );
        }
    }

    void ensureFinancialIntegrityForApproval(long companyId, long runId) {
        var invalidRunCount = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM (
                    SELECT payroll_run.id
                    FROM payroll_runs payroll_run
                    LEFT JOIN payroll_run_lines line
                      ON line.run_id = payroll_run.id
                     AND line.company_id = payroll_run.company_id
                    WHERE payroll_run.company_id = ?
                      AND payroll_run.id = ?
                    GROUP BY payroll_run.id,
                             payroll_run.users_count,
                             payroll_run.gross_amount,
                             payroll_run.deductions_amount,
                             payroll_run.employer_contributions_amount,
                             payroll_run.net_amount
                    HAVING COUNT(line.id) = 0
                       OR payroll_run.users_count <> COUNT(line.id)
                       OR payroll_run.gross_amount <> COALESCE(SUM(line.gross_amount), 0)
                       OR payroll_run.deductions_amount <> COALESCE(SUM(line.deductions_amount), 0)
                       OR payroll_run.employer_contributions_amount <> COALESCE(SUM(line.employer_contributions_amount), 0)
                       OR payroll_run.net_amount <> COALESCE(SUM(line.net_amount), 0)
                       OR SUM(
                           CASE
                               WHEN line.gross_amount < 0
                                 OR line.deductions_amount < 0
                                 OR line.employer_contributions_amount < 0
                                 OR line.net_amount < 0
                                 OR line.gross_amount - line.deductions_amount <> line.net_amount
                               THEN 1
                               ELSE 0
                           END
                       ) > 0
                ) invalid_payroll_run
                """,
            Integer.class,
            companyId,
            runId
        );
        if (invalidRunCount != null && invalidRunCount > 0) {
            throw new IllegalArgumentException(
                "Payroll run cannot be approved because its employee or run totals are invalid. "
                    + "Recalculate and correct negative net amounts before approval."
            );
        }
    }

    public String exportRunCsv(long companyId, long runId) {
        return exportRunCsv(companyId, runId, HrOperationalScope.corporateOffice());
    }

    public String exportRunCsv(AuthSessionUser currentUser, long runId) {
        return exportRunCsv(currentUser.companyId(), runId, hrPayrollScopeAccess.resolve(currentUser));
    }

    private String exportRunCsv(long companyId, long runId, HrOperationalScope scope) {
        var detail = getRunDetail(companyId, runId, scope);
        @SuppressWarnings("unchecked")
        var run = (Map<String, Object>) detail.get("run");
        @SuppressWarnings("unchecked")
        var lines = (List<Map<String, Object>>) detail.get("lines");

        var builder = new StringBuilder();
        builder.append("run_id,period_start_date,period_end_date,status,user_company_id,user_name,pay_period,salary_type,gross_amount,deductions_amount,employer_contributions_amount,net_amount\n");
        for (var line : lines) {
            builder.append(csv(run.get("id"))).append(',')
                .append(csv(run.get("period_start_date"))).append(',')
                .append(csv(run.get("period_end_date"))).append(',')
                .append(csv(run.get("status"))).append(',')
                .append(csv(line.get("user_company_id"))).append(',')
                .append(csv(line.get("user_name"))).append(',')
                .append(csv(line.get("pay_period"))).append(',')
                .append(csv(line.get("salary_type"))).append(',')
                .append(csv(line.get("gross_amount"))).append(',')
                .append(csv(line.get("deductions_amount"))).append(',')
                .append(csv(line.get("employer_contributions_amount"))).append(',')
                .append(csv(line.get("net_amount")))
                .append('\n');
        }
        return builder.toString();
    }

    public byte[] exportRunPdf(long companyId, long runId) {
        return exportRunPdf(companyId, runId, HrOperationalScope.corporateOffice());
    }

    public byte[] exportRunPdf(AuthSessionUser currentUser, long runId) {
        return exportRunPdf(currentUser.companyId(), runId, hrPayrollScopeAccess.resolve(currentUser));
    }

    private byte[] exportRunPdf(long companyId, long runId, HrOperationalScope scope) {
        var detail = getRunDetail(companyId, runId, scope);
        @SuppressWarnings("unchecked")
        var run = (Map<String, Object>) detail.get("run");
        @SuppressWarnings("unchecked")
        var lines = (List<Map<String, Object>>) detail.get("lines");

        try (var document = new PDDocument(); var buffer = new ByteArrayOutputStream()) {
            var bold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            var regular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

            var page = new PDPage(PDRectangle.LETTER);
            document.addPage(page);
            var content = new PDPageContentStream(document, page);

            float y = writePayrollPdfHeader(content, bold, regular, run);
            for (var line : lines) {
                if (y < 60) {
                    content.close();
                    page = new PDPage(PDRectangle.LETTER);
                    document.addPage(page);
                    content = new PDPageContentStream(document, page);
                    y = writePayrollPdfHeader(content, bold, regular, run);
                }

                content.beginText();
                content.setFont(regular, 9);
                content.newLineAtOffset(40, y);
                content.showText(truncatePdf(String.valueOf(line.get("user_name")), 30));
                content.newLineAtOffset(180, 0);
                content.showText(String.valueOf(line.get("gross_amount")));
                content.newLineAtOffset(80, 0);
                content.showText(String.valueOf(line.get("deductions_amount")));
                content.newLineAtOffset(90, 0);
                content.showText(String.valueOf(line.get("net_amount")));
                content.endText();
                y -= 14;
            }

            content.close();

            document.save(buffer);
            return buffer.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Payroll PDF export could not be generated.", ex);
        }
    }

    private float writePayrollPdfHeader(
        PDPageContentStream content,
        PDType1Font bold,
        PDType1Font regular,
        Map<String, Object> run
    ) throws IOException {
        float y = 740f;

        content.beginText();
        content.setFont(bold, 16);
        content.newLineAtOffset(40, y);
        content.showText("Payroll Run #" + run.get("id"));
        content.endText();

        y -= 24;
        content.beginText();
        content.setFont(regular, 10);
        content.newLineAtOffset(40, y);
        content.showText("Status: " + safe(String.valueOf(run.get("status"))) + "  Period: "
            + safe(String.valueOf(run.get("period_start_date"))) + " to " + safe(String.valueOf(run.get("period_end_date"))));
        content.endText();

        y -= 24;
        content.beginText();
        content.setFont(bold, 10);
        content.newLineAtOffset(40, y);
        content.showText("HR User");
        content.newLineAtOffset(180, 0);
        content.showText("Gross");
        content.newLineAtOffset(80, 0);
        content.showText("Deductions");
        content.newLineAtOffset(90, 0);
        content.showText("Net");
        content.endText();

        return y - 12;
    }

    private PayrollPreferencesRow ensurePreferences(long companyId) {
        var rows = jdbcTemplate.query(
            """
                SELECT company_id,
	                       grouping_mode,
	                       default_daily_hours,
	                       pay_leave_days,
	                       COALESCE(weekly_start_day, 1) AS weekly_start_day,
	                       COALESCE(biweekly_first_day, 1) AS biweekly_first_day,
	                       COALESCE(biweekly_second_day, 16) AS biweekly_second_day,
	                       COALESCE(monthly_start_day, 1) AS monthly_start_day,
	                       isr_rate,
                       imss_user_rate,
                       infonavit_user_rate,
                       imss_employer_rate,
                       infonavit_employer_rate,
                       sar_employer_rate
                FROM payroll_preferences
                WHERE company_id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new PayrollPreferencesRow(
	                rs.getLong("company_id"),
	                normalizeGroupingMode(rs.getString("grouping_mode"), "single"),
	                scaled(rs.getBigDecimal("default_daily_hours")),
	                rs.getBoolean("pay_leave_days"),
	                rs.getInt("weekly_start_day"),
	                rs.getInt("biweekly_first_day"),
	                rs.getInt("biweekly_second_day"),
	                rs.getInt("monthly_start_day"),
	                percentageValue(rs.getBigDecimal("isr_rate")),
                percentageValue(rs.getBigDecimal("imss_user_rate")),
                percentageValue(rs.getBigDecimal("infonavit_user_rate")),
                percentageValue(rs.getBigDecimal("imss_employer_rate")),
                percentageValue(rs.getBigDecimal("infonavit_employer_rate")),
                percentageValue(rs.getBigDecimal("sar_employer_rate"))
            ),
            companyId
        );

        if (!rows.isEmpty()) {
            return rows.getFirst();
        }

        jdbcTemplate.update(
            """
	                INSERT INTO payroll_preferences
	                (company_id, grouping_mode, default_daily_hours, pay_leave_days, weekly_start_day, biweekly_first_day, biweekly_second_day, monthly_start_day, isr_rate, imss_user_rate, infonavit_user_rate, imss_employer_rate, infonavit_employer_rate, sar_employer_rate)
	                VALUES (?, 'single', 8.00, 1, 1, 1, 16, 1, 0.10000, 0.04000, 0.03000, 0.07000, 0.05000, 0.02000)
                """,
            companyId
        );
        return new PayrollPreferencesRow(
            companyId,
            "single",
            scaled(new BigDecimal("8.00")),
            true,
            1,
            1,
            16,
            1,
            percentageValue(new BigDecimal("0.10000")),
            percentageValue(new BigDecimal("0.04000")),
            percentageValue(new BigDecimal("0.03000")),
            percentageValue(new BigDecimal("0.07000")),
            percentageValue(new BigDecimal("0.05000")),
            percentageValue(new BigDecimal("0.02000"))
        );
    }

    private List<PayrollRunRow> loadRuns(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT id,
                       company_id,
                       grouping_mode,
                       grouping_key,
                       grouping_label,
                       pay_period,
                       period_start_date,
                       period_end_date,
                       status,
                       users_count,
                       gross_amount,
                       deductions_amount,
                       employer_contributions_amount,
                       net_amount,
                       created_at
                FROM payroll_runs
                WHERE company_id = ?
                ORDER BY period_end_date DESC, id DESC
                """,
            (rs, rowNum) -> mapRunRow(rs),
            companyId
        );
    }

    private List<PayrollRunRow> loadRuns(long companyId, HrOperationalScope scope) {
        if (scope.isCorporateOffice()) {
            return loadRuns(companyId);
        }

        var params = new ArrayList<Object>();
        params.add(companyId);
        params.addAll(hrPayrollScopeAccess.runLineParameters(scope));

        return jdbcTemplate.query(
            """
                SELECT r.id,
                       r.company_id,
                       r.grouping_mode,
                       r.grouping_key,
                       r.grouping_label,
                       r.pay_period,
                       r.period_start_date,
                       r.period_end_date,
                       r.status,
                       COUNT(l.id) AS users_count,
                       COALESCE(SUM(l.gross_amount), 0) AS gross_amount,
                       COALESCE(SUM(l.deductions_amount), 0) AS deductions_amount,
                       COALESCE(SUM(l.employer_contributions_amount), 0) AS employer_contributions_amount,
                       COALESCE(SUM(l.net_amount), 0) AS net_amount,
                       r.created_at
                FROM payroll_runs r
                JOIN payroll_run_lines l
                  ON l.run_id = r.id
                 AND l.company_id = r.company_id
                WHERE r.company_id = ?
                """
                + hrPayrollScopeAccess.runLinePredicate(scope, "l")
                + """
                GROUP BY r.id, r.company_id, r.grouping_mode, r.grouping_key, r.grouping_label, r.pay_period,
                         r.period_start_date, r.period_end_date, r.status, r.created_at
                ORDER BY r.period_end_date DESC, r.id DESC
                """,
            (rs, rowNum) -> mapRunRow(rs),
            params.toArray()
        );
    }

    private PayrollRunRow loadRun(long companyId, long runId) {
        return loadRun(companyId, runId, false);
    }

    private PayrollRunRow loadRunForUpdate(long companyId, long runId) {
        return loadRun(companyId, runId, true);
    }

    private PayrollRunRow loadRun(long companyId, long runId, boolean forUpdate) {
        var rows = jdbcTemplate.query(
            """
                SELECT id,
                       company_id,
                       grouping_mode,
                       grouping_key,
                       grouping_label,
                       pay_period,
                       period_start_date,
                       period_end_date,
                       status,
                       users_count,
                       gross_amount,
                       deductions_amount,
                       employer_contributions_amount,
                       net_amount,
                       created_at
                FROM payroll_runs
                WHERE company_id = ? AND id = ?
                LIMIT 1
                """ + (forUpdate ? " FOR UPDATE" : ""),
            (rs, rowNum) -> mapRunRow(rs),
            companyId,
            runId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Payroll run not found.");
        }
        return rows.getFirst();
    }

    private PayrollRunRow loadRun(long companyId, long runId, HrOperationalScope scope) {
        if (scope.isCorporateOffice()) {
            return loadRun(companyId, runId);
        }

        var params = new ArrayList<Object>();
        params.add(companyId);
        params.add(runId);
        params.addAll(hrPayrollScopeAccess.runLineParameters(scope));

        var rows = jdbcTemplate.query(
            """
                SELECT r.id,
                       r.company_id,
                       r.grouping_mode,
                       r.grouping_key,
                       r.grouping_label,
                       r.pay_period,
                       r.period_start_date,
                       r.period_end_date,
                       r.status,
                       COUNT(l.id) AS users_count,
                       COALESCE(SUM(l.gross_amount), 0) AS gross_amount,
                       COALESCE(SUM(l.deductions_amount), 0) AS deductions_amount,
                       COALESCE(SUM(l.employer_contributions_amount), 0) AS employer_contributions_amount,
                       COALESCE(SUM(l.net_amount), 0) AS net_amount,
                       r.created_at
                FROM payroll_runs r
                JOIN payroll_run_lines l
                  ON l.run_id = r.id
                 AND l.company_id = r.company_id
                WHERE r.company_id = ?
                  AND r.id = ?
                """
                + hrPayrollScopeAccess.runLinePredicate(scope, "l")
                + """
                GROUP BY r.id, r.company_id, r.grouping_mode, r.grouping_key, r.grouping_label, r.pay_period,
                         r.period_start_date, r.period_end_date, r.status, r.created_at
                LIMIT 1
                """,
            (rs, rowNum) -> mapRunRow(rs),
            params.toArray()
        );

        if (rows.isEmpty()) {
            if (payrollRunExists(companyId, runId)) {
                throw new HrAccessDeniedException("Forbidden");
            }
            throw new NoSuchElementException("Payroll run not found.");
        }
        return rows.getFirst();
    }

    private PayrollRunRow findExistingRun(
        long companyId,
        String groupingMode,
        String groupingKey,
        String payPeriod,
        LocalDate periodStartDate,
        LocalDate periodEndDate
    ) {
        var rows = jdbcTemplate.query(
            """
                SELECT id,
                       company_id,
                       grouping_mode,
                       grouping_key,
                       grouping_label,
                       pay_period,
                       period_start_date,
                       period_end_date,
                       status,
                       users_count,
                       gross_amount,
                       deductions_amount,
                       employer_contributions_amount,
                       net_amount,
                       created_at
                FROM payroll_runs
                WHERE company_id = ?
                  AND grouping_mode = ?
                  AND ((grouping_key IS NULL AND ? IS NULL) OR grouping_key = ?)
                  AND pay_period = ?
                  AND period_start_date = ?
                  AND period_end_date = ?
                  AND status <> 'cancelled'
                ORDER BY id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> mapRunRow(rs),
            companyId,
            groupingMode,
            nullable(groupingKey),
            nullable(groupingKey),
            payPeriod,
            periodStartDate,
            periodEndDate
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private PayrollRunRow findExistingRun(
        long companyId,
        String groupingMode,
        String groupingKey,
        String payPeriod,
        LocalDate periodStartDate,
        LocalDate periodEndDate,
        HrOperationalScope scope
    ) {
        var rows = jdbcTemplate.query(
            """
                SELECT id,
                       company_id,
                       grouping_mode,
                       grouping_key,
                       grouping_label,
                       pay_period,
                       period_start_date,
                       period_end_date,
                       status,
                       users_count,
                       gross_amount,
                       deductions_amount,
                       employer_contributions_amount,
                       net_amount,
                       created_at
                FROM payroll_runs
                WHERE company_id = ?
                  AND grouping_mode = ?
                  AND ((grouping_key IS NULL AND ? IS NULL) OR grouping_key = ?)
                  AND pay_period = ?
                  AND period_start_date = ?
                  AND period_end_date = ?
                  AND status <> 'cancelled'
                ORDER BY id DESC
                """,
            (rs, rowNum) -> mapRunRow(rs),
            companyId,
            groupingMode,
            nullable(groupingKey),
            nullable(groupingKey),
            payPeriod,
            periodStartDate,
            periodEndDate
        );

        for (var row : rows) {
            if (hrPayrollScopeAccess.isRunFullyInScope(companyId, scope, row.id())) {
                return scope.isCorporateOffice() ? row : loadRun(companyId, row.id(), scope);
            }
        }
        return null;
    }

    private List<PayrollHrUserRow> loadEligibleHrUsers(
        long companyId,
        String payPeriod,
        boolean matchRequestedPayPeriod,
        LocalDate periodEndDate,
        LocalDate periodStartDate,
        HrOperationalScope scope
    ) {
        var params = new ArrayList<Object>();
        params.add(companyId);
        params.add(matchRequestedPayPeriod ? 1 : 0);
        params.add(payPeriod);
        params.add(Date.valueOf(periodEndDate));
        params.add(Date.valueOf(periodEndDate));
        params.add(Date.valueOf(periodStartDate));
        params.add(Date.valueOf(periodStartDate));
        params.add(Date.valueOf(periodStartDate));
        params.addAll(scope.hrUserParameters());

        return jdbcTemplate.query(
            """
                SELECT e.id,
                       e.user_id,
                       COALESCE(e.user_code, '') AS user_code,
                       TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))) AS full_name,
                       COALESCE(e.position, '') AS position,
                       COALESCE(e.department, '') AS department,
                       COALESCE(LOWER(e.status), 'active') AS status,
                       e.unit_id,
                       u.name AS unit_name,
                       e.business_id,
                       b.name AS business_name,
	                       COALESCE(e.salary, 0) AS salary,
	                       COALESCE(e.hourly_rate, 0) AS hourly_rate,
	                       COALESCE(LOWER(e.salary_type), 'daily') AS salary_type,
	                       COALESCE(LOWER(e.pay_period), 'weekly') AS pay_period,
	                       COALESCE(e.workday_hours, 8) AS workday_hours,
	                       COALESCE(e.workdays_per_week, 5) AS workdays_per_week,
	                       COALESCE(e.payroll_treatment, 'operational_payroll') AS payroll_treatment,
	                       COALESCE(e.registration_country, '') AS registration_country,
	                       COALESCE(e.state_province, '') AS state_province
                FROM hr_users e
                LEFT JOIN units u ON u.id = e.unit_id
                LEFT JOIN businesses b ON b.id = e.business_id
                WHERE e.company_id = ?
                  AND e.work_profile_id IS NOT NULL
                  AND COALESCE(LOWER(e.status), 'active') <> 'terminated'
                  AND COALESCE(LOWER(e.payroll_treatment), 'operational_payroll') <> 'no_payroll'
                  AND (? = 0 OR COALESCE(LOWER(e.pay_period), 'weekly') = ?)
                  AND (e.hire_date IS NULL OR e.hire_date <= ?)
                  AND (e.contract_start_date IS NULL OR e.contract_start_date <= ?)
                  AND (e.contract_end_date IS NULL OR e.contract_end_date >= ?)
                  AND (e.termination_date IS NULL OR e.termination_date >= ?)
                  AND (e.last_working_day IS NULL OR e.last_working_day >= ?)
                """
                + scope.hrUserPredicate("e")
                + """
                ORDER BY full_name ASC, e.id ASC
                """,
            (rs, rowNum) -> new PayrollHrUserRow(
                rs.getLong("id"),
                rs.getLong("user_id"),
                safe(rs.getString("user_code")),
                safe(rs.getString("full_name")),
                safe(rs.getString("position")),
                safe(rs.getString("department")),
                safe(rs.getString("status")),
                getNullableLong(rs, "unit_id"),
                safe(rs.getString("unit_name")),
                getNullableLong(rs, "business_id"),
                safe(rs.getString("business_name")),
	                scaled(rs.getBigDecimal("salary")),
	                scaled(rs.getBigDecimal("hourly_rate")),
	                safe(rs.getString("salary_type")),
	                safe(rs.getString("pay_period")),
	                scaled(rs.getBigDecimal("workday_hours")),
	                scaled(rs.getBigDecimal("workdays_per_week")),
	                normalizePayrollTreatment(rs.getString("payroll_treatment")),
	                safe(rs.getString("registration_country")),
	                safe(rs.getString("state_province"))
	            ),
            params.toArray()
        );
    }

    private List<PayrollHrUserGroup> groupHrUsers(List<PayrollHrUserRow> users, String groupingMode) {
        var grouped = new LinkedHashMap<String, List<PayrollHrUserRow>>();
        var labels = new LinkedHashMap<String, String>();

        for (var hrUser : users) {
            String organizationalKey;
            String organizationalLabel;
            switch (groupingMode) {
                case "unit" -> {
                    organizationalKey = hrUser.unitId() == null ? "unit:unassigned" : "unit:" + hrUser.unitId();
                    organizationalLabel = hrUser.unitName().isBlank() ? "Sin unidad" : hrUser.unitName();
                }
                case "business" -> {
                    organizationalKey = hrUser.businessId() == null ? "business:unassigned" : "business:" + hrUser.businessId();
                    organizationalLabel = hrUser.businessName().isBlank() ? "Sin negocio" : hrUser.businessName();
                }
                default -> {
                    organizationalKey = "single";
                    organizationalLabel = "Todos los colaboradores";
                }
            }

            var country = payrollRuleResolver.normalizeCountry(hrUser.registrationCountry());
            if (country.isBlank()) {
                country = "UNSPECIFIED";
            }
            var jurisdiction = resolvePayrollJurisdictionCode(country, hrUser.stateProvince());
            if (jurisdiction.isBlank()) {
                jurisdiction = country;
            }
            var currency = resolveCurrencyCode(country);
            var key = organizationalKey
                + "|country:" + country
                + "|jurisdiction:" + jurisdiction
                + "|currency:" + currency;
            var jurisdictionLabel = resolveJurisdictionLabel(country, jurisdiction);
            if (jurisdictionLabel.isBlank()) {
                jurisdictionLabel = country;
            }
            var label = organizationalLabel + " - " + jurisdictionLabel + " - " + currency;

            grouped.computeIfAbsent(key, ignored -> new ArrayList<>()).add(hrUser);
            labels.putIfAbsent(key, label);
        }

        return grouped.entrySet().stream()
            .map((entry) -> new PayrollHrUserGroup(entry.getKey(), labels.get(entry.getKey()), List.copyOf(entry.getValue())))
            .toList();
    }

    private void createRunLine(
        long companyId,
        long runId,
        PayrollHrUserRow user,
        PayrollPreferencesRow preferences,
        String runPayPeriod,
        LocalDate periodStartDate,
        LocalDate periodEndDate
    ) {
        var payrollTreatment = normalizePayrollTreatment(user.payrollTreatment());
        var includeInFiscal = includeInFiscalForTreatment(payrollTreatment);
        var paymentRoute = paymentRouteForTreatment(payrollTreatment);
        var computation = calculateLineWithEngine(
            companyId,
            runId,
            user,
            preferences,
            periodStartDate,
            periodEndDate,
            includeInFiscal
        );
        var result = computation.result();
        var context = computation.context();

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO payroll_run_lines
                    (run_id, company_id, user_company_id, user_id, user_code_snapshot, user_name_snapshot, position_title_snapshot, department_snapshot,
                     unit_id_snapshot, unit_name_snapshot, business_id_snapshot, business_name_snapshot, country_code_snapshot, jurisdiction_code_snapshot,
                     currency_code_snapshot, fx_rate, pay_period_snapshot, salary_type_snapshot, base_salary_amount, hourly_rate_amount, days_payable,
                     leave_days, absence_days, rest_days, missing_attendance_days, paid_leave_days, unpaid_absence_days, late_count, regular_hours,
                     overtime_hours, include_in_fiscal, payroll_treatment_snapshot, payment_route, gross_amount, deductions_amount, employer_contributions_amount, net_amount, notes,
                     calculation_source, calculation_timestamp)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                new String[] {"id"}
            );
            statement.setLong(1, runId);
            statement.setLong(2, companyId);
            statement.setLong(3, user.id());
            statement.setLong(4, user.userId());
            statement.setString(5, nullable(user.userCode()));
            statement.setString(6, user.fullName());
            statement.setString(7, nullable(user.positionTitle()));
            statement.setString(8, nullable(user.department()));
            if (user.unitId() == null) {
                statement.setNull(9, Types.BIGINT);
            } else {
                statement.setLong(9, user.unitId());
            }
            statement.setString(10, nullable(user.unitName()));
            if (user.businessId() == null) {
                statement.setNull(11, Types.BIGINT);
            } else {
                statement.setLong(11, user.businessId());
            }
            statement.setString(12, nullable(user.businessName()));
            statement.setString(13, nullable(context.country()));
            statement.setString(14, nullable(context.jurisdiction()));
            statement.setString(15, nullable(context.currency()));
            statement.setBigDecimal(16, context.fxRate());
            statement.setString(17, runPayPeriod);
            statement.setString(18, user.salaryType());
            statement.setBigDecimal(19, result.baseSalaryAmount());
            if (user.hourlyRate().compareTo(BigDecimal.ZERO) == 0) {
                statement.setNull(20, Types.DECIMAL);
            } else {
                statement.setBigDecimal(20, user.hourlyRate());
            }
            statement.setBigDecimal(21, result.daysPayable());
            statement.setBigDecimal(22, result.leaveDays());
            statement.setBigDecimal(23, result.absenceDays());
            statement.setBigDecimal(24, result.restDays());
            statement.setBigDecimal(25, result.missingAttendanceDays());
            statement.setBigDecimal(26, result.paidLeaveDays());
            statement.setBigDecimal(27, result.unpaidAbsenceDays());
            statement.setInt(28, result.lateCount());
            statement.setBigDecimal(29, result.regularHours());
            statement.setBigDecimal(30, result.overtimeHours());
            statement.setBoolean(31, includeInFiscal);
            statement.setString(32, payrollTreatment);
            statement.setString(33, paymentRoute);
            statement.setBigDecimal(34, result.grossAmount());
            statement.setBigDecimal(35, result.deductionsAmount());
            statement.setBigDecimal(36, result.employerContributionsAmount());
            statement.setBigDecimal(37, result.netAmount());
            statement.setString(38, null);
            statement.setString(39, result.calculationSource());
            statement.setTimestamp(40, Timestamp.valueOf(result.calculationTimestamp()));
            return statement;
        }, keyHolder);

        var runLineId = keyHolder.getKey() == null ? null : keyHolder.getKey().longValue();
        if (runLineId == null) {
            throw new IllegalStateException("Payroll run line could not be created.");
        }

        jdbcTemplate.update(
            """
                UPDATE payroll_run_lines
                SET workday_hours_snapshot = ?,
                    workdays_per_week_snapshot = ?
                WHERE id = ?
                """,
            user.workdayHours(),
            user.workdaysPerWeek(),
            runLineId
        );

        storeCalculatedLineItems(runLineId, result.items());
        hrIncentivePayrollSupplyService.markApplicationsApplied(
            companyId,
            user.id(),
            runId,
            runLineId,
            periodStartDate,
            periodEndDate,
            context.currency()
        );
        payrollSnapshotService.persistLineSnapshot(runLineId, context, result);
        colombiaPayrollReportingService.persistDraftSnapshots(runLineId, context, result);
    }

    private EngineLineComputation calculateLineWithEngine(
        long companyId,
        long runId,
        PayrollHrUserRow user,
        PayrollPreferencesRow preferences,
        LocalDate periodStartDate,
        LocalDate periodEndDate,
        boolean includeInFiscal
    ) {
        var dailyRecords = loadDailyRecords(companyId, user.id(), periodStartDate, periodEndDate);
        var scheduleWindows = loadScheduleWindows(companyId, user.id(), periodStartDate, periodEndDate);
        var attendance = payrollAttendanceInputService.build(
            periodStartDate,
            periodEndDate,
            toAttendanceRecords(dailyRecords),
            toScheduleDays(scheduleWindows, user, preferences, periodStartDate, periodEndDate),
            user.workdayHours().compareTo(BigDecimal.ZERO) > 0 ? user.workdayHours() : preferences.defaultDailyHours(),
            user.salaryType(),
            preferences.payLeaveDays()
        );
        var country = payrollRuleResolver.normalizeCountry(user.registrationCountry());
        var jurisdiction = resolvePayrollJurisdictionCode(country, user.stateProvince());
        var nativeCurrency = resolveCurrencyCode(country);
        var fiscalFrequency = resolveFiscalPayrollFrequency(country, user.payPeriod());
        var countryProfile = loadCountryPayrollProfile(companyId, user.id(), country, periodStartDate, periodEndDate);
        var fiscalAccumulator = payrollFiscalAccumulatorService.loadSnapshot(
            companyId,
            user.id(),
            country,
            periodStartDate,
            periodEndDate,
            runId
        );
        var incentiveAdjustments = hrIncentivePayrollSupplyService.loadApprovedAdjustments(
            companyId,
            user.id(),
            periodStartDate,
            periodEndDate,
            nativeCurrency
        );
        var context = new PayrollCalculationContext(
            companyId,
            user.userId(),
            user.id(),
            runId,
            country,
            jurisdiction,
            nativeCurrency,
            BigDecimal.ONE,
            fiscalFrequency,
            periodStartDate,
            periodEndDate,
            includeInFiscal,
            toSalarySnapshot(user),
            attendance,
            toEnginePreferences(preferences),
            incentiveAdjustments,
            currencySnapshot(nativeCurrency, nativeCurrency, BigDecimal.ONE, periodEndDate),
            countryProfile,
            fiscalAccumulator
        );
        return new EngineLineComputation(context, payrollCalculationEngine.calculateLine(context));
    }

    private EngineLineComputation calculateStoredLineWithEngine(
        PayrollRunLineRow line,
        PayrollRunRow run,
        PayrollPreferencesRow preferences,
        List<PayrollCalculationContext.ManualAdjustment> manualAdjustments,
        String country,
        String jurisdiction
    ) {
        var resolvedCountry = payrollRuleResolver.normalizeCountry(country);
        var resolvedJurisdiction = resolvePayrollJurisdictionCode(resolvedCountry, jurisdiction);
        var nativeCurrency = isBlank(line.currencyCodeSnapshot()) ? resolveCurrencyCode(resolvedCountry) : line.currencyCodeSnapshot();
        var fxRate = line.fxRate() == null || line.fxRate().compareTo(BigDecimal.ZERO) <= 0 ? BigDecimal.ONE : line.fxRate();
        var countryProfile = loadCountryPayrollProfile(
            line.companyId(),
            line.userCompanyId(),
            resolvedCountry,
            run.periodStartDate(),
            run.periodEndDate()
        );
        var fiscalAccumulator = payrollFiscalAccumulatorService.loadSnapshot(
            line.companyId(),
            line.userCompanyId(),
            resolvedCountry,
            run.periodStartDate(),
            run.periodEndDate(),
            run.id()
        );
        var context = new PayrollCalculationContext(
            line.companyId(),
            line.userIdSnapshot(),
            line.userCompanyId(),
            run.id(),
            resolvedCountry,
            resolvedJurisdiction,
            nativeCurrency,
            fxRate,
            resolveFiscalPayrollFrequency(resolvedCountry, line.payPeriodSnapshot()),
            run.periodStartDate(),
            run.periodEndDate(),
            line.includeInFiscal(),
            toSalarySnapshot(line),
            new PayrollCalculationContext.PayrollAttendanceInput(
                line.daysPayable(),
                line.paidLeaveDays(),
                line.leaveDays(),
                line.unpaidAbsenceDays(),
                line.absenceDays(),
                line.restDays(),
                line.missingAttendanceDays(),
                resolveStoredControlWorkDays(
                    line.attendanceSnapshot(),
                    line.daysPayable(),
                    line.paidLeaveDays(),
                    line.leaveDays(),
                    line.absenceDays(),
                    line.missingAttendanceDays()
                ),
                line.lateCount(),
                line.regularHours(),
                line.overtimeHours(),
                line.attendanceWarnings(),
                List.of()
            ),
            toEnginePreferences(preferences),
            manualAdjustments,
            currencySnapshot(nativeCurrency, nativeCurrency, fxRate, run.periodEndDate()),
            countryProfile,
            fiscalAccumulator
        );
        return new EngineLineComputation(context, payrollCalculationEngine.calculateLine(context));
    }

    private Map<LocalDate, PayrollAttendanceInputService.AttendanceRecord> toAttendanceRecords(
        Map<LocalDate, PayrollDailyRecordRow> dailyRecords
    ) {
        var result = new LinkedHashMap<LocalDate, PayrollAttendanceInputService.AttendanceRecord>();
        dailyRecords.forEach((date, record) -> result.put(date, new PayrollAttendanceInputService.AttendanceRecord(
            date,
            resolvePayrollStatus(record),
            record.firstCheckInAt(),
            record.lastCheckOutAt(),
            record.leavePayrollTreatment()
        )));
        return result;
    }

    private Map<LocalDate, PayrollAttendanceInputService.ScheduleDay> toScheduleDays(
        List<PayrollScheduleWindow> windows,
        PayrollHrUserRow user,
        PayrollPreferencesRow preferences,
        LocalDate startDate,
        LocalDate endDate
    ) {
        var result = new LinkedHashMap<LocalDate, PayrollAttendanceInputService.ScheduleDay>();
        var fallbackWorkdays = Math.max(1, Math.min(7, user.workdaysPerWeek().setScale(0, RoundingMode.HALF_UP).intValue()));
        var fallbackHours = user.workdayHours().compareTo(BigDecimal.ZERO) > 0 ? user.workdayHours() : preferences.defaultDailyHours();
        for (var currentDate = startDate; !currentDate.isAfter(endDate); currentDate = currentDate.plusDays(1)) {
            var window = resolveScheduleWindow(windows, currentDate);
            if (window == null) {
                var workday = currentDate.getDayOfWeek().getValue() <= fallbackWorkdays;
                result.put(currentDate, new PayrollAttendanceInputService.ScheduleDay(currentDate, workday, !workday, fallbackHours));
                continue;
            }
            var hours = scheduledHours(window);
            result.put(currentDate, new PayrollAttendanceInputService.ScheduleDay(
                currentDate,
                !window.isRestDay(),
                window.isRestDay(),
                hours.compareTo(BigDecimal.ZERO) > 0 ? hours : fallbackHours
            ));
        }
        return result;
    }

    private PayrollCalculationContext.EmployeeSalarySnapshot toSalarySnapshot(PayrollHrUserRow user) {
        return new PayrollCalculationContext.EmployeeSalarySnapshot(
            user.userCode(),
            user.fullName(),
            user.positionTitle(),
            user.department(),
            user.unitName(),
            user.businessName(),
            user.salaryType(),
            user.salary(),
            user.hourlyRate(),
            user.workdayHours(),
            user.workdaysPerWeek()
        );
    }

    private PayrollCalculationContext.EmployeeSalarySnapshot toSalarySnapshot(PayrollRunLineRow line) {
        return new PayrollCalculationContext.EmployeeSalarySnapshot(
            line.userCodeSnapshot(),
            line.userNameSnapshot(),
            line.positionTitleSnapshot(),
            line.departmentSnapshot(),
            line.unitNameSnapshot(),
            line.businessNameSnapshot(),
            line.salaryTypeSnapshot(),
            line.baseSalaryAmount(),
            line.hourlyRateAmount() == null ? BigDecimal.ZERO : line.hourlyRateAmount(),
            firstPositive(
                line.workdayHoursSnapshot(),
                parseBigDecimal(line.employeeSalarySnapshot(), "workdayHours", "workday_hours")
            ),
            firstPositive(
                line.workdaysPerWeekSnapshot(),
                parseBigDecimal(line.employeeSalarySnapshot(), "workdaysPerWeek", "workdays_per_week")
            )
        );
    }

    private PayrollCalculationContext.Preferences toEnginePreferences(PayrollPreferencesRow preferences) {
        return new PayrollCalculationContext.Preferences(
            preferences.defaultDailyHours(),
            preferences.payLeaveDays(),
            preferences.isrRate(),
            preferences.imssUserRate(),
            preferences.infonavitUserRate(),
            preferences.imssEmployerRate(),
            preferences.infonavitEmployerRate(),
            preferences.sarEmployerRate()
        );
    }

    private void recomputeRunLineFromStoredItems(long runLineId, PayrollPreferencesRow preferences) {
        var line = loadRunLine(runLineId);
        var run = loadRun(line.companyId(), line.runId());
        var payrollJurisdiction = resolvePayrollJurisdiction(line.companyId(), line.userCompanyId());
        var manualAdjustments = loadRunLineAdjustmentItems(runLineId).stream()
            .map((item) -> toStoredAdjustment(item, line.currencyCodeSnapshot()))
            .toList();
        var computation = calculateStoredLineWithEngine(
            line,
            run,
            preferences,
            manualAdjustments,
            isBlank(line.countryCodeSnapshot()) ? payrollJurisdiction.country() : line.countryCodeSnapshot(),
            isBlank(line.jurisdictionCodeSnapshot()) ? payrollJurisdiction.province() : line.jurisdictionCodeSnapshot()
        );
        var recalculated = computation.result();

        jdbcTemplate.update(
            """
                UPDATE payroll_run_lines
                SET include_in_fiscal = ?,
                    payroll_treatment_snapshot = ?,
                    payment_route = ?,
                    notes = ?,
                    country_code_snapshot = ?,
                    jurisdiction_code_snapshot = ?,
                    currency_code_snapshot = ?,
                    fx_rate = ?,
                    workday_hours_snapshot = ?,
                    workdays_per_week_snapshot = ?,
                    gross_amount = ?,
                    deductions_amount = ?,
                    employer_contributions_amount = ?,
                    net_amount = ?,
                    days_payable = ?,
                    leave_days = ?,
                    absence_days = ?,
                    rest_days = ?,
                    missing_attendance_days = ?,
                    paid_leave_days = ?,
                    unpaid_absence_days = ?,
                    late_count = ?,
                    regular_hours = ?,
                    overtime_hours = ?,
                    calculation_source = ?,
                    calculation_timestamp = ?
                WHERE id = ?
                """,
            line.includeInFiscal(),
            line.payrollTreatmentSnapshot(),
            line.paymentRoute(),
            line.notes(),
            computation.context().country(),
            computation.context().jurisdiction(),
            computation.context().currency(),
            computation.context().fxRate(),
            computation.context().salary().workdayHours(),
            computation.context().salary().workdaysPerWeek(),
            recalculated.grossAmount(),
            recalculated.deductionsAmount(),
            recalculated.employerContributionsAmount(),
            recalculated.netAmount(),
            recalculated.daysPayable(),
            recalculated.leaveDays(),
            recalculated.absenceDays(),
            recalculated.restDays(),
            recalculated.missingAttendanceDays(),
            recalculated.paidLeaveDays(),
            recalculated.unpaidAbsenceDays(),
            recalculated.lateCount(),
            recalculated.regularHours(),
            recalculated.overtimeHours(),
            recalculated.calculationSource(),
            Timestamp.valueOf(recalculated.calculationTimestamp()),
            runLineId
        );

        jdbcTemplate.update(
            "DELETE FROM payroll_run_line_items WHERE run_line_id = ? AND source_type NOT IN ('manual', 'incentive')",
            runLineId
        );

        var computedItems = recalculated.items().stream()
            .filter((item) -> !"manual".equals(item.sourceType()) && !"incentive".equals(item.sourceType()))
            .toList();
        if (!computedItems.isEmpty()) {
            storeCalculatedLineItems(runLineId, computedItems);
        }
        payrollSnapshotService.persistLineSnapshot(runLineId, computation.context(), recalculated);
        colombiaPayrollReportingService.persistDraftSnapshots(runLineId, computation.context(), recalculated);
    }

    private void recomputeRunLinesWithEngine(long runId, PayrollPreferencesRow preferences) {
        var results = new ArrayList<PayrollLineCalculationResult>();
        for (var line : loadRunLines(runId)) {
            recomputeRunLineFromStoredItems(line.id(), preferences);
            results.add(loadLineCalculationResult(line.id()));
        }
        payrollSnapshotService.persistRunSnapshot(runId, PayrollCalculationResult.fromLines(results));
    }

    private PayrollLineCalculationResult loadLineCalculationResult(long lineId) {
        var line = loadRunLine(lineId);
        return new PayrollLineCalculationResult(
            line.baseSalaryAmount(),
            line.hourlyRateAmount() == null ? BigDecimal.ZERO : line.hourlyRateAmount(),
            line.daysPayable(),
            line.paidLeaveDays(),
            line.leaveDays(),
            line.unpaidAbsenceDays(),
            line.absenceDays(),
            line.restDays(),
            line.missingAttendanceDays(),
            line.lateCount(),
            line.regularHours(),
            line.overtimeHours(),
            BigDecimal.ZERO,
            line.grossAmount(),
            line.deductionsAmount(),
            line.employerContributionsAmount(),
            line.netAmount(),
            line.grossAmount().add(line.employerContributionsAmount()),
            line.calculationSource(),
            line.calculationTimestamp() == null ? LocalDateTime.now() : line.calculationTimestamp(),
            List.of(),
            line.attendanceWarnings(),
            lineStatutoryCompliance(line),
            lineCalculationWarnings(line),
            line.calculationInputs(),
            line.calculationResults(),
            line.ruleSnapshot(),
            Map.of()
        );
    }

    private void recomputeRunTotals(long runId) {
        var lines = loadRunLines(runId);
        var cohorts = lines.stream()
            .map(this::runLineCohortKey)
            .distinct()
            .toList();
        if (cohorts.size() > 1) {
            throw new IllegalStateException(
                "A payroll run cannot mix countries, jurisdictions, currencies, or pay frequencies. Regenerate the run."
            );
        }
        var usersCount = lines.size();
        var grossAmount = lines.stream().map(PayrollRunLineRow::grossAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        var deductionsAmount = lines.stream().map(PayrollRunLineRow::deductionsAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        var employerContributionsAmount = lines.stream().map(PayrollRunLineRow::employerContributionsAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        var netAmount = lines.stream().map(PayrollRunLineRow::netAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        jdbcTemplate.update(
            """
                UPDATE payroll_runs
                SET users_count = ?,
                    gross_amount = ?,
                    deductions_amount = ?,
                    employer_contributions_amount = ?,
                    net_amount = ?
                WHERE id = ?
                """,
            usersCount,
            scaled(grossAmount),
            scaled(deductionsAmount),
            scaled(employerContributionsAmount),
            scaled(netAmount),
            runId
        );
    }

    private String runLineCohortKey(PayrollRunLineRow line) {
        return payrollRuleResolver.normalizeCountry(line.countryCodeSnapshot())
            + "|" + safe(line.jurisdictionCodeSnapshot()).toUpperCase(Locale.ROOT)
            + "|" + safe(line.currencyCodeSnapshot()).toUpperCase(Locale.ROOT)
            + "|" + normalizePayPeriodSafe(line.payPeriodSnapshot());
    }

    private void updateRunStatus(long runId, String status, long userId) {
        var now = Timestamp.valueOf(LocalDateTime.now());
        switch (status) {
            case "processed" -> jdbcTemplate.update(
                "UPDATE payroll_runs SET status = 'processed', processed_by = ?, processed_at = ? WHERE id = ?",
                userId,
                now,
                runId
            );
            case "approved" -> jdbcTemplate.update(
                "UPDATE payroll_runs SET status = 'approved', approved_by = ?, approved_at = ? WHERE id = ?",
                userId,
                now,
                runId
            );
            case "paid" -> jdbcTemplate.update(
                "UPDATE payroll_runs SET status = 'paid', paid_by = ?, paid_at = ? WHERE id = ?",
                userId,
                now,
                runId
            );
            default -> throw new IllegalArgumentException("Unsupported payroll run status.");
        }
    }

    private void recordRunRecalculation(long runId, long userId) {
        jdbcTemplate.update(
            "UPDATE payroll_runs SET status = 'draft', processed_by = ?, processed_at = ? WHERE id = ?",
            userId,
            Timestamp.valueOf(LocalDateTime.now()),
            runId
        );
    }

    private void requireEditableDraftStatus(PayrollRunRow run) {
        if (!isEditableDraftStatus(run.status())) {
            throw new IllegalArgumentException("Payroll run must be in draft status.");
        }
    }

    private boolean isEditableDraftStatus(String status) {
        return "draft".equals(status) || "processed".equals(status);
    }

    private void requireRunStatus(PayrollRunRow run, String expectedStatus) {
        if (!expectedStatus.equals(run.status())) {
            throw new IllegalArgumentException("Payroll run must be in " + expectedStatus + " status.");
        }
    }

    private List<PayrollRunLineRow> loadRunLines(long runId) {
        return jdbcTemplate.query(
            """
                SELECT id, run_id, company_id, user_company_id, user_id, user_code_snapshot, user_name_snapshot, position_title_snapshot,
                       department_snapshot, unit_id_snapshot, unit_name_snapshot, business_id_snapshot, business_name_snapshot,
                       country_code_snapshot, jurisdiction_code_snapshot, currency_code_snapshot, fx_rate,
                       pay_period_snapshot, salary_type_snapshot, base_salary_amount, hourly_rate_amount,
                       workday_hours_snapshot, workdays_per_week_snapshot, days_payable, leave_days,
                       absence_days, rest_days, missing_attendance_days, paid_leave_days, unpaid_absence_days, late_count,
                       regular_hours, overtime_hours, include_in_fiscal, payroll_treatment_snapshot, payment_route, payable_expense_id,
                       payable_created_at, payable_metadata_json, gross_amount, deductions_amount, employer_contributions_amount,
                       net_amount, notes, calculation_source, calculation_timestamp, employee_salary_snapshot_json,
                       attendance_snapshot_json, manual_adjustments_snapshot_json, calculation_inputs_json, calculation_results_json,
                       rule_snapshot_json, attendance_warnings_json
                FROM payroll_run_lines
                WHERE run_id = ?
                ORDER BY user_name_snapshot ASC, id ASC
                """,
            (rs, rowNum) -> mapRunLineRow(rs),
            runId
        );
    }

    private List<PayrollRunLineRow> loadRunLines(long companyId, long runId, HrOperationalScope scope) {
        if (scope.isCorporateOffice()) {
            return loadRunLines(runId);
        }

        var params = new ArrayList<Object>();
        params.add(companyId);
        params.add(runId);
        params.addAll(hrPayrollScopeAccess.runLineParameters(scope));

        return jdbcTemplate.query(
            """
                SELECT l.id, l.run_id, l.company_id, l.user_company_id, l.user_id, l.user_code_snapshot, l.user_name_snapshot, l.position_title_snapshot,
                       l.department_snapshot, l.unit_id_snapshot, l.unit_name_snapshot, l.business_id_snapshot, l.business_name_snapshot,
                       l.country_code_snapshot, l.jurisdiction_code_snapshot, l.currency_code_snapshot, l.fx_rate,
                       l.pay_period_snapshot, l.salary_type_snapshot, l.base_salary_amount, l.hourly_rate_amount,
                       l.workday_hours_snapshot, l.workdays_per_week_snapshot, l.days_payable, l.leave_days,
                       l.absence_days, l.rest_days, l.missing_attendance_days, l.paid_leave_days, l.unpaid_absence_days, l.late_count,
                       l.regular_hours, l.overtime_hours, l.include_in_fiscal, l.payroll_treatment_snapshot, l.payment_route, l.payable_expense_id,
                       l.payable_created_at, l.payable_metadata_json, l.gross_amount, l.deductions_amount, l.employer_contributions_amount,
                       l.net_amount, l.notes, l.calculation_source, l.calculation_timestamp, l.employee_salary_snapshot_json,
                       l.attendance_snapshot_json, l.manual_adjustments_snapshot_json, l.calculation_inputs_json, l.calculation_results_json,
                       l.rule_snapshot_json, l.attendance_warnings_json
                FROM payroll_run_lines l
                WHERE l.company_id = ?
                  AND l.run_id = ?
                """
                + hrPayrollScopeAccess.runLinePredicate(scope, "l")
                + """
                ORDER BY l.user_name_snapshot ASC, l.id ASC
                """,
            (rs, rowNum) -> mapRunLineRow(rs),
            params.toArray()
        );
    }

    private PayrollRunLineRow loadRunLine(long runId, long lineId) {
        var rows = jdbcTemplate.query(
            """
                SELECT id, run_id, company_id, user_company_id, user_id, user_code_snapshot, user_name_snapshot, position_title_snapshot,
                       department_snapshot, unit_id_snapshot, unit_name_snapshot, business_id_snapshot, business_name_snapshot,
                       country_code_snapshot, jurisdiction_code_snapshot, currency_code_snapshot, fx_rate,
                       pay_period_snapshot, salary_type_snapshot, base_salary_amount, hourly_rate_amount,
                       workday_hours_snapshot, workdays_per_week_snapshot, days_payable, leave_days,
                       absence_days, rest_days, missing_attendance_days, paid_leave_days, unpaid_absence_days, late_count,
                       regular_hours, overtime_hours, include_in_fiscal, payroll_treatment_snapshot, payment_route, payable_expense_id,
                       payable_created_at, payable_metadata_json, gross_amount, deductions_amount, employer_contributions_amount,
                       net_amount, notes, calculation_source, calculation_timestamp, employee_salary_snapshot_json,
                       attendance_snapshot_json, manual_adjustments_snapshot_json, calculation_inputs_json, calculation_results_json,
                       rule_snapshot_json, attendance_warnings_json
                FROM payroll_run_lines
                WHERE run_id = ? AND id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> mapRunLineRow(rs),
            runId,
            lineId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Payroll run line not found.");
        }
        return rows.getFirst();
    }

    private PayrollRunLineRow loadRunLine(long lineId) {
        var rows = jdbcTemplate.query(
            """
                SELECT id, run_id, company_id, user_company_id, user_id, user_code_snapshot, user_name_snapshot, position_title_snapshot,
                       department_snapshot, unit_id_snapshot, unit_name_snapshot, business_id_snapshot, business_name_snapshot,
                       country_code_snapshot, jurisdiction_code_snapshot, currency_code_snapshot, fx_rate,
                       pay_period_snapshot, salary_type_snapshot, base_salary_amount, hourly_rate_amount,
                       workday_hours_snapshot, workdays_per_week_snapshot, days_payable, leave_days,
                       absence_days, rest_days, missing_attendance_days, paid_leave_days, unpaid_absence_days, late_count,
                       regular_hours, overtime_hours, include_in_fiscal, payroll_treatment_snapshot, payment_route, payable_expense_id,
                       payable_created_at, payable_metadata_json, gross_amount, deductions_amount, employer_contributions_amount,
                       net_amount, notes, calculation_source, calculation_timestamp, employee_salary_snapshot_json,
                       attendance_snapshot_json, manual_adjustments_snapshot_json, calculation_inputs_json, calculation_results_json,
                       rule_snapshot_json, attendance_warnings_json
                FROM payroll_run_lines
                WHERE id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> mapRunLineRow(rs),
            lineId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Payroll run line not found.");
        }
        return rows.getFirst();
    }

    private PayrollJurisdictionRow resolvePayrollJurisdiction(long companyId, long userCompanyId) {
        var rows = jdbcTemplate.query(
            """
                SELECT COALESCE(registration_country, '') AS registration_country,
                       COALESCE(state_province, '') AS state_province
                FROM hr_users
                WHERE company_id = ?
                  AND id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new PayrollJurisdictionRow(
                safe(rs.getString("registration_country")),
                safe(rs.getString("state_province"))
            ),
            companyId,
            userCompanyId
        );
        return rows.isEmpty() ? new PayrollJurisdictionRow("", "") : rows.getFirst();
    }

    private PayrollCalculationContext.CountryPayrollProfile loadCountryPayrollProfile(
        long companyId,
        long userCompanyId,
        String country,
        LocalDate periodStartDate,
        LocalDate periodEndDate
    ) {
        var normalizedCountry = payrollRuleResolver.normalizeCountry(country);
        if (!"CO".equals(normalizedCountry)) {
            return PayrollCalculationContext.CountryPayrollProfile.empty(normalizedCountry);
        }

        var companyConfig = loadCompanyCountryConfig(companyId, normalizedCountry);
        var employeeProfile = loadEmployeeCountryProfile(companyId, userCompanyId, normalizedCountry);
        var novelties = loadEmployeeCountryNovelties(
            companyId,
            userCompanyId,
            normalizedCountry,
            periodStartDate,
            periodEndDate
        );
        var metadata = new LinkedHashMap<String, Object>();
        if (companyConfig != null && !companyConfig.metadata().isEmpty()) {
            metadata.put("companyConfig", companyConfig.metadata());
        }
        if (employeeProfile != null && !employeeProfile.metadata().isEmpty()) {
            metadata.put("employeeProfile", employeeProfile.metadata());
        }

        return new PayrollCalculationContext.CountryPayrollProfile(
            normalizedCountry,
            employeeProfile == null ? "" : employeeProfile.contributorType(),
            employeeProfile == null ? "" : employeeProfile.contributorSubtype(),
            employeeProfile != null && employeeProfile.integralSalary(),
            firstPositive(employeeProfile == null ? null : employeeProfile.arlClass(), companyConfig == null ? null : companyConfig.defaultArlClass()),
            employeeProfile == null ? "" : employeeProfile.epsCode(),
            employeeProfile == null ? "" : employeeProfile.epsName(),
            employeeProfile == null ? "" : employeeProfile.afpCode(),
            employeeProfile == null ? "" : employeeProfile.afpName(),
            firstText(employeeProfile == null ? "" : employeeProfile.compensationFundCode(), companyConfig == null ? "" : companyConfig.compensationFundCode()),
            firstText(employeeProfile == null ? "" : employeeProfile.compensationFundName(), companyConfig == null ? "" : companyConfig.compensationFundName()),
            firstBoolean(employeeProfile == null ? null : employeeProfile.employerHealthExemptionApplies(), companyConfig == null ? null : companyConfig.employerHealthExemptionApplies()),
            firstBoolean(employeeProfile == null ? null : employeeProfile.senaApplies(), companyConfig == null ? null : companyConfig.senaApplies()),
            firstBoolean(employeeProfile == null ? null : employeeProfile.icbfApplies(), companyConfig == null ? null : companyConfig.icbfApplies()),
            firstBoolean(employeeProfile == null ? null : employeeProfile.ccfApplies(), companyConfig == null ? null : companyConfig.ccfApplies()),
            employeeProfile == null ? "procedure_1" : employeeProfile.withholdingProcedure(),
            employeeProfile == null ? BigDecimal.ZERO : employeeProfile.dependentsMonthlyDeduction(),
            employeeProfile == null ? BigDecimal.ZERO : employeeProfile.prepaidMedicineMonthly(),
            employeeProfile == null ? BigDecimal.ZERO : employeeProfile.housingInterestMonthly(),
            employeeProfile == null ? BigDecimal.ZERO : employeeProfile.voluntaryPensionMonthly(),
            employeeProfile == null ? BigDecimal.ZERO : employeeProfile.afcMonthly(),
            employeeProfile == null ? BigDecimal.ZERO : employeeProfile.otherExemptIncomeMonthly(),
            employeeProfile == null ? BigDecimal.ZERO : employeeProfile.procedure2FixedRate(),
            novelties,
            metadata
        );
    }

    private PayrollCompanyCountryConfigRow loadCompanyCountryConfig(long companyId, String country) {
        var rows = jdbcTemplate.query(
            """
                SELECT default_arl_class,
                       COALESCE(compensation_fund_code, '') AS compensation_fund_code,
                       COALESCE(compensation_fund_name, '') AS compensation_fund_name,
                       employer_health_exemption_applies,
                       sena_applies,
                       icbf_applies,
                       ccf_applies,
                       metadata_json
                FROM payroll_company_country_configs
                WHERE company_id = ?
                  AND country_code = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new PayrollCompanyCountryConfigRow(
                scaledNullable(rs.getBigDecimal("default_arl_class")),
                safe(rs.getString("compensation_fund_code")),
                safe(rs.getString("compensation_fund_name")),
                getNullableBoolean(rs, "employer_health_exemption_applies"),
                getNullableBoolean(rs, "sena_applies"),
                getNullableBoolean(rs, "icbf_applies"),
                getNullableBoolean(rs, "ccf_applies"),
                payrollSnapshotService.parseObject(rs.getString("metadata_json"))
            ),
            companyId,
            country
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private PayrollEmployeeCountryProfileRow loadEmployeeCountryProfile(
        long companyId,
        long userCompanyId,
        String country
    ) {
        var rows = jdbcTemplate.query(
            """
                SELECT COALESCE(contributor_type, '') AS contributor_type,
                       COALESCE(contributor_subtype, '') AS contributor_subtype,
                       integral_salary,
                       arl_class,
                       COALESCE(eps_code, '') AS eps_code,
                       COALESCE(eps_name, '') AS eps_name,
                       COALESCE(afp_code, '') AS afp_code,
                       COALESCE(afp_name, '') AS afp_name,
                       COALESCE(compensation_fund_code, '') AS compensation_fund_code,
                       COALESCE(compensation_fund_name, '') AS compensation_fund_name,
                       employer_health_exemption_applies,
                       sena_applies,
                       icbf_applies,
                       ccf_applies,
                       COALESCE(withholding_procedure, 'procedure_1') AS withholding_procedure,
                       COALESCE(dependents_monthly_deduction, 0) AS dependents_monthly_deduction,
                       COALESCE(prepaid_medicine_monthly, 0) AS prepaid_medicine_monthly,
                       COALESCE(housing_interest_monthly, 0) AS housing_interest_monthly,
                       COALESCE(voluntary_pension_monthly, 0) AS voluntary_pension_monthly,
                       COALESCE(afc_monthly, 0) AS afc_monthly,
                       COALESCE(other_exempt_income_monthly, 0) AS other_exempt_income_monthly,
                       COALESCE(procedure_2_fixed_rate, 0) AS procedure_2_fixed_rate,
                       metadata_json
                FROM payroll_employee_country_profiles
                WHERE company_id = ?
                  AND user_company_id = ?
                  AND country_code = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new PayrollEmployeeCountryProfileRow(
                safe(rs.getString("contributor_type")),
                safe(rs.getString("contributor_subtype")),
                rs.getBoolean("integral_salary"),
                scaledNullable(rs.getBigDecimal("arl_class")),
                safe(rs.getString("eps_code")),
                safe(rs.getString("eps_name")),
                safe(rs.getString("afp_code")),
                safe(rs.getString("afp_name")),
                safe(rs.getString("compensation_fund_code")),
                safe(rs.getString("compensation_fund_name")),
                getNullableBoolean(rs, "employer_health_exemption_applies"),
                getNullableBoolean(rs, "sena_applies"),
                getNullableBoolean(rs, "icbf_applies"),
                getNullableBoolean(rs, "ccf_applies"),
                safe(rs.getString("withholding_procedure")),
                scaled(rs.getBigDecimal("dependents_monthly_deduction")),
                scaled(rs.getBigDecimal("prepaid_medicine_monthly")),
                scaled(rs.getBigDecimal("housing_interest_monthly")),
                scaled(rs.getBigDecimal("voluntary_pension_monthly")),
                scaled(rs.getBigDecimal("afc_monthly")),
                scaled(rs.getBigDecimal("other_exempt_income_monthly")),
                rateValue(rs.getBigDecimal("procedure_2_fixed_rate")),
                payrollSnapshotService.parseObject(rs.getString("metadata_json"))
            ),
            companyId,
            userCompanyId,
            country
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private List<PayrollCalculationContext.PayrollNovelty> loadEmployeeCountryNovelties(
        long companyId,
        long userCompanyId,
        String country,
        LocalDate periodStartDate,
        LocalDate periodEndDate
    ) {
        return jdbcTemplate.query(
            """
                SELECT COALESCE(novelty_code, '') AS novelty_code,
                       COALESCE(novelty_label, '') AS novelty_label,
                       start_date,
                       end_date,
                       COALESCE(days, 0) AS days,
                       COALESCE(hours, 0) AS hours,
                       COALESCE(ibc_impact_amount, 0) AS ibc_impact_amount,
                       paid,
                       affects_ibc,
                       COALESCE(source, '') AS source,
                       metadata_json
                FROM payroll_employee_country_novelties
                WHERE company_id = ?
                  AND user_company_id = ?
                  AND country_code = ?
                  AND COALESCE(status, 'active') = 'active'
                  AND start_date <= ?
                  AND (end_date IS NULL OR end_date >= ?)
                ORDER BY start_date ASC, id ASC
                """,
            (rs, rowNum) -> new PayrollCalculationContext.PayrollNovelty(
                safe(rs.getString("novelty_code")),
                safe(rs.getString("novelty_label")),
                rs.getDate("start_date") == null ? null : rs.getDate("start_date").toLocalDate(),
                rs.getDate("end_date") == null ? null : rs.getDate("end_date").toLocalDate(),
                scaled(rs.getBigDecimal("days")),
                scaled(rs.getBigDecimal("hours")),
                scaled(rs.getBigDecimal("ibc_impact_amount")),
                rs.getBoolean("paid"),
                rs.getBoolean("affects_ibc"),
                safe(rs.getString("source")),
                payrollSnapshotService.parseObject(rs.getString("metadata_json"))
            ),
            companyId,
            userCompanyId,
            country,
            periodEndDate,
            periodStartDate
        );
    }

    private void requireHrUserInScope(AuthSessionUser currentUser, long userCompanyId) {
        var scope = hrPayrollScopeAccess.resolve(currentUser);
        var params = new ArrayList<Object>();
        params.add(currentUser.companyId());
        params.add(userCompanyId);
        params.addAll(scope.hrUserParameters());

        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM hr_users e
                WHERE e.company_id = ?
                  AND e.id = ?
                """
                + scope.hrUserPredicate("e"),
            Long.class,
            params.toArray()
        );
        if (count != null && count > 0) {
            return;
        }

        var exists = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM hr_users WHERE company_id = ? AND id = ?",
            Long.class,
            currentUser.companyId(),
            userCompanyId
        );
        if (exists != null && exists > 0) {
            throw new HrAccessDeniedException("Forbidden");
        }
        throw new NoSuchElementException("HR user not found.");
    }

    private PayrollEmployeeCountryNoveltyRow loadColombiaNoveltyInScope(AuthSessionUser currentUser, long noveltyId) {
        var scope = hrPayrollScopeAccess.resolve(currentUser);
        var params = new ArrayList<Object>();
        params.add(currentUser.companyId());
        params.add(noveltyId);
        params.addAll(scope.hrUserParameters());

        var rows = jdbcTemplate.query(
            """
                SELECT n.id,
                       n.company_id,
                       n.user_company_id,
                       n.country_code,
                       COALESCE(e.user_code, '') AS user_code,
                       COALESCE(e.full_name, '') AS user_name,
                       COALESCE(n.novelty_code, '') AS novelty_code,
                       COALESCE(n.novelty_label, '') AS novelty_label,
                       n.start_date,
                       n.end_date,
                       COALESCE(n.days, 0) AS days,
                       COALESCE(n.hours, 0) AS hours,
                       n.paid,
                       n.affects_ibc,
                       COALESCE(n.ibc_impact_amount, 0) AS ibc_impact_amount,
                       COALESCE(n.source, '') AS source,
                       COALESCE(n.status, '') AS status,
                       n.metadata_json,
                       n.created_at,
                       n.updated_at
                FROM payroll_employee_country_novelties n
                JOIN hr_users e
                  ON e.company_id = n.company_id
                 AND e.id = n.user_company_id
                WHERE n.company_id = ?
                  AND n.country_code = 'CO'
                  AND n.id = ?
                """
                + scope.hrUserPredicate("e")
                + """
                LIMIT 1
                """,
            (rs, rowNum) -> mapColombiaNoveltyRow(rs),
            params.toArray()
        );
        if (!rows.isEmpty()) {
            return rows.getFirst();
        }

        var exists = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM payroll_employee_country_novelties WHERE company_id = ? AND country_code = 'CO' AND id = ?",
            Long.class,
            currentUser.companyId(),
            noveltyId
        );
        if (exists != null && exists > 0) {
            throw new HrAccessDeniedException("Forbidden");
        }
        throw new NoSuchElementException("Colombia payroll novelty not found.");
    }

    private void appendNoveltyStatusPredicate(StringBuilder sql, List<Object> params, String status) {
        var normalized = safe(status).trim().toLowerCase(Locale.ROOT);
        if (normalized.isBlank()) {
            normalized = "active";
        }
        if ("all".equals(normalized) || "*".equals(normalized)) {
            return;
        }
        sql.append(" AND COALESCE(n.status, 'active') = ?\n");
        params.add(normalizeColombiaNoveltyStatus(normalized));
    }

    private Map<String, Object> toColombiaConfigMap(PayrollCompanyCountryConfigRow row) {
        var body = new LinkedHashMap<String, Object>();
        body.put("country_code", "CO");
        body.put("exists", row != null);
        body.put("default_arl_class", row == null ? null : row.defaultArlClass());
        body.put("compensation_fund_code", row == null ? "" : row.compensationFundCode());
        body.put("compensation_fund_name", row == null ? "" : row.compensationFundName());
        body.put("employer_health_exemption_applies", row == null ? null : row.employerHealthExemptionApplies());
        body.put("sena_applies", row == null ? null : row.senaApplies());
        body.put("icbf_applies", row == null ? null : row.icbfApplies());
        body.put("ccf_applies", row == null ? null : row.ccfApplies());
        body.put("metadata", row == null ? Map.of() : row.metadata());
        return body;
    }

    private Map<String, Object> toColombiaEmployeeProfileMap(long userCompanyId, PayrollEmployeeCountryProfileRow row) {
        var body = new LinkedHashMap<String, Object>();
        body.put("user_company_id", userCompanyId);
        body.put("country_code", "CO");
        body.put("exists", row != null);
        body.put("contributor_type", row == null ? "" : row.contributorType());
        body.put("contributor_subtype", row == null ? "" : row.contributorSubtype());
        body.put("integral_salary", row != null && row.integralSalary());
        body.put("arl_class", row == null ? null : row.arlClass());
        body.put("eps_code", row == null ? "" : row.epsCode());
        body.put("eps_name", row == null ? "" : row.epsName());
        body.put("afp_code", row == null ? "" : row.afpCode());
        body.put("afp_name", row == null ? "" : row.afpName());
        body.put("compensation_fund_code", row == null ? "" : row.compensationFundCode());
        body.put("compensation_fund_name", row == null ? "" : row.compensationFundName());
        body.put("employer_health_exemption_applies", row == null ? null : row.employerHealthExemptionApplies());
        body.put("sena_applies", row == null ? null : row.senaApplies());
        body.put("icbf_applies", row == null ? null : row.icbfApplies());
        body.put("ccf_applies", row == null ? null : row.ccfApplies());
        body.put("withholding_procedure", row == null ? "procedure_1" : row.withholdingProcedure());
        body.put("dependents_monthly_deduction", row == null ? BigDecimal.ZERO : row.dependentsMonthlyDeduction());
        body.put("prepaid_medicine_monthly", row == null ? BigDecimal.ZERO : row.prepaidMedicineMonthly());
        body.put("housing_interest_monthly", row == null ? BigDecimal.ZERO : row.housingInterestMonthly());
        body.put("voluntary_pension_monthly", row == null ? BigDecimal.ZERO : row.voluntaryPensionMonthly());
        body.put("afc_monthly", row == null ? BigDecimal.ZERO : row.afcMonthly());
        body.put("other_exempt_income_monthly", row == null ? BigDecimal.ZERO : row.otherExemptIncomeMonthly());
        body.put("procedure_2_fixed_rate", row == null ? BigDecimal.ZERO.setScale(8, RoundingMode.HALF_UP) : row.procedure2FixedRate());
        body.put("metadata", row == null ? Map.of() : row.metadata());
        return body;
    }

    private Map<String, Object> toColombiaNoveltyMap(PayrollEmployeeCountryNoveltyRow row) {
        var body = new LinkedHashMap<String, Object>();
        body.put("id", row.id());
        body.put("company_id", row.companyId());
        body.put("user_company_id", row.userCompanyId());
        body.put("country_code", row.countryCode());
        body.put("user_code", row.userCode());
        body.put("user_name", row.userName());
        body.put("novelty_code", row.noveltyCode());
        body.put("novelty_label", row.noveltyLabel());
        body.put("start_date", row.startDate().toString());
        body.put("end_date", row.endDate() == null ? null : row.endDate().toString());
        body.put("days", row.days());
        body.put("hours", row.hours());
        body.put("paid", row.paid());
        body.put("affects_ibc", row.affectsIbc());
        body.put("ibc_impact_amount", row.ibcImpactAmount());
        body.put("source", row.source());
        body.put("status", row.status());
        body.put("metadata", row.metadata());
        body.put("created_at", row.createdAt() == null ? null : row.createdAt().toString());
        body.put("updated_at", row.updatedAt() == null ? null : row.updatedAt().toString());
        return body;
    }

    private boolean payrollRunExists(long companyId, long runId) {
        var count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM payroll_runs WHERE company_id = ? AND id = ?",
            Long.class,
            companyId,
            runId
        );
        return count != null && count > 0;
    }

    private List<PayrollRunLineItemRow> loadRunLineItems(long runLineId) {
        return jdbcTemplate.query(
            """
                SELECT id, run_line_id, code, category, label, amount, source_type, country_code, jurisdiction_code,
                       tax_treatment, taxable, exempt, affects_social_security, affects_employer_cost, legal_classification,
                       rule_code, rule_set_id, calculation_formula, calculation_base, rate_applied, currency_code, display_order
                FROM payroll_run_line_items
                WHERE run_line_id = ?
                ORDER BY display_order ASC, id ASC
                """,
            (rs, rowNum) -> mapRunLineItemRow(rs),
            runLineId
        );
    }

    private Map<Long, List<PayrollRunLineItemRow>> loadRunLineItems(List<Long> runLineIds) {
        if (runLineIds.isEmpty()) {
            return Map.of();
        }

        var placeholders = runLineIds.stream().map((ignored) -> "?").collect(Collectors.joining(", "));
        var items = jdbcTemplate.query(
            """
                SELECT id, run_line_id, code, category, label, amount, source_type, country_code, jurisdiction_code,
                       tax_treatment, taxable, exempt, affects_social_security, affects_employer_cost, legal_classification,
                       rule_code, rule_set_id, calculation_formula, calculation_base, rate_applied, currency_code, display_order
                FROM payroll_run_line_items
                WHERE run_line_id IN (
                """
                + placeholders
                + """
                )
                ORDER BY run_line_id ASC, display_order ASC, id ASC
                """,
            (rs, rowNum) -> mapRunLineItemRow(rs),
            runLineIds.toArray()
        );

        return items.stream().collect(Collectors.groupingBy(
            PayrollRunLineItemRow::runLineId,
            LinkedHashMap::new,
            Collectors.toList()
        ));
    }

    private List<PayrollRunLineItemRow> loadRunLineItemsBySource(long runLineId, String sourceType) {
        return jdbcTemplate.query(
            """
                SELECT id, run_line_id, code, category, label, amount, source_type, country_code, jurisdiction_code,
                       tax_treatment, taxable, exempt, affects_social_security, affects_employer_cost, legal_classification,
                       rule_code, rule_set_id, calculation_formula, calculation_base, rate_applied, currency_code, display_order
                FROM payroll_run_line_items
                WHERE run_line_id = ? AND source_type = ?
                ORDER BY display_order ASC, id ASC
                """,
            (rs, rowNum) -> mapRunLineItemRow(rs),
            runLineId,
            sourceType
        );
    }

    private List<PayrollRunLineItemRow> loadRunLineAdjustmentItems(long runLineId) {
        return jdbcTemplate.query(
            """
                SELECT id, run_line_id, code, category, label, amount, source_type, country_code, jurisdiction_code,
                       tax_treatment, taxable, exempt, affects_social_security, affects_employer_cost, legal_classification,
                       rule_code, rule_set_id, calculation_formula, calculation_base, rate_applied, currency_code, display_order
                FROM payroll_run_line_items
                WHERE run_line_id = ? AND source_type IN ('manual', 'incentive')
                ORDER BY display_order ASC, id ASC
                """,
            (rs, rowNum) -> mapRunLineItemRow(rs),
            runLineId
        );
    }

    private PayrollCalculationContext.ManualAdjustment toStoredAdjustment(
        PayrollRunLineItemRow item,
        String fallbackCurrency
    ) {
        return new PayrollCalculationContext.ManualAdjustment(
            isBlank(item.code()) ? "MANUAL_EARNING" : item.code(),
            isBlank(item.category()) ? "earning" : item.category(),
            isBlank(item.label()) ? "Ajuste" : item.label(),
            item.amount(),
            isBlank(item.taxTreatment()) ? "manual_review" : item.taxTreatment(),
            item.taxable(),
            item.affectsSocialSecurity(),
            item.affectsEmployerCost(),
            isBlank(item.legalClassification()) ? "Ajuste de nómina" : item.legalClassification(),
            isBlank(item.currencyCode()) ? fallbackCurrency : item.currencyCode(),
            isBlank(item.sourceType()) ? "manual" : item.sourceType()
        );
    }

    private Map<LocalDate, PayrollDailyRecordRow> loadDailyRecords(long companyId, long userCompanyId, LocalDate startDate, LocalDate endDate) {
        var rows = jdbcTemplate.query(
            """
                SELECT attendance_date,
                       system_status,
                       corrected_status,
                       leave_payroll_treatment,
                       first_check_in_at,
                       last_check_out_at
                FROM user_attendance_daily_records
                WHERE company_id = ?
                  AND user_company_id = ?
                  AND attendance_date BETWEEN ? AND ?
                """,
            (rs, rowNum) -> new PayrollDailyRecordRow(
                rs.getObject("attendance_date", LocalDate.class),
                normalizeNullableAttendanceStatus(rs.getString("system_status")),
                normalizeNullableAttendanceStatus(rs.getString("corrected_status")),
                toLocalDateTime(rs.getTimestamp("first_check_in_at")),
                toLocalDateTime(rs.getTimestamp("last_check_out_at")),
                normalizeNullablePayrollTreatment(rs.getString("leave_payroll_treatment"))
            ),
            companyId,
            userCompanyId,
            startDate,
            endDate
        );
        var result = new HashMap<LocalDate, PayrollDailyRecordRow>();
        for (var row : rows) {
            result.put(row.attendanceDate(), row);
        }
        return result;
    }

    private List<PayrollScheduleWindow> loadScheduleWindows(long companyId, long userCompanyId, LocalDate startDate, LocalDate endDate) {
        return jdbcTemplate.query(
            """
                SELECT a.template_id,
                       a.effective_start_date,
                       a.effective_end_date,
                       d.day_of_week,
                       d.start_time,
                       d.end_time,
                       d.late_after_minutes,
                       d.is_rest_day
                FROM user_schedule_assignments a
                JOIN attendance_schedule_template_days d ON d.template_id = a.template_id
                WHERE a.company_id = ?
                  AND a.user_company_id = ?
                  AND LOWER(COALESCE(a.status, 'active')) = 'active'
                  AND a.effective_start_date <= ?
                  AND (a.effective_end_date IS NULL OR a.effective_end_date >= ?)
                ORDER BY a.effective_start_date DESC, a.id DESC
                """,
            (rs, rowNum) -> new PayrollScheduleWindow(
                rs.getLong("template_id"),
                rs.getObject("effective_start_date", LocalDate.class),
                rs.getObject("effective_end_date", LocalDate.class),
                rs.getInt("day_of_week"),
                rs.getObject("start_time", LocalTime.class),
                rs.getObject("end_time", LocalTime.class),
                rs.getInt("late_after_minutes"),
                rs.getBoolean("is_rest_day")
            ),
            companyId,
            userCompanyId,
            endDate,
            startDate
        );
    }

    private PayrollScheduleWindow resolveScheduleWindow(List<PayrollScheduleWindow> windows, LocalDate date) {
        return windows.stream()
            .filter((window) -> window.dayOfWeek() == date.getDayOfWeek().getValue())
            .filter((window) -> !date.isBefore(window.effectiveStartDate()))
            .filter((window) -> window.effectiveEndDate() == null || !date.isAfter(window.effectiveEndDate()))
            .findFirst()
            .orElse(null);
    }

    private BigDecimal countScheduledWorkDays(List<PayrollScheduleWindow> windows, LocalDate startDate, LocalDate endDate) {
        BigDecimal days = BigDecimal.ZERO;
        for (var currentDate = startDate; !currentDate.isAfter(endDate); currentDate = currentDate.plusDays(1)) {
            var window = resolveScheduleWindow(windows, currentDate);
            if (window != null && !window.isRestDay()) {
                days = days.add(BigDecimal.ONE);
            }
        }
        return days;
    }

    private String resolvePayrollStatus(PayrollDailyRecordRow record) {
        if (record != null && !isBlank(record.correctedStatus())) {
            return record.correctedStatus();
        }
        if (record != null && !isBlank(record.systemStatus())) {
            return record.systemStatus();
        }
        return null;
    }

    private String normalizeNullablePayrollTreatment(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        var normalized = value.trim().toLowerCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        return switch (normalized) {
            case "paid", "paid_leave", "pagado", "con_goce" -> "paid";
            case "unpaid", "unpaid_leave", "no_pagado", "sin_goce" -> "unpaid";
            default -> null;
        };
    }

    private BigDecimal scheduledHours(PayrollScheduleWindow window) {
        if (window == null || window.isRestDay() || window.startTime() == null || window.endTime() == null) {
            return BigDecimal.ZERO;
        }
        var minutes = Duration.between(window.startTime(), window.endTime()).toMinutes();
        if (minutes <= 0) {
            minutes += Duration.ofHours(24).toMinutes();
        }
        return BigDecimal.valueOf(minutes)
            .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal resolveWorkedHours(PayrollDailyRecordRow record, BigDecimal scheduledHours) {
        if (record == null || record.firstCheckInAt() == null) {
            return BigDecimal.ZERO;
        }
        if (record.lastCheckOutAt() == null) {
            return scheduledHours;
        }
        if (!record.lastCheckOutAt().isAfter(record.firstCheckInAt())) {
            return BigDecimal.ZERO;
        }
        return BigDecimal.valueOf(Duration.between(record.firstCheckInAt(), record.lastCheckOutAt()).toMinutes())
            .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
    }

    private void storeCalculatedLineItems(long runLineId, List<PayrollCalculatedLineItem> items) {
        for (var item : items) {
            jdbcTemplate.update(
                """
                    INSERT INTO payroll_run_line_items
                    (run_line_id, code, category, label, amount, source_type, country_code, jurisdiction_code, tax_treatment,
                     taxable, exempt, affects_social_security, affects_employer_cost, legal_classification, rule_code, rule_set_id,
                     calculation_formula, calculation_base, rate_applied, currency_code, display_order)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                runLineId,
                item.code(),
                item.category(),
                item.label(),
                scaled(item.amount()),
                item.sourceType(),
                nullable(item.countryCode()),
                nullable(item.jurisdictionCode()),
                nullable(item.taxTreatment()),
                item.taxable(),
                item.exempt(),
                item.affectsSocialSecurity(),
                item.affectsEmployerCost(),
                nullable(item.legalClassification()),
                nullable(item.ruleCode()),
                item.ruleSetId(),
                nullable(item.calculationFormula()),
                item.calculationBase(),
                item.rateApplied(),
                nullable(item.currencyCode()),
                item.displayOrder()
            );
        }
    }

    private List<ManualPayrollItemInput> parseManualItems(Object rawValue) {
        if (!(rawValue instanceof List<?> rawItems)) {
            return List.of();
        }

        var items = new ArrayList<ManualPayrollItemInput>();
        for (var rawItem : rawItems) {
            if (!(rawItem instanceof Map<?, ?> rawMap)) {
                throw new IllegalArgumentException("manual_items entries must be objects.");
            }
            var map = new LinkedHashMap<String, Object>();
            rawMap.forEach((key, value) -> map.put(String.valueOf(key), value));

            var category = normalizeManualCategory(stringValue(map, "category"));
            var label = stringValue(map, "label");
            if (label.isBlank()) {
                throw new IllegalArgumentException("manual item label is required.");
            }
            var amount = parseBigDecimal(map, "amount");
            if (amount == null || amount.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("manual item amount must be zero or greater.");
            }
            items.add(new ManualPayrollItemInput(
                manualCodeForCategory(category),
                category,
                label,
                scaled(amount)
            ));
        }
        return items;
    }

    private String normalizeManualCategory(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "earning", "percepcion", "percepción", "perception" -> "earning";
            case "deduction", "deduccion", "deducción", "deduction_manual" -> "deduction";
            case "employer_contribution", "provision" -> normalized;
            default -> throw new IllegalArgumentException(
                "manual item category must be earning, deduction, employer_contribution, or provision."
            );
        };
    }

    private String manualCodeForCategory(String category) {
        return switch (category) {
            case "earning" -> "MANUAL_EARNING";
            case "deduction" -> "MANUAL_DEDUCTION";
            case "employer_contribution" -> "MANUAL_EMPLOYER_CONTRIBUTION";
            case "provision" -> "MANUAL_PROVISION";
            default -> "MANUAL_ADJUSTMENT";
        };
    }

    private String resolvePayrollTreatmentFromPayload(Map<String, Object> payload, PayrollRunLineRow line) {
        if (payloadHasAny(payload, "payroll_treatment", "payrollTreatment", "tratamiento_nomina", "tratamientoNomina")) {
            return normalizePayrollTreatment(
                stringValue(payload, "payroll_treatment", "payrollTreatment", "tratamiento_nomina", "tratamientoNomina")
            );
        }
        if (payloadHasAny(payload, "include_in_fiscal", "includeInFiscal")) {
            var includeInFiscal = payloadBoolean(payload, line.includeInFiscal(), "include_in_fiscal", "includeInFiscal");
            return includeInFiscal ? PAYROLL_TREATMENT_FISCAL : PAYROLL_TREATMENT_OPERATIONAL;
        }
        return normalizePayrollTreatment(line.payrollTreatmentSnapshot());
    }

    private String normalizePayrollTreatment(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT).replace('-', '_');
        return switch (normalized) {
            case "", "fiscal", "fiscal_payroll", "nomina_fiscal", "nómina_fiscal", "nomina fiscal", "nómina fiscal" ->
                PAYROLL_TREATMENT_FISCAL;
            case "operational", "operativo", "operational_payroll", "nomina_operativa", "nómina_operativa",
                "nomina operativa", "nómina operativa" -> PAYROLL_TREATMENT_OPERATIONAL;
            case "accounts_payable", "payable", "expenses", "expense", "cuenta_por_pagar", "cuenta por pagar" ->
                PAYROLL_TREATMENT_ACCOUNTS_PAYABLE;
            case "no_payroll", "none", "sin_nomina", "sin_nómina", "sin nomina", "sin nómina" -> PAYROLL_TREATMENT_NO_PAYROLL;
            default -> throw new IllegalArgumentException("Unsupported payroll treatment.");
        };
    }

    private String normalizePaymentRoute(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT).replace('-', '_');
        return switch (normalized) {
            case "", "payroll", "nomina", "nómina" -> PAYMENT_ROUTE_PAYROLL;
            case "expenses", "expense", "accounts_payable", "cuentas_por_pagar", "cuenta_por_pagar" -> PAYMENT_ROUTE_EXPENSES;
            case "none", "excluded", "no_payroll", "sin_nomina", "sin_nómina" -> PAYMENT_ROUTE_NONE;
            default -> PAYMENT_ROUTE_PAYROLL;
        };
    }

    private boolean includeInFiscalForTreatment(String treatment) {
        return PAYROLL_TREATMENT_FISCAL.equals(normalizePayrollTreatment(treatment));
    }

    private String paymentRouteForTreatment(String treatment) {
        return switch (normalizePayrollTreatment(treatment)) {
            case PAYROLL_TREATMENT_ACCOUNTS_PAYABLE -> PAYMENT_ROUTE_EXPENSES;
            case PAYROLL_TREATMENT_NO_PAYROLL -> PAYMENT_ROUTE_NONE;
            default -> PAYMENT_ROUTE_PAYROLL;
        };
    }

    private String payrollTreatmentLabel(String treatment) {
        return switch (normalizePayrollTreatment(treatment)) {
            case PAYROLL_TREATMENT_FISCAL -> "Nómina fiscal";
            case PAYROLL_TREATMENT_OPERATIONAL -> "Nómina operativa";
            case PAYROLL_TREATMENT_ACCOUNTS_PAYABLE -> "Cuenta por pagar";
            case PAYROLL_TREATMENT_NO_PAYROLL -> "Sin nómina";
            default -> "Nómina fiscal";
        };
    }

    private String paymentRouteLabel(String route) {
        return switch (normalizePaymentRoute(route)) {
            case PAYMENT_ROUTE_EXPENSES -> "Expenses / Cuenta por pagar";
            case PAYMENT_ROUTE_NONE -> "Sin ruta de pago";
            default -> "Nómina";
        };
    }

    private FinanceContext payrollFinanceContext(long companyId, long actorUserId, PayrollRunLineRow line) {
        var financeScope = line.businessIdSnapshot() != null
            ? FinanceScope.businessOffice(line.unitIdSnapshot(), line.businessIdSnapshot())
            : line.unitIdSnapshot() != null
                ? FinanceScope.unitHeadquarters(line.unitIdSnapshot())
                : FinanceScope.corporateOffice();
        return new FinanceContext(
            actorUserId,
            companyId,
            "HR Payroll integration",
            "payroll_system",
            true,
            financeScope
        );
    }

    private String payrollPayableFolio(long runId, long lineId) {
        return "NOM-" + runId + "-" + lineId;
    }

    private ObjectNode payrollPayableMetadata(PayrollRunRow run, PayrollRunLineRow line) {
        var metadata = JsonNodeFactory.instance.objectNode();
        metadata.put("source", "hr_payroll");
        metadata.put("integration_principal", "hr_payroll");
        metadata.put("payroll_run_id", run.id());
        metadata.put("payroll_run_line_id", line.id());
        metadata.put("user_company_id", line.userCompanyId());
        metadata.put("user_id", line.userIdSnapshot());
        metadata.put("employee_name", line.userNameSnapshot());
        metadata.put("payroll_treatment", normalizePayrollTreatment(line.payrollTreatmentSnapshot()));
        metadata.put("payment_route", normalizePaymentRoute(line.paymentRoute()));
        metadata.put("country", safe(line.countryCodeSnapshot()));
        metadata.put("jurisdiction", safe(line.jurisdictionCodeSnapshot()));
        metadata.put("pay_period", safe(line.payPeriodSnapshot()));
        metadata.put("period_start_date", run.periodStartDate().toString());
        metadata.put("period_end_date", run.periodEndDate().toString());
        metadata.put("currency_code", safe(line.currencyCodeSnapshot()));
        metadata.put("net_amount", scaled(line.netAmount()).toPlainString());
        return metadata;
    }

    private Long findExistingPayrollPayable(long companyId, String folio) {
        var rows = jdbcTemplate.query(
            """
                SELECT id
                FROM finance_expenses
                WHERE company_id = ?
                  AND folio = ?
                  AND deleted_at IS NULL
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getLong("id"),
            companyId,
            folio
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private void linkPayrollPayableLine(long lineId, long expenseId, ObjectNode metadata) {
        jdbcTemplate.update(
            """
                UPDATE payroll_run_lines
                SET payable_expense_id = ?,
                    payable_created_at = COALESCE(payable_created_at, CURRENT_TIMESTAMP),
                    payable_metadata_json = ?
                WHERE id = ?
                """,
            expenseId,
            payrollSnapshotService.jsonValue(metadata),
            lineId
        );
    }

    private void createPayrollPayablesForApprovedRun(long companyId, long userId, long runId) {
        var run = loadRun(companyId, runId);
        for (var line : loadRunLines(runId)) {
            if (PAYMENT_ROUTE_NONE.equals(normalizePaymentRoute(line.paymentRoute()))) {
                continue;
            }
            var total = scaled(line.netAmount()).max(BigDecimal.ZERO);
            if (total.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            var context = payrollFinanceContext(companyId, userId, line);

            var folio = payrollPayableFolio(runId, line.id());
            var metadata = payrollPayableMetadata(run, line);
            var existingExpenseId = line.payableExpenseId() == null
                ? findExistingPayrollPayable(companyId, folio)
                : line.payableExpenseId();
            if (existingExpenseId != null) {
                linkPayrollPayableLine(line.id(), existingExpenseId, metadata);
                continue;
            }

            var currencyCode = isBlank(line.currencyCodeSnapshot()) ? "MXN" : line.currencyCodeSnapshot();
            var request = new CreateExpenseRequest(
                line.unitIdSnapshot(),
                line.businessIdSnapshot(),
                null,
                null,
                null,
                null,
                null,
                folio,
                "Cuenta por pagar de nómina - " + line.userNameSnapshot(),
                "Pago operativo derivado de la corrida de nómina #" + run.id()
                    + " (" + run.periodStartDate() + " a " + run.periodEndDate() + ").",
                ExpenseType.VARIABLE,
                total,
                BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
                total,
                currencyCode,
                run.periodEndDate(),
                run.periodEndDate(),
                userId,
                userId,
                userId,
                null,
                null,
                metadata
            );

            var created = expenseService.createDraft(context, request);
            expenseService.submitForApproval(context, created.id());
            var approved = expenseService.approve(context, created.id());
            linkPayrollPayableLine(line.id(), approved.id(), metadata);
        }
    }

    private void ensurePayrollAccountsPayableLinesArePaid(long companyId, long runId) {
        var pending = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM payroll_run_lines line
                LEFT JOIN finance_expenses expense
                  ON expense.id = line.payable_expense_id
                 AND expense.company_id = line.company_id
                 AND expense.deleted_at IS NULL
                WHERE line.company_id = ?
                  AND line.run_id = ?
                  AND COALESCE(LOWER(line.payment_route), 'payroll') <> 'none'
                  AND line.net_amount > 0
                  AND (
                    line.payable_expense_id IS NULL
                    OR expense.id IS NULL
                    OR expense.payment_status <> 'PAID'
                  )
                """,
            Integer.class,
            companyId,
            runId
        );
        if (pending != null && pending > 0) {
            throw new IllegalArgumentException(
                "La corrida tiene líneas enviadas a Cuenta por pagar pendientes de pago."
            );
        }
    }

    /**
     * Expenses is the source of truth for settlement. Once every payable line
     * created by an approved run is paid, payroll reflects the run as paid
     * without requiring a second manual action in Human Resources.
     */
    private void reconcilePaidPayrollRuns(long companyId) {
        jdbcTemplate.update(
            """
                UPDATE payroll_runs
                SET status = 'paid',
                    paid_at = COALESCE(payroll_runs.paid_at, CURRENT_TIMESTAMP)
                WHERE payroll_runs.company_id = ?
                  AND payroll_runs.status = 'approved'
                  AND EXISTS (
                    SELECT 1
                    FROM payroll_run_lines line
                    WHERE line.run_id = payroll_runs.id
                      AND line.company_id = payroll_runs.company_id
                      AND COALESCE(LOWER(line.payment_route), 'payroll') <> 'none'
                      AND line.net_amount > 0
                  )
                  AND NOT EXISTS (
                    SELECT 1
                    FROM payroll_run_lines line
                    LEFT JOIN finance_expenses expense
                      ON expense.id = line.payable_expense_id
                     AND expense.company_id = line.company_id
                     AND expense.deleted_at IS NULL
                    WHERE line.run_id = payroll_runs.id
                      AND line.company_id = payroll_runs.company_id
                      AND COALESCE(LOWER(line.payment_route), 'payroll') <> 'none'
                      AND line.net_amount > 0
                      AND (
                        line.payable_expense_id IS NULL
                        OR expense.id IS NULL
                        OR expense.payment_status <> 'PAID'
                      )
                  )
                """,
            companyId
        );
    }

    private boolean matchesRunFilters(PayrollRunRow run, Map<String, String> filters) {
        if (!matchesRunStatus(run.status(), filters.get("status"))) {
            return false;
        }

        var payPeriod = safe(filters.get("pay_period")).trim().toLowerCase(Locale.ROOT);
        if (!payPeriod.isBlank() && !payPeriod.equals(run.payPeriod())) {
            return false;
        }

        var groupingMode = safe(filters.get("grouping_mode")).trim().toLowerCase(Locale.ROOT);
        if (!groupingMode.isBlank() && !groupingMode.equals(run.groupingMode())) {
            return false;
        }

        var periodFrom = parseOptionalDate(filters.get("period_from"));
        if (periodFrom != null && run.periodEndDate().isBefore(periodFrom)) {
            return false;
        }

        var periodTo = parseOptionalDate(filters.get("period_to"));
        if (periodTo != null && run.periodStartDate().isAfter(periodTo)) {
            return false;
        }

        var unitId = safe(filters.get("unit_id")).trim();
        if (!unitId.isBlank() && !"unit".equals(run.groupingMode())) {
            return false;
        }
        if (!unitId.isBlank() && !groupingKeyMatches(run.groupingKey(), "unit:" + unitId)) {
            return false;
        }

        var businessId = safe(filters.get("business_id")).trim();
        if (!businessId.isBlank() && !"business".equals(run.groupingMode())) {
            return false;
        }
        if (!businessId.isBlank() && !groupingKeyMatches(run.groupingKey(), "business:" + businessId)) {
            return false;
        }

        return true;
    }

    static boolean matchesRunStatus(String runStatus, String requestedStatus) {
        var normalizedRunStatus = runStatus == null
            ? ""
            : runStatus.trim().toLowerCase(Locale.ROOT);
        var normalizedRequestedStatus = requestedStatus == null
            ? ""
            : requestedStatus.trim().toLowerCase(Locale.ROOT);
        if ("processed".equals(normalizedRunStatus)) {
            normalizedRunStatus = "draft";
        }
        if ("processed".equals(normalizedRequestedStatus)) {
            normalizedRequestedStatus = "draft";
        }

        // The default payroll screen is an operational queue. Cancelled runs remain
        // stored for audit/history and are only returned when explicitly requested.
        if (normalizedRequestedStatus.isBlank() || "all".equals(normalizedRequestedStatus)) {
            return !"cancelled".equals(normalizedRunStatus);
        }
        return normalizedRequestedStatus.equals(normalizedRunStatus);
    }

    private String visibleRunStatus(String status) {
        return "processed".equals(safe(status).toLowerCase(Locale.ROOT)) ? "draft" : status;
    }

    private boolean groupingKeyMatches(String groupingKey, String organizationalKey) {
        var normalized = safe(groupingKey);
        return normalized.equals(organizationalKey) || normalized.startsWith(organizationalKey + "|");
    }

    private Map<String, Object> toPreferencesMap(PayrollPreferencesRow preferences) {
        var body = new LinkedHashMap<String, Object>();
        body.put("grouping_mode", preferences.groupingMode());
        body.put("default_daily_hours", scaled(preferences.defaultDailyHours()));
        body.put("pay_leave_days", preferences.payLeaveDays());
        body.put("weekly_start_day", preferences.weeklyStartDay());
        body.put("biweekly_first_day", preferences.biweeklyFirstDay());
        body.put("biweekly_second_day", preferences.biweeklySecondDay());
        body.put("monthly_start_day", preferences.monthlyStartDay());
        body.put("isr_rate", percentageValue(preferences.isrRate()));
        body.put("imss_user_rate", percentageValue(preferences.imssUserRate()));
        body.put("infonavit_user_rate", percentageValue(preferences.infonavitUserRate()));
        body.put("imss_employer_rate", percentageValue(preferences.imssEmployerRate()));
        body.put("infonavit_employer_rate", percentageValue(preferences.infonavitEmployerRate()));
        body.put("sar_employer_rate", percentageValue(preferences.sarEmployerRate()));
        return body;
    }

    private Map<String, Object> toRunSummaryMap(PayrollRunRow run) {
        var runCurrencySignals = loadRunCurrencySignals(run.id());
        var nativeTotalsByCurrency = nativeTotalsByCurrency(runCurrencySignals);
        var currencyCode = nativeTotalsByCurrency.size() == 1
            ? nativeTotalsByCurrency.keySet().iterator().next()
            : null;
        var unsupportedCountryCount = unsupportedCountryLineCount(run.id());

        var body = new LinkedHashMap<String, Object>();
        body.put("id", run.id());
        body.put("grouping_mode", run.groupingMode());
        body.put("grouping_key", run.groupingKey());
        body.put("grouping_label", run.groupingLabel());
        body.put("jurisdiction_label", summarizeJurisdictionLabel(runCurrencySignals));
        body.put("currency_code", currencyCode);
        body.put("native_totals_by_currency", scaledCurrencyTotals(nativeTotalsByCurrency));
        body.put("pay_period", run.payPeriod());
        body.put("period_start_date", run.periodStartDate().toString());
        body.put("period_end_date", run.periodEndDate().toString());
        body.put("status", visibleRunStatus(run.status()));
        body.put("users_count", run.usersCount());
        body.put("gross_amount", scaled(run.grossAmount()));
        body.put("deductions_amount", scaled(run.deductionsAmount()));
        body.put("employer_contributions_amount", scaled(run.employerContributionsAmount()));
        body.put("net_amount", scaled(run.netAmount()));
        body.put("statutory_compliance", unsupportedCountryCount == 0);
        body.put("unsupported_country_count", unsupportedCountryCount);
        body.put("calculation_warnings", unsupportedCountryCount == 0
            ? List.of()
            : List.of("Hay " + unsupportedCountryCount + " línea(s) con cálculo genérico por país no soportado."));
        body.put("created_at", run.createdAt() == null ? null : run.createdAt().toString());
        return body;
    }

    private int unsupportedCountryLineCount(long runId) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM payroll_run_lines
                WHERE run_id = ?
                  AND calculation_source = 'GENERIC_UNSUPPORTED_COUNTRY'
                """,
            Integer.class,
            runId
        );
        return count == null ? 0 : count;
    }

    private List<PayrollRunCurrencySignal> loadRunCurrencySignals(long runId) {
        return jdbcTemplate.query(
            """
                SELECT COALESCE(NULLIF(l.country_code_snapshot, ''), NULLIF(hu.registration_country, ''), '') AS country,
                       COALESCE(NULLIF(l.jurisdiction_code_snapshot, ''), NULLIF(hu.state_province, ''), '') AS province,
                       COALESCE(SUM(l.gross_amount), 0) AS gross_amount,
                       COALESCE(SUM(l.net_amount), 0) AS net_amount
                FROM payroll_run_lines l
                LEFT JOIN hr_users hu
                  ON hu.company_id = l.company_id
                 AND hu.id = l.user_company_id
                WHERE l.run_id = ?
                GROUP BY COALESCE(NULLIF(l.country_code_snapshot, ''), NULLIF(hu.registration_country, ''), ''),
                         COALESCE(NULLIF(l.jurisdiction_code_snapshot, ''), NULLIF(hu.state_province, ''), '')
                ORDER BY country ASC, province ASC
                """,
            (rs, rowNum) -> new PayrollRunCurrencySignal(
                safe(rs.getString("country")),
                safe(rs.getString("province")),
                scaled(rs.getBigDecimal("gross_amount")),
                scaled(rs.getBigDecimal("net_amount"))
            ),
            runId
        );
    }

    private Map<String, BigDecimal> nativeTotalsByCurrency(List<PayrollRunCurrencySignal> signals) {
        var totalsByCurrency = new LinkedHashMap<String, BigDecimal>();
        for (var signal : signals) {
            var currencyCode = resolveCurrencyCode(signal.country());
            totalsByCurrency.merge(currencyCode, signal.netAmount(), BigDecimal::add);
        }
        return totalsByCurrency;
    }

    private Map<String, Object> scaledCurrencyTotals(Map<String, BigDecimal> nativeTotalsByCurrency) {
        var body = new LinkedHashMap<String, Object>();
        nativeTotalsByCurrency.forEach((currencyCode, amount) -> body.put(currencyCode, scaled(amount)));
        return body;
    }

    private String summarizeJurisdictionLabel(List<PayrollRunCurrencySignal> signals) {
        var labels = signals.stream()
            .map((signal) -> resolveJurisdictionLabel(signal.country(), signal.province()))
            .filter((label) -> !label.isBlank())
            .distinct()
            .toList();

        if (labels.isEmpty()) {
            return "";
        }
        if (labels.size() == 1) {
            return labels.getFirst();
        }
        return "Multiple jurisdictions";
    }

    private String resolveCurrencyCode(String country) {
        return switch (normalizeCountryKey(country)) {
            case "BR", "BRAZIL", "BRASIL" -> "BRL";
            case "CA", "CANADA" -> "CAD";
            case "CO", "COLOMBIA" -> "COP";
            case "MX", "MEXICO", "MÉXICO" -> "MXN";
            case "US", "USA", "UNITEDSTATES", "UNITED STATES" -> "USD";
            default -> "USD";
        };
    }

    private PayrollCalculationContext.CurrencySnapshot currencySnapshot(
        String nativeCurrency,
        String displayCurrency,
        BigDecimal fxRate,
        LocalDate fxDate
    ) {
        var source = nativeCurrency.equals(displayCurrency) ? "DEFAULT_SAME_CURRENCY" : "DEFAULT_NO_FX_PROVIDER";
        var warnings = nativeCurrency.equals(displayCurrency)
            ? List.<String>of()
            : List.of("No hay tipo de cambio real para convertir " + nativeCurrency + " a " + displayCurrency + ".");
        return new PayrollCalculationContext.CurrencySnapshot(
            nativeCurrency,
            displayCurrency,
            fxRate,
            source,
            fxDate,
            true,
            false,
            warnings
        );
    }

    private String resolveFiscalPayrollFrequency(String country, String payPeriod) {
        var normalizedPeriod = normalizePayPeriodSafe(payPeriod);
        if ("biweekly".equals(normalizedPeriod)) {
            var normalizedCountry = payrollRuleResolver.normalizeCountry(country);
            if ("MX".equals(normalizedCountry) || "BR".equals(normalizedCountry)) {
                return "semimonthly";
            }
        }
        return normalizedPeriod;
    }

    private String resolvePayrollJurisdictionCode(String country, String province) {
        var normalizedCountry = payrollRuleResolver.normalizeCountry(country);
        var normalizedProvince = safe(province).trim().toUpperCase(Locale.ROOT);
        if ("CA".equals(normalizedCountry)) {
            return switch (normalizedProvince.replace(".", "").replace("_", " ").replace("-", " ")) {
                case "QUEBEC", "QUÉBEC", "PQ" -> "QC";
                case "" -> "ON";
                default -> normalizedProvince.length() == 2 ? normalizedProvince : "ON";
            };
        }
        if ("US".equals(normalizedCountry)) {
            return switch (normalizedProvince.replace(".", "").replace("_", " ").replace("-", " ")) {
                case "CALIFORNIA" -> "CA";
                case "NEW YORK", "NUEVA YORK" -> "NY";
                case "WASHINGTON", "WASHINGTON STATE" -> "WA";
                default -> normalizedProvince.length() == 2 ? normalizedProvince : "";
            };
        }
        return normalizedCountry;
    }

    private String resolveJurisdictionLabel(String country, String province) {
        var countryKey = normalizeCountryKey(country);
        var cleanProvince = safe(province).trim();
        return switch (countryKey) {
            case "BR", "BRAZIL", "BRASIL" -> "Brazil";
            case "CA", "CANADA" -> cleanProvince.isBlank()
                ? "Canada"
                : cleanProvince + ", Canada";
            case "CO", "COLOMBIA" -> "Colombia";
            case "MX", "MEXICO", "MÉXICO" -> "Mexico";
            case "US", "USA", "UNITEDSTATES", "UNITED STATES" -> cleanProvince.isBlank()
                ? "USA"
                : cleanProvince + ", USA";
            default -> "";
        };
    }

    private String normalizeCountryKey(String country) {
        return safe(country)
            .trim()
            .toUpperCase(Locale.ROOT)
            .replace(".", "")
            .replace("-", "")
            .replace("_", "")
            .replace(" ", "");
    }

    private Map<String, Object> toRunLineItemMap(PayrollRunLineItemRow item) {
        var body = new LinkedHashMap<String, Object>();
        body.put("id", item.id());
        body.put("code", item.code());
        body.put("category", item.category());
        body.put("label", item.label());
        body.put("amount", scaled(item.amount()));
        body.put("source_type", item.sourceType());
        body.put("country_code", item.countryCode());
        body.put("jurisdiction_code", item.jurisdictionCode());
        body.put("tax_treatment", item.taxTreatment());
        body.put("taxable", item.taxable());
        body.put("exempt", item.exempt());
        body.put("affects_social_security", item.affectsSocialSecurity());
        body.put("affects_employer_cost", item.affectsEmployerCost());
        body.put("legal_classification", item.legalClassification());
        body.put("rule_code", item.ruleCode());
        body.put("rule_set_id", item.ruleSetId());
        body.put("calculation_formula", item.calculationFormula());
        body.put("calculation_base", item.calculationBase());
        body.put("rate_applied", item.rateApplied());
        body.put("currency_code", item.currencyCode());
        return body;
    }

    private PayrollRunRow mapRunRow(ResultSet rs) throws SQLException {
        return new PayrollRunRow(
            rs.getLong("id"),
            rs.getLong("company_id"),
            safe(rs.getString("grouping_mode")),
            safe(rs.getString("grouping_key")),
            safe(rs.getString("grouping_label")),
            safe(rs.getString("pay_period")),
            rs.getObject("period_start_date", LocalDate.class),
            rs.getObject("period_end_date", LocalDate.class),
            safe(rs.getString("status")),
            rs.getInt("users_count"),
            scaled(rs.getBigDecimal("gross_amount")),
            scaled(rs.getBigDecimal("deductions_amount")),
            scaled(rs.getBigDecimal("employer_contributions_amount")),
            scaled(rs.getBigDecimal("net_amount")),
            toLocalDateTime(rs.getTimestamp("created_at"))
        );
    }

    private PayrollRunLineRow mapRunLineRow(ResultSet rs) throws SQLException {
        return new PayrollRunLineRow(
            rs.getLong("id"),
            rs.getLong("run_id"),
            rs.getLong("company_id"),
            rs.getLong("user_company_id"),
            rs.getLong("user_id"),
            safe(rs.getString("user_code_snapshot")),
            safe(rs.getString("user_name_snapshot")),
            safe(rs.getString("position_title_snapshot")),
            safe(rs.getString("department_snapshot")),
            getNullableLong(rs, "unit_id_snapshot"),
            safe(rs.getString("unit_name_snapshot")),
            getNullableLong(rs, "business_id_snapshot"),
            safe(rs.getString("business_name_snapshot")),
            safe(rs.getString("country_code_snapshot")),
            safe(rs.getString("jurisdiction_code_snapshot")),
            safe(rs.getString("currency_code_snapshot")),
            rateValue(rs.getBigDecimal("fx_rate")),
            safe(rs.getString("pay_period_snapshot")),
            safe(rs.getString("salary_type_snapshot")),
            scaled(rs.getBigDecimal("base_salary_amount")),
            nullableBigDecimal(rs.getBigDecimal("hourly_rate_amount")),
            scaled(rs.getBigDecimal("workday_hours_snapshot")),
            scaled(rs.getBigDecimal("workdays_per_week_snapshot")),
            scaled(rs.getBigDecimal("days_payable")),
            scaled(rs.getBigDecimal("leave_days")),
            scaled(rs.getBigDecimal("absence_days")),
            scaled(rs.getBigDecimal("rest_days")),
            scaled(rs.getBigDecimal("missing_attendance_days")),
            scaled(rs.getBigDecimal("paid_leave_days")),
            scaled(rs.getBigDecimal("unpaid_absence_days")),
            rs.getInt("late_count"),
            scaled(rs.getBigDecimal("regular_hours")),
            scaled(rs.getBigDecimal("overtime_hours")),
            rs.getBoolean("include_in_fiscal"),
            normalizePayrollTreatment(rs.getString("payroll_treatment_snapshot")),
            normalizePaymentRoute(rs.getString("payment_route")),
            getNullableLong(rs, "payable_expense_id"),
            toLocalDateTime(rs.getTimestamp("payable_created_at")),
            payrollSnapshotService.parseObject(rs.getString("payable_metadata_json")),
            scaled(rs.getBigDecimal("gross_amount")),
            scaled(rs.getBigDecimal("deductions_amount")),
            scaled(rs.getBigDecimal("employer_contributions_amount")),
            scaled(rs.getBigDecimal("net_amount")),
            safe(rs.getString("notes")),
            safe(rs.getString("calculation_source")),
            toLocalDateTime(rs.getTimestamp("calculation_timestamp")),
            payrollSnapshotService.parseObject(rs.getString("employee_salary_snapshot_json")),
            payrollSnapshotService.parseObject(rs.getString("attendance_snapshot_json")),
            payrollSnapshotService.parseList(rs.getString("manual_adjustments_snapshot_json")),
            payrollSnapshotService.parseObject(rs.getString("calculation_inputs_json")),
            payrollSnapshotService.parseObject(rs.getString("calculation_results_json")),
            payrollSnapshotService.parseObject(rs.getString("rule_snapshot_json")),
            payrollSnapshotService.parseList(rs.getString("attendance_warnings_json")).stream().map(String::valueOf).toList()
        );
    }

    private PayrollRunLineItemRow mapRunLineItemRow(ResultSet rs) throws SQLException {
        return new PayrollRunLineItemRow(
            rs.getLong("id"),
            rs.getLong("run_line_id"),
            safe(rs.getString("code")),
            safe(rs.getString("category")),
            safe(rs.getString("label")),
            scaled(rs.getBigDecimal("amount")),
            safe(rs.getString("source_type")),
            safe(rs.getString("country_code")),
            safe(rs.getString("jurisdiction_code")),
            safe(rs.getString("tax_treatment")),
            rs.getBoolean("taxable"),
            rs.getBoolean("exempt"),
            rs.getBoolean("affects_social_security"),
            rs.getBoolean("affects_employer_cost"),
            safe(rs.getString("legal_classification")),
            safe(rs.getString("rule_code")),
            getNullableLong(rs, "rule_set_id"),
            safe(rs.getString("calculation_formula")),
            rs.getBigDecimal("calculation_base"),
            rs.getBigDecimal("rate_applied"),
            safe(rs.getString("currency_code")),
            rs.getInt("display_order")
        );
    }

    private PayrollEmployeeCountryNoveltyRow mapColombiaNoveltyRow(ResultSet rs) throws SQLException {
        return new PayrollEmployeeCountryNoveltyRow(
            rs.getLong("id"),
            rs.getLong("company_id"),
            rs.getLong("user_company_id"),
            safe(rs.getString("country_code")),
            safe(rs.getString("user_code")),
            safe(rs.getString("user_name")),
            safe(rs.getString("novelty_code")),
            safe(rs.getString("novelty_label")),
            rs.getObject("start_date", LocalDate.class),
            rs.getObject("end_date", LocalDate.class),
            scaled(rs.getBigDecimal("days")),
            scaled(rs.getBigDecimal("hours")),
            rs.getBoolean("paid"),
            rs.getBoolean("affects_ibc"),
            scaled(rs.getBigDecimal("ibc_impact_amount")),
            safe(rs.getString("source")),
            safe(rs.getString("status")),
            payrollSnapshotService.parseObject(rs.getString("metadata_json")),
            toLocalDateTime(rs.getTimestamp("created_at")),
            toLocalDateTime(rs.getTimestamp("updated_at"))
        );
    }

    private boolean lineStatutoryCompliance(PayrollRunLineRow line) {
        var value = line.calculationResults().get("statutoryCompliance");
        if (value instanceof Boolean bool) {
            return bool;
        }
        return !"GENERIC_UNSUPPORTED_COUNTRY".equals(line.calculationSource());
    }

    private List<String> lineCalculationWarnings(PayrollRunLineRow line) {
        var value = line.calculationResults().get("warnings");
        if (value instanceof List<?> rawWarnings) {
            return rawWarnings.stream().map(String::valueOf).toList();
        }
        if ("GENERIC_UNSUPPORTED_COUNTRY".equals(line.calculationSource())) {
            return List.of("País no soportado por proveedor fiscal. El cálculo es una estimación operativa.");
        }
        return List.of();
    }

    private BigDecimal scaled(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal scaledNullable(BigDecimal value) {
        return value == null ? null : value.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal nullableBigDecimal(BigDecimal value) {
        return value == null ? null : value.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal rateValue(BigDecimal value) {
        return value == null ? BigDecimal.ONE.setScale(8, RoundingMode.HALF_UP) : value.setScale(8, RoundingMode.HALF_UP);
    }

    private BigDecimal percentageValue(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(5, RoundingMode.HALF_UP);
    }

    private BigDecimal firstPositive(BigDecimal primary, BigDecimal fallback) {
        if (primary != null && primary.compareTo(BigDecimal.ZERO) > 0) {
            return primary;
        }
        if (fallback != null && fallback.compareTo(BigDecimal.ZERO) > 0) {
            return fallback;
        }
        return BigDecimal.ZERO;
    }

    private String firstText(String primary, String fallback) {
        var resolvedPrimary = safe(primary);
        return resolvedPrimary.isBlank() ? safe(fallback) : resolvedPrimary;
    }

    private Boolean firstBoolean(Boolean primary, Boolean fallback) {
        return primary == null ? fallback : primary;
    }

    private LocalDate normalizeRunPeriodEndDate(
        String payPeriod,
        LocalDate periodStartDate,
        PayrollPreferencesRow preferences
    ) {
        return resolveNextPeriodStartDate(payPeriod, periodStartDate, preferences).minusDays(1);
    }

    private LocalDate resolveNextPeriodStartDate(String payPeriod, LocalDate periodStartDate, PayrollPreferencesRow preferences) {
        return switch (payPeriod) {
            case "weekly" -> periodStartDate.plusDays(7);
            case "biweekly", "semimonthly" -> resolveNextBiweeklyStartDate(periodStartDate, preferences);
            case "monthly" -> dateWithClampedDay(YearMonth.from(periodStartDate).plusMonths(1), preferences.monthlyStartDay());
            default -> dateWithClampedDay(YearMonth.from(periodStartDate).plusMonths(1), preferences.monthlyStartDay());
        };
    }

    private LocalDate resolveNextBiweeklyStartDate(LocalDate periodStartDate, PayrollPreferencesRow preferences) {
        var currentMonth = YearMonth.from(periodStartDate);
        var candidates = List.of(
            dateWithClampedDay(currentMonth, preferences.biweeklyFirstDay()),
            dateWithClampedDay(currentMonth, preferences.biweeklySecondDay()),
            dateWithClampedDay(currentMonth.plusMonths(1), preferences.biweeklyFirstDay()),
            dateWithClampedDay(currentMonth.plusMonths(1), preferences.biweeklySecondDay())
        );

        return candidates.stream()
            .filter((candidate) -> candidate.isAfter(periodStartDate))
            .min(LocalDate::compareTo)
            .orElse(dateWithClampedDay(currentMonth.plusMonths(1), preferences.biweeklyFirstDay()));
    }

    private LocalDate dateWithClampedDay(YearMonth yearMonth, int dayOfMonth) {
        return yearMonth.atDay(Math.min(Math.max(dayOfMonth, 1), yearMonth.lengthOfMonth()));
    }

    private BigDecimal normalizePositiveDecimal(BigDecimal value, BigDecimal fallback, String key) {
        var resolved = value == null ? fallback : value;
        if (resolved == null || resolved.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(key + " must be greater than zero.");
        }
        return scaled(resolved);
    }

    private int normalizeIntegerInRange(Object value, int fallback, int min, int max, String key) {
        int resolved;
        if (value == null) {
            resolved = fallback;
        } else if (value instanceof Number number) {
            resolved = number.intValue();
        } else {
            try {
                resolved = Integer.parseInt(String.valueOf(value).trim());
            } catch (NumberFormatException exception) {
                throw new IllegalArgumentException(key + " must be a valid number.");
            }
        }

        if (resolved < min || resolved > max) {
            throw new IllegalArgumentException(key + " must be between " + min + " and " + max + ".");
        }
        return resolved;
    }

    private BigDecimal normalizeRate(BigDecimal value, BigDecimal fallback, String key) {
        var resolved = value == null ? fallback : value;
        if (resolved == null || resolved.compareTo(BigDecimal.ZERO) < 0 || resolved.compareTo(BigDecimal.ONE) > 0) {
            throw new IllegalArgumentException(key + " must be between 0 and 1.");
        }
        return resolved.setScale(5, RoundingMode.HALF_UP);
    }

    private BigDecimal normalizeNullableRate(BigDecimal value, BigDecimal fallback, String key) {
        var resolved = value == null ? fallback : value;
        if (resolved == null) {
            resolved = BigDecimal.ZERO;
        }
        if (resolved.compareTo(BigDecimal.ZERO) < 0 || resolved.compareTo(BigDecimal.ONE) > 0) {
            throw new IllegalArgumentException(key + " must be between 0 and 1.");
        }
        return resolved.setScale(8, RoundingMode.HALF_UP);
    }

    private BigDecimal normalizeArlClass(BigDecimal value, BigDecimal fallback, String key) {
        var resolved = value == null ? fallback : value;
        if (resolved == null) {
            return null;
        }
        if (resolved.compareTo(BigDecimal.ONE) < 0 || resolved.compareTo(new BigDecimal("5")) > 0) {
            throw new IllegalArgumentException(key + " must be between 1 and 5.");
        }
        return resolved.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal normalizeNonNegativeMoney(BigDecimal value, BigDecimal fallback, String key) {
        var resolved = value == null ? fallback : value;
        if (resolved == null) {
            resolved = BigDecimal.ZERO;
        }
        if (resolved.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException(key + " must be zero or greater.");
        }
        return scaled(resolved);
    }

    private BigDecimal normalizeSignedMoney(BigDecimal value, BigDecimal fallback, String key) {
        var resolved = value == null ? fallback : value;
        if (resolved == null) {
            resolved = BigDecimal.ZERO;
        }
        return scaled(resolved);
    }

    private BigDecimal normalizeNonNegativeQuantity(BigDecimal value, BigDecimal fallback, String key) {
        var resolved = value == null ? fallback : value;
        if (resolved == null) {
            resolved = BigDecimal.ZERO;
        }
        if (resolved.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException(key + " must be zero or greater.");
        }
        return resolved.setScale(2, RoundingMode.HALF_UP);
    }

    private String payloadText(Map<String, Object> payload, String fallback, String... keys) {
        if (payloadHasAny(payload, keys)) {
            return stringValue(payload, keys);
        }
        return safe(fallback).trim();
    }

    private boolean payloadBoolean(Map<String, Object> payload, boolean fallback, String... keys) {
        if (!payloadHasAny(payload, keys)) {
            return fallback;
        }
        for (var key : keys) {
            if (payload.containsKey(key)) {
                return parseBoolean(payload.get(key));
            }
        }
        return fallback;
    }

    private Boolean payloadNullableBoolean(Map<String, Object> payload, Boolean fallback, String... keys) {
        if (!payloadHasAny(payload, keys)) {
            return fallback;
        }
        for (var key : keys) {
            if (!payload.containsKey(key)) {
                continue;
            }
            var value = payload.get(key);
            if (value == null || (value instanceof String string && string.isBlank())) {
                return null;
            }
            return parseBoolean(value);
        }
        return fallback;
    }

    private Map<String, Object> payloadObject(Map<String, Object> payload, Map<String, Object> fallback, String... keys) {
        if (payload == null) {
            return fallback == null ? Map.of() : new LinkedHashMap<>(fallback);
        }
        for (var key : keys) {
            if (!payload.containsKey(key)) {
                continue;
            }
            var value = payload.get(key);
            if (value == null) {
                return Map.of();
            }
            if (!(value instanceof Map<?, ?> rawMap)) {
                throw new IllegalArgumentException(key + " must be an object.");
            }
            var result = new LinkedHashMap<String, Object>();
            rawMap.forEach((rawKey, rawValue) -> result.put(String.valueOf(rawKey), rawValue));
            return result;
        }
        return fallback == null ? Map.of() : new LinkedHashMap<>(fallback);
    }

    private boolean payloadHasAny(Map<String, Object> payload, String... keys) {
        if (payload == null) {
            return false;
        }
        for (var key : keys) {
            if (payload.containsKey(key)) {
                return true;
            }
        }
        return false;
    }

    private String normalizeColombiaWithholdingProcedure(String value) {
        var normalized = safe(value).trim().toLowerCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        return switch (normalized) {
            case "", "procedure_1", "procedimiento_1", "procedimiento1", "1" -> "procedure_1";
            case "procedure_2", "procedimiento_2", "procedimiento2", "2" -> "procedure_2";
            default -> throw new IllegalArgumentException("withholding_procedure must be procedure_1 or procedure_2.");
        };
    }

    private String normalizeColombiaNoveltyCode(String value) {
        var normalized = safe(value)
            .trim()
            .toUpperCase(Locale.ROOT)
            .replace("-", "_")
            .replace(" ", "_");
        return switch (normalized) {
            case "ING", "RET", "VSP", "VST", "SLN", "IGE", "LMA", "LPA", "VAC", "SUS", "AUS",
                "TER", "TERMINATION", "LIQ", "LIQUIDACION", "LIQUIDACIÓN",
                "RETRO", "RETROACTIVO", "AJR",
                "CORR", "CORRECCION", "CORRECCIÓN", "AJUSTE", "ADJ" -> normalized;
            default -> throw new IllegalArgumentException("novelty_code is not supported for Colombia payroll.");
        };
    }

    private String defaultColombiaNoveltyLabel(String code) {
        return switch (normalizeColombiaNoveltyCode(code)) {
            case "ING" -> "Ingreso";
            case "RET" -> "Retiro";
            case "VSP" -> "Variacion permanente de salario";
            case "VST" -> "Variacion transitoria de salario";
            case "SLN" -> "Suspension temporal";
            case "IGE" -> "Incapacidad general";
            case "LMA" -> "Licencia de maternidad o paternidad";
            case "LPA" -> "Licencia remunerada";
            case "VAC" -> "Vacaciones";
            case "SUS" -> "Suspension";
            case "AUS" -> "Ausencia";
            case "TER", "TERMINATION" -> "Terminacion";
            case "LIQ", "LIQUIDACION", "LIQUIDACIÓN" -> "Liquidacion";
            case "RETRO", "RETROACTIVO", "AJR" -> "Retroactivo";
            case "CORR", "CORRECCION", "CORRECCIÓN", "AJUSTE", "ADJ" -> "Correccion";
            default -> code;
        };
    }

    private String normalizeColombiaNoveltySource(String value) {
        var normalized = safe(value).trim().toLowerCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        if (normalized.isBlank()) {
            return "manual";
        }
        return switch (normalized) {
            case "manual", "attendance", "control", "payroll", "termination", "import", "api" -> normalized;
            default -> throw new IllegalArgumentException("source is not supported for Colombia payroll novelty.");
        };
    }

    private String normalizeColombiaNoveltyStatus(String value) {
        var normalized = safe(value).trim().toLowerCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        return switch (normalized) {
            case "", "active", "activa", "activo" -> "active";
            case "inactive", "inactiva", "inactivo", "closed", "cerrada", "cerrado" -> "inactive";
            case "cancelled", "canceled", "cancelada", "cancelado" -> "cancelled";
            case "applied", "aplicada", "aplicado", "processed", "procesada", "procesado" -> "applied";
            default -> throw new IllegalArgumentException("status is not supported for Colombia payroll novelty.");
        };
    }

    private void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("end_date must be on or after start_date.");
        }
    }

    private String normalizeGovernmentReportType(String reportType) {
        var normalized = safe(reportType).trim().toUpperCase(Locale.ROOT).replace("-", "_").replace(" ", "_");
        return switch (normalized) {
            case "" -> "";
            case "PILA" -> "PILA";
            case "DIAN", "DIAN_PAYROLL", "NOMINA_ELECTRONICA", "NÓMINA_ELECTRÓNICA" -> "DIAN_PAYROLL";
            default -> throw new IllegalArgumentException("report_type must be PILA or DIAN_PAYROLL.");
        };
    }

    private String normalizeGovernmentResponseStatus(String value) {
        var normalized = safe(value).trim().toLowerCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        return switch (normalized) {
            case "", "not_transmitted", "draft", "draft_ready" -> "draft_ready";
            case "draft_blocked", "blocked", "bloqueada", "bloqueado" -> "draft_blocked";
            case "transmitted", "sent", "enviada", "enviado" -> "transmitted";
            case "accepted", "accepted_by_government", "aceptada", "aceptado" -> "accepted";
            case "rejected", "rechazada", "rechazado" -> "rejected";
            case "correction_required", "requires_correction", "correccion_requerida", "corrección_requerida" -> "correction_required";
            default -> throw new IllegalArgumentException("government reporting response status is not supported.");
        };
    }

    private boolean governmentResponseBlocksApproval(String status) {
        var normalized = safe(status).trim().toLowerCase(Locale.ROOT);
        return "draft_blocked".equals(normalized)
            || "rejected".equals(normalized)
            || "correction_required".equals(normalized);
    }

    private List<Map<String, Object>> normalizeGovernmentResponseIssues(Object rawIssues) {
        if (!(rawIssues instanceof List<?> issues)) {
            return List.of();
        }
        var result = new ArrayList<Map<String, Object>>();
        for (var rawIssue : issues) {
            if (!(rawIssue instanceof Map<?, ?> rawMap)) {
                continue;
            }
            var issue = new LinkedHashMap<String, Object>();
            rawMap.forEach((key, value) -> {
                if (key != null && value != null) {
                    issue.put(String.valueOf(key), value);
                }
            });
            if (!issue.isEmpty()) {
                result.add(issue);
            }
        }
        return result;
    }

    private String normalizeGroupingMode(String value, String fallback) {
        var normalized = value == null || value.isBlank() ? fallback : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "", "single", "nomina-unica" -> "single";
            case "unit", "unidad-negocio" -> "unit";
            case "business", "negocio" -> "business";
            default -> throw new IllegalArgumentException("grouping_mode must be single, unit, or business.");
        };
    }

    private String normalizePayPeriod(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "weekly", "semanal" -> "weekly";
            case "biweekly" -> "biweekly";
            case "semimonthly", "semi-monthly", "quincenal" -> "semimonthly";
            case "monthly", "mensual" -> "monthly";
            default -> throw new IllegalArgumentException("pay_period must be weekly, biweekly, semimonthly, or monthly.");
        };
    }

    private String normalizePayPeriodSafe(String value) {
        try {
            return normalizePayPeriod(value);
        } catch (IllegalArgumentException exception) {
            return "weekly";
        }
    }

    private String normalizeNullableAttendanceStatus(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        var normalized = value.trim().toLowerCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        return switch (normalized) {
            case "a_tiempo", "presente", "asistencia", "on_time" -> "on_time";
            case "retardo", "late" -> "late";
            case "permiso", "leave" -> "leave";
            case "descanso", "rest" -> "rest";
            case "falta", "absence" -> "absence";
            default -> normalized;
        };
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    static BigDecimal computeFixedSalaryDeduction(BigDecimal periodSalary, BigDecimal unpaidDays, BigDecimal prorationDays) {
        if (periodSalary == null
            || unpaidDays == null
            || prorationDays == null
            || periodSalary.compareTo(BigDecimal.ZERO) <= 0
            || unpaidDays.compareTo(BigDecimal.ZERO) <= 0
            || prorationDays.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return periodSalary
            .divide(prorationDays, 6, RoundingMode.HALF_UP)
            .multiply(unpaidDays)
            .min(periodSalary)
            .setScale(2, RoundingMode.HALF_UP);
    }

    static BigDecimal resolveStoredControlWorkDays(
        Map<String, Object> attendanceSnapshot,
        BigDecimal paidDays,
        BigDecimal paidLeaveDays,
        BigDecimal leaveDays,
        BigDecimal absenceDays,
        BigDecimal missingAttendanceDays
    ) {
        var snapshottedControlDays = parseBigDecimal(attendanceSnapshot, "controlWorkDays", "control_work_days");
        if (snapshottedControlDays != null && snapshottedControlDays.compareTo(BigDecimal.ZERO) > 0) {
            return snapshottedControlDays;
        }

        var normalizedPaidDays = nonNegative(paidDays);
        var normalizedPaidLeaveDays = nonNegative(paidLeaveDays);
        var normalizedLeaveDays = nonNegative(leaveDays);
        var unpaidLeaveDays = normalizedLeaveDays.subtract(normalizedPaidLeaveDays).max(BigDecimal.ZERO);
        return normalizedPaidDays
            .add(nonNegative(absenceDays))
            .add(unpaidLeaveDays)
            .add(nonNegative(missingAttendanceDays));
    }

    private static BigDecimal nonNegative(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value.max(BigDecimal.ZERO);
    }

    private LocalDate parseOptionalDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Date filters must use YYYY-MM-DD format.");
        }
    }

    private String csv(Object value) {
        var text = value == null ? "" : String.valueOf(value);
        return "\"" + text.replace("\"", "\"\"") + "\"";
    }

    private String truncatePdf(String value, int maxLength) {
        if (value == null) {
            return "";
        }
        if (value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, Math.max(0, maxLength - 1));
    }

    private LocalDateTime toLocalDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }

    private Long getNullableLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private Boolean getNullableBoolean(ResultSet rs, String column) throws SQLException {
        var value = rs.getBoolean(column);
        return rs.wasNull() ? null : value;
    }

    private boolean parseBoolean(Object value) {
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value instanceof Number number) {
            return number.intValue() != 0;
        }
        if (value instanceof String string) {
            var normalized = string.trim().toLowerCase(Locale.ROOT);
            return switch (normalized) {
                case "true", "1", "yes", "si", "sí" -> true;
                case "", "false", "0", "no" -> false;
                default -> throw new IllegalArgumentException("Boolean payload is invalid.");
            };
        }
        return false;
    }

    private record PayrollPreferencesRow(
        long companyId,
        String groupingMode,
        BigDecimal defaultDailyHours,
        boolean payLeaveDays,
        int weeklyStartDay,
        int biweeklyFirstDay,
        int biweeklySecondDay,
        int monthlyStartDay,
        BigDecimal isrRate,
        BigDecimal imssUserRate,
        BigDecimal infonavitUserRate,
        BigDecimal imssEmployerRate,
        BigDecimal infonavitEmployerRate,
        BigDecimal sarEmployerRate
    ) {
    }

    private record PayrollJurisdictionRow(
        String country,
        String province
    ) {
    }

    private record PayrollCompanyCountryConfigRow(
        BigDecimal defaultArlClass,
        String compensationFundCode,
        String compensationFundName,
        Boolean employerHealthExemptionApplies,
        Boolean senaApplies,
        Boolean icbfApplies,
        Boolean ccfApplies,
        Map<String, Object> metadata
    ) {
    }

    private record PayrollEmployeeCountryProfileRow(
        String contributorType,
        String contributorSubtype,
        boolean integralSalary,
        BigDecimal arlClass,
        String epsCode,
        String epsName,
        String afpCode,
        String afpName,
        String compensationFundCode,
        String compensationFundName,
        Boolean employerHealthExemptionApplies,
        Boolean senaApplies,
        Boolean icbfApplies,
        Boolean ccfApplies,
        String withholdingProcedure,
        BigDecimal dependentsMonthlyDeduction,
        BigDecimal prepaidMedicineMonthly,
        BigDecimal housingInterestMonthly,
        BigDecimal voluntaryPensionMonthly,
        BigDecimal afcMonthly,
        BigDecimal otherExemptIncomeMonthly,
        BigDecimal procedure2FixedRate,
        Map<String, Object> metadata
    ) {
    }

    private record PayrollEmployeeCountryNoveltyRow(
        long id,
        long companyId,
        long userCompanyId,
        String countryCode,
        String userCode,
        String userName,
        String noveltyCode,
        String noveltyLabel,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal days,
        BigDecimal hours,
        boolean paid,
        boolean affectsIbc,
        BigDecimal ibcImpactAmount,
        String source,
        String status,
        Map<String, Object> metadata,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {
    }

    private record PayrollGovernmentReportingValidationRow(
        long runLineId,
        String status,
        String reportType,
        Map<String, Object> validation
    ) {
    }

    private record PayrollGovernmentReportingSnapshotRow(
        long id,
        long runId,
        long runLineId,
        long companyId,
        long userCompanyId,
        String countryCode,
        String reportType,
        LocalDate reportPeriodStart,
        LocalDate reportPeriodEnd,
        String status,
        String payloadHash,
        Map<String, Object> payload,
        Map<String, Object> validation,
        Map<String, Object> response,
        String generatedBySource,
        LocalDateTime generatedAt,
        LocalDateTime updatedAt
    ) {
    }

    private record PayrollRunRow(
        long id,
        long companyId,
        String groupingMode,
        String groupingKey,
        String groupingLabel,
        String payPeriod,
        LocalDate periodStartDate,
        LocalDate periodEndDate,
        String status,
        int usersCount,
        BigDecimal grossAmount,
        BigDecimal deductionsAmount,
        BigDecimal employerContributionsAmount,
        BigDecimal netAmount,
        LocalDateTime createdAt
    ) {
    }

    private record PayrollRegenerationPeriod(
        String payPeriod,
        LocalDate periodStartDate
    ) {
    }

    private record PayrollRunActors(Long processedBy, Long approvedBy) {
    }

    private enum PayrollTransition {
        APPROVE,
        PAY
    }

    private record PayrollRunCurrencySignal(
        String country,
        String province,
        BigDecimal grossAmount,
        BigDecimal netAmount
    ) {
    }

    private record PayrollRunLineRow(
        long id,
        long runId,
        long companyId,
        long userCompanyId,
        long userIdSnapshot,
        String userCodeSnapshot,
        String userNameSnapshot,
        String positionTitleSnapshot,
        String departmentSnapshot,
        Long unitIdSnapshot,
        String unitNameSnapshot,
        Long businessIdSnapshot,
        String businessNameSnapshot,
        String countryCodeSnapshot,
        String jurisdictionCodeSnapshot,
        String currencyCodeSnapshot,
        BigDecimal fxRate,
        String payPeriodSnapshot,
        String salaryTypeSnapshot,
        BigDecimal baseSalaryAmount,
        BigDecimal hourlyRateAmount,
        BigDecimal workdayHoursSnapshot,
        BigDecimal workdaysPerWeekSnapshot,
        BigDecimal daysPayable,
        BigDecimal leaveDays,
        BigDecimal absenceDays,
        BigDecimal restDays,
        BigDecimal missingAttendanceDays,
        BigDecimal paidLeaveDays,
        BigDecimal unpaidAbsenceDays,
        int lateCount,
        BigDecimal regularHours,
        BigDecimal overtimeHours,
        boolean includeInFiscal,
        String payrollTreatmentSnapshot,
        String paymentRoute,
        Long payableExpenseId,
        LocalDateTime payableCreatedAt,
        Map<String, Object> payableMetadata,
        BigDecimal grossAmount,
        BigDecimal deductionsAmount,
        BigDecimal employerContributionsAmount,
        BigDecimal netAmount,
        String notes,
        String calculationSource,
        LocalDateTime calculationTimestamp,
        Map<String, Object> employeeSalarySnapshot,
        Map<String, Object> attendanceSnapshot,
        List<Object> manualAdjustmentsSnapshot,
        Map<String, Object> calculationInputs,
        Map<String, Object> calculationResults,
        Map<String, Object> ruleSnapshot,
        List<String> attendanceWarnings
    ) {
    }

    private record PayrollRunLineItemRow(
        long id,
        long runLineId,
        String code,
        String category,
        String label,
        BigDecimal amount,
        String sourceType,
        String countryCode,
        String jurisdictionCode,
        String taxTreatment,
        boolean taxable,
        boolean exempt,
        boolean affectsSocialSecurity,
        boolean affectsEmployerCost,
        String legalClassification,
        String ruleCode,
        Long ruleSetId,
        String calculationFormula,
        BigDecimal calculationBase,
        BigDecimal rateApplied,
        String currencyCode,
        int displayOrder
    ) {
    }

    private record EngineLineComputation(
        PayrollCalculationContext context,
        PayrollLineCalculationResult result
    ) {
    }

    private record PayrollHrUserRow(
        long id,
        long userId,
        String userCode,
        String fullName,
        String positionTitle,
        String department,
        String status,
        Long unitId,
        String unitName,
        Long businessId,
        String businessName,
        BigDecimal salary,
        BigDecimal hourlyRate,
        String salaryType,
        String payPeriod,
        BigDecimal workdayHours,
        BigDecimal workdaysPerWeek,
        String payrollTreatment,
        String registrationCountry,
        String stateProvince
    ) {
    }

    private record PayrollHrUserGroup(
        String groupingKey,
        String groupingLabel,
        List<PayrollHrUserRow> users
    ) {
    }

    private record PayrollDailyRecordRow(
        LocalDate attendanceDate,
        String systemStatus,
        String correctedStatus,
        LocalDateTime firstCheckInAt,
        LocalDateTime lastCheckOutAt,
        String leavePayrollTreatment
    ) {
    }

    private record PayrollScheduleWindow(
        long templateId,
        LocalDate effectiveStartDate,
        LocalDate effectiveEndDate,
        int dayOfWeek,
        LocalTime startTime,
        LocalTime endTime,
        int lateAfterMinutes,
        boolean isRestDay
    ) {
    }

    private record ManualPayrollItemInput(
        String code,
        String category,
        String label,
        BigDecimal amount
    ) {
    }

}
