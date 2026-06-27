package com.indice.erp.hr.payroll.engine;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public record PayrollCalculationContext(
    long companyId,
    long employeeId,
    long userCompanyId,
    Long runId,
    String country,
    String jurisdiction,
    String currency,
    BigDecimal fxRate,
    String payrollFrequency,
    LocalDate periodStartDate,
    LocalDate periodEndDate,
    boolean includeInFiscal,
    EmployeeSalarySnapshot salary,
    PayrollAttendanceInput attendance,
    Preferences preferences,
    List<ManualAdjustment> manualAdjustments,
    CurrencySnapshot currencySnapshot,
    CountryPayrollProfile countryProfile,
    FiscalAccumulatorSnapshot fiscalAccumulator
) {
    public PayrollCalculationContext(
        long companyId,
        long employeeId,
        long userCompanyId,
        Long runId,
        String country,
        String jurisdiction,
        String currency,
        BigDecimal fxRate,
        String payrollFrequency,
        LocalDate periodStartDate,
        LocalDate periodEndDate,
        boolean includeInFiscal,
        EmployeeSalarySnapshot salary,
        PayrollAttendanceInput attendance,
        Preferences preferences,
        List<ManualAdjustment> manualAdjustments,
        CurrencySnapshot currencySnapshot,
        CountryPayrollProfile countryProfile
    ) {
        this(
            companyId,
            employeeId,
            userCompanyId,
            runId,
            country,
            jurisdiction,
            currency,
            fxRate,
            payrollFrequency,
            periodStartDate,
            periodEndDate,
            includeInFiscal,
            salary,
            attendance,
            preferences,
            manualAdjustments,
            currencySnapshot,
            countryProfile,
            FiscalAccumulatorSnapshot.empty(country, periodEndDate)
        );
    }

    public PayrollCalculationContext(
        long companyId,
        long employeeId,
        long userCompanyId,
        Long runId,
        String country,
        String jurisdiction,
        String currency,
        BigDecimal fxRate,
        String payrollFrequency,
        LocalDate periodStartDate,
        LocalDate periodEndDate,
        boolean includeInFiscal,
        EmployeeSalarySnapshot salary,
        PayrollAttendanceInput attendance,
        Preferences preferences,
        List<ManualAdjustment> manualAdjustments,
        CurrencySnapshot currencySnapshot
    ) {
        this(
            companyId,
            employeeId,
            userCompanyId,
            runId,
            country,
            jurisdiction,
            currency,
            fxRate,
            payrollFrequency,
            periodStartDate,
            periodEndDate,
            includeInFiscal,
            salary,
            attendance,
            preferences,
            manualAdjustments,
            currencySnapshot,
            CountryPayrollProfile.empty(country),
            FiscalAccumulatorSnapshot.empty(country, periodEndDate)
        );
    }

    public PayrollCalculationContext {
        country = text(country);
        jurisdiction = text(jurisdiction);
        currency = normalizeCurrency(currency);
        fxRate = fxRate == null || fxRate.compareTo(BigDecimal.ZERO) <= 0
            ? BigDecimal.ONE.setScale(8, RoundingMode.HALF_UP)
            : fxRate.setScale(8, RoundingMode.HALF_UP);
        payrollFrequency = text(payrollFrequency);
        manualAdjustments = manualAdjustments == null ? List.of() : List.copyOf(manualAdjustments);
        currencySnapshot = currencySnapshot == null
            ? CurrencySnapshot.defaultSameCurrency(currency, fxRate, periodEndDate)
            : currencySnapshot.normalized(currency, fxRate, periodEndDate);
        countryProfile = countryProfile == null
            ? CountryPayrollProfile.empty(country)
            : countryProfile.normalized(country);
        fiscalAccumulator = fiscalAccumulator == null
            ? FiscalAccumulatorSnapshot.empty(country, periodEndDate)
            : fiscalAccumulator.normalized(country, periodEndDate);
    }

    public record EmployeeSalarySnapshot(
        String employeeCode,
        String employeeName,
        String positionTitle,
        String department,
        String unitName,
        String businessName,
        String salaryType,
        BigDecimal baseSalary,
        BigDecimal hourlyRate,
        BigDecimal workdayHours,
        BigDecimal workdaysPerWeek
    ) {
        public EmployeeSalarySnapshot {
            employeeCode = text(employeeCode);
            employeeName = text(employeeName);
            positionTitle = text(positionTitle);
            department = text(department);
            unitName = text(unitName);
            businessName = text(businessName);
            salaryType = text(salaryType).isBlank() ? "daily" : text(salaryType).toLowerCase();
            baseSalary = money(baseSalary);
            hourlyRate = money(hourlyRate);
            workdayHours = decimal(workdayHours);
            workdaysPerWeek = decimal(workdaysPerWeek);
        }
    }

    public record PayrollAttendanceInput(
        BigDecimal paidDays,
        BigDecimal paidLeaveDays,
        BigDecimal leaveDays,
        BigDecimal unpaidAbsenceDays,
        BigDecimal absenceDays,
        BigDecimal restDays,
        BigDecimal missingAttendanceDays,
        BigDecimal controlWorkDays,
        int lateCount,
        BigDecimal regularHours,
        BigDecimal overtimeHours,
        List<String> warnings,
        List<Map<String, Object>> records
    ) {
        public PayrollAttendanceInput {
            paidDays = decimal(paidDays);
            paidLeaveDays = decimal(paidLeaveDays);
            leaveDays = decimal(leaveDays);
            unpaidAbsenceDays = decimal(unpaidAbsenceDays);
            absenceDays = decimal(absenceDays);
            restDays = decimal(restDays);
            missingAttendanceDays = decimal(missingAttendanceDays);
            controlWorkDays = decimal(controlWorkDays);
            regularHours = decimal(regularHours);
            overtimeHours = decimal(overtimeHours);
            warnings = warnings == null ? List.of() : List.copyOf(warnings);
            records = records == null ? List.of() : List.copyOf(records);
        }
    }

    public record Preferences(
        BigDecimal defaultDailyHours,
        boolean payLeaveDays,
        BigDecimal isrRate,
        BigDecimal imssUserRate,
        BigDecimal infonavitUserRate,
        BigDecimal imssEmployerRate,
        BigDecimal infonavitEmployerRate,
        BigDecimal sarEmployerRate
    ) {
        public Preferences {
            defaultDailyHours = decimal(defaultDailyHours);
            isrRate = rate(isrRate);
            imssUserRate = rate(imssUserRate);
            infonavitUserRate = rate(infonavitUserRate);
            imssEmployerRate = rate(imssEmployerRate);
            infonavitEmployerRate = rate(infonavitEmployerRate);
            sarEmployerRate = rate(sarEmployerRate);
        }
    }

    public record ManualAdjustment(
        String code,
        String category,
        String label,
        BigDecimal amount,
        String taxTreatment,
        boolean taxable,
        boolean affectsSocialSecurity,
        boolean affectsEmployerCost,
        String legalClassification,
        String currency
    ) {
        public ManualAdjustment {
            code = text(code);
            category = text(category);
            label = text(label);
            amount = money(amount);
            taxTreatment = text(taxTreatment);
            legalClassification = text(legalClassification);
            currency = text(currency);
        }
    }

    public record CurrencySnapshot(
        String nativeCurrency,
        String displayCurrency,
        BigDecimal fxRate,
        String fxSource,
        LocalDate fxDate,
        boolean fxLocked,
        boolean fxManualOverride,
        List<String> warnings
    ) {
        public CurrencySnapshot {
            nativeCurrency = normalizeCurrency(nativeCurrency);
            displayCurrency = normalizeCurrency(displayCurrency);
            fxRate = fxRate == null || fxRate.compareTo(BigDecimal.ZERO) <= 0
                ? BigDecimal.ONE.setScale(8, RoundingMode.HALF_UP)
                : fxRate.setScale(8, RoundingMode.HALF_UP);
            fxSource = text(fxSource).isBlank() ? "DEFAULT_SAME_CURRENCY" : text(fxSource);
            warnings = warnings == null ? List.of() : List.copyOf(warnings);
        }

        private CurrencySnapshot normalized(String fallbackCurrency, BigDecimal fallbackFxRate, LocalDate fallbackDate) {
            var resolvedNative = nativeCurrency.isBlank() ? normalizeCurrency(fallbackCurrency) : nativeCurrency;
            var resolvedDisplay = displayCurrency.isBlank() ? resolvedNative : displayCurrency;
            var resolvedRate = fxRate == null || fxRate.compareTo(BigDecimal.ZERO) <= 0 ? fallbackFxRate : fxRate;
            var resolvedDate = fxDate == null ? fallbackDate : fxDate;
            var resolvedSource = fxSource.isBlank() ? "DEFAULT_SAME_CURRENCY" : fxSource;
            var resolvedWarnings = new java.util.ArrayList<>(warnings);
            if (!resolvedNative.equals(resolvedDisplay) && "DEFAULT_SAME_CURRENCY".equals(resolvedSource)) {
                resolvedSource = "DEFAULT_NO_FX_PROVIDER";
                resolvedWarnings.add("No hay tipo de cambio real para convertir "
                    + resolvedNative + " a " + resolvedDisplay + "; el snapshot conserva tasa 1 como estimación.");
            }
            return new CurrencySnapshot(
                resolvedNative,
                resolvedDisplay,
                resolvedRate,
                resolvedSource,
                resolvedDate,
                fxLocked,
                fxManualOverride,
                resolvedWarnings
            );
        }

        public static CurrencySnapshot defaultSameCurrency(String currency, BigDecimal fxRate, LocalDate fxDate) {
            var resolvedCurrency = normalizeCurrency(currency);
            return new CurrencySnapshot(
                resolvedCurrency,
                resolvedCurrency,
                fxRate,
                "DEFAULT_SAME_CURRENCY",
                fxDate,
                true,
                false,
                List.of()
            );
        }
    }

    public record CountryPayrollProfile(
        String countryCode,
        String contributorType,
        String contributorSubtype,
        Boolean integralSalary,
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
        List<PayrollNovelty> novelties,
        Map<String, Object> metadata
    ) {
        public CountryPayrollProfile {
            countryCode = text(countryCode).toUpperCase();
            contributorType = text(contributorType);
            contributorSubtype = text(contributorSubtype);
            integralSalary = integralSalary == null ? Boolean.FALSE : integralSalary;
            arlClass = decimal(arlClass);
            epsCode = text(epsCode);
            epsName = text(epsName);
            afpCode = text(afpCode);
            afpName = text(afpName);
            compensationFundCode = text(compensationFundCode);
            compensationFundName = text(compensationFundName);
            withholdingProcedure = text(withholdingProcedure).isBlank() ? "procedure_1" : text(withholdingProcedure).toLowerCase();
            dependentsMonthlyDeduction = money(dependentsMonthlyDeduction);
            prepaidMedicineMonthly = money(prepaidMedicineMonthly);
            housingInterestMonthly = money(housingInterestMonthly);
            voluntaryPensionMonthly = money(voluntaryPensionMonthly);
            afcMonthly = money(afcMonthly);
            otherExemptIncomeMonthly = money(otherExemptIncomeMonthly);
            procedure2FixedRate = rate(procedure2FixedRate);
            novelties = novelties == null ? List.of() : List.copyOf(novelties);
            metadata = metadata == null ? Map.of() : Map.copyOf(cleanMetadata(metadata));
        }

        private CountryPayrollProfile normalized(String fallbackCountry) {
            if (!countryCode.isBlank()) {
                return this;
            }
            return new CountryPayrollProfile(
                fallbackCountry,
                contributorType,
                contributorSubtype,
                integralSalary,
                arlClass,
                epsCode,
                epsName,
                afpCode,
                afpName,
                compensationFundCode,
                compensationFundName,
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
                novelties,
                metadata
            );
        }

        public static CountryPayrollProfile empty(String countryCode) {
            return new CountryPayrollProfile(
                countryCode,
                "",
                "",
                false,
                BigDecimal.ZERO,
                "",
                "",
                "",
                "",
                "",
                "",
                null,
                null,
                null,
                null,
                "procedure_1",
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                List.of(),
                Map.of()
            );
        }
    }

    public record PayrollNovelty(
        String code,
        String label,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal days,
        BigDecimal hours,
        BigDecimal ibcImpactAmount,
        boolean paid,
        boolean affectsIbc,
        String source,
        Map<String, Object> metadata
    ) {
        public PayrollNovelty {
            code = text(code).toUpperCase();
            label = text(label);
            days = decimal(days);
            hours = decimal(hours);
            ibcImpactAmount = money(ibcImpactAmount);
            source = text(source);
            metadata = metadata == null ? Map.of() : Map.copyOf(cleanMetadata(metadata));
        }
    }

    public record FiscalAccumulatorSnapshot(
        String countryCode,
        int fiscalYear,
        LocalDate yearStartDate,
        LocalDate periodStartDate,
        LocalDate periodEndDate,
        BigDecimal grossAmountYearToDate,
        BigDecimal taxableBaseYearToDate,
        BigDecimal employeeDeductionsYearToDate,
        BigDecimal employerContributionsYearToDate,
        BigDecimal netAmountYearToDate,
        Map<String, BigDecimal> lineItemAmountsByCode,
        Map<String, BigDecimal> employeeDeductionsByCode,
        Map<String, BigDecimal> employerContributionsByCode,
        Map<String, Object> metadata
    ) {
        public FiscalAccumulatorSnapshot {
            countryCode = text(countryCode).toUpperCase();
            if (fiscalYear <= 0) {
                fiscalYear = periodEndDate == null ? LocalDate.now().getYear() : periodEndDate.getYear();
            }
            yearStartDate = yearStartDate == null ? LocalDate.of(fiscalYear, 1, 1) : yearStartDate;
            periodEndDate = periodEndDate == null ? LocalDate.now() : periodEndDate;
            periodStartDate = periodStartDate == null ? periodEndDate : periodStartDate;
            grossAmountYearToDate = money(grossAmountYearToDate);
            taxableBaseYearToDate = money(taxableBaseYearToDate);
            employeeDeductionsYearToDate = money(employeeDeductionsYearToDate);
            employerContributionsYearToDate = money(employerContributionsYearToDate);
            netAmountYearToDate = money(netAmountYearToDate);
            lineItemAmountsByCode = Map.copyOf(normalizeAmountMap(lineItemAmountsByCode));
            employeeDeductionsByCode = Map.copyOf(normalizeAmountMap(employeeDeductionsByCode));
            employerContributionsByCode = Map.copyOf(normalizeAmountMap(employerContributionsByCode));
            metadata = metadata == null ? Map.of() : Map.copyOf(cleanMetadata(metadata));
        }

        private FiscalAccumulatorSnapshot normalized(String fallbackCountry, LocalDate fallbackPeriodEndDate) {
            if (!countryCode.isBlank()) {
                return this;
            }
            return new FiscalAccumulatorSnapshot(
                fallbackCountry,
                fiscalYear,
                yearStartDate,
                periodStartDate,
                periodEndDate == null ? fallbackPeriodEndDate : periodEndDate,
                grossAmountYearToDate,
                taxableBaseYearToDate,
                employeeDeductionsYearToDate,
                employerContributionsYearToDate,
                netAmountYearToDate,
                lineItemAmountsByCode,
                employeeDeductionsByCode,
                employerContributionsByCode,
                metadata
            );
        }

        public BigDecimal lineItemAmount(String code) {
            return amountFrom(lineItemAmountsByCode, code);
        }

        public BigDecimal employeeDeductionAmount(String code) {
            return amountFrom(employeeDeductionsByCode, code);
        }

        public BigDecimal employerContributionAmount(String code) {
            return amountFrom(employerContributionsByCode, code);
        }

        public static FiscalAccumulatorSnapshot empty(String countryCode, LocalDate periodEndDate) {
            var resolvedEndDate = periodEndDate == null ? LocalDate.now() : periodEndDate;
            return new FiscalAccumulatorSnapshot(
                countryCode,
                resolvedEndDate.getYear(),
                LocalDate.of(resolvedEndDate.getYear(), 1, 1),
                resolvedEndDate,
                resolvedEndDate,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                Map.of(),
                Map.of(),
                Map.of(),
                Map.of("source", "empty")
            );
        }
    }

    private static String text(String value) {
        return value == null ? "" : value.trim();
    }

    private static String normalizeCurrency(String value) {
        var normalized = text(value).toUpperCase();
        return normalized.isBlank() ? "USD" : normalized;
    }

    private static BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal decimal(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal rate(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(8, RoundingMode.HALF_UP);
    }

    private static Map<String, Object> cleanMetadata(Map<String, Object> metadata) {
        var sanitized = new LinkedHashMap<String, Object>();
        metadata.forEach((key, value) -> {
            if (key != null && value != null) {
                sanitized.put(key, value);
            }
        });
        return sanitized;
    }

    private static Map<String, BigDecimal> normalizeAmountMap(Map<String, BigDecimal> amounts) {
        var sanitized = new LinkedHashMap<String, BigDecimal>();
        if (amounts == null) {
            return sanitized;
        }
        amounts.forEach((key, value) -> {
            var normalizedKey = text(key).toUpperCase();
            if (!normalizedKey.isBlank()) {
                sanitized.put(normalizedKey, money(value));
            }
        });
        return sanitized;
    }

    private static BigDecimal amountFrom(Map<String, BigDecimal> amounts, String code) {
        if (amounts == null || amounts.isEmpty()) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return amounts.getOrDefault(text(code).toUpperCase(), BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
    }
}
