export type PayrollJurisdiction =
  | 'MX'
  | 'CO'
  | 'US'
  | 'CA_STANDARD'
  | 'CA_QUEBEC'
  | 'BR';

export type PayrollEditTableColumnKey =
  | 'statutoryPayroll'
  | 'employee'
  | 'unit'
  | 'business'
  | 'employmentType'
  | 'province'
  | 'daysWorked'
  | 'daysAbsent'
  | 'periodSalary'
  | 'transportAllowance'
  | 'variablePay'
  | 'grossPay'
  | 'totalDeductions'
  | 'netPay'
  | 'status'
  | 'breakdown';

export type PayrollDetailedColumnKey =
  | 'employee'
  | 'rfc'
  | 'curp'
  | 'nss'
  | 'sin'
  | 'cpf'
  | 'pisPasep'
  | 'idNumber'
  | 'contractType'
  | 'province'
  | 'unit'
  | 'business'
  | 'employmentType'
  | 'payType'
  | 'hourlyRate'
  | 'monthlySalary'
  | 'contributionType'
  | 'dailyWage'
  | 'integratedDailyWage'
  | 'baseContributionSalary'
  | 'daysPaid'
  | 'totalWorkedHours'
  | 'hoursPerDay'
  | 'overtimeHours'
  | 'nightSurcharge'
  | 'sundayHolidaySurcharge'
  | 'nightShiftPremium'
  | 'hazardUnhealthyPremium'
  | 'periodSalary'
  | 'overtimeAmount'
  | 'transportAllowance'
  | 'variablePayTotal'
  | 'bonusesCommissions'
  | 'vacationPay'
  | 'vacationBonusOneThird'
  | 'vacationPremium'
  | 'thirteenthSalaryProvision'
  | 'taxableBenefits'
  | 'proportionalChristmasBonus'
  | 'grossPay'
  | 'totalEarnings'
  | 'federalTax'
  | 'provincialTax'
  | 'quebecProvincialTax'
  | 'isrBeforeSubsidy'
  | 'employmentSubsidy'
  | 'finalIsr'
  | 'employeeImss'
  | 'employeeCpp'
  | 'employeeCpp2'
  | 'employeeEi'
  | 'employeeQpp'
  | 'employeeQpp2'
  | 'employeeQpip'
  | 'employeeHealth'
  | 'employeePension'
  | 'withholdingTax'
  | 'employeeInss'
  | 'irrf'
  | 'transportationVoucher'
  | 'mealBenefitsDeduction'
  | 'infonavitType'
  | 'infonavitDiscount'
  | 'employerImss'
  | 'employerInfonavit'
  | 'sar'
  | 'payrollStateTax'
  | 'occupationalRisk'
  | 'childcareImss'
  | 'employerCpp'
  | 'employerCpp2'
  | 'employerEi'
  | 'employerBenefits'
  | 'employerQpp'
  | 'employerQpp2'
  | 'employerQpip'
  | 'employerHealth'
  | 'employerPension'
  | 'arl'
  | 'severance'
  | 'severanceInterest'
  | 'serviceBonus'
  | 'vacationProvision'
  | 'familyCompensationFund'
  | 'icbf'
  | 'sena'
  | 'employerInss'
  | 'fgts'
  | 'ratWorkAccident'
  | 'thirdPartyContributions'
  | 'totalEmployerObligations'
  | 'totalPayrollCost'
  | 'loans'
  | 'otherDiscounts'
  | 'otherDeductions'
  | 'netAdjustment'
  | 'totalDeductions'
  | 'netPay'
  | 'breakdown';

export type PayrollEmployerSummaryMetricKey =
  | 'employerImss'
  | 'employerInfonavit'
  | 'sar'
  | 'payrollStateTax'
  | 'occupationalRisk'
  | 'childcareImss'
  | 'employerCpp'
  | 'employerCpp2'
  | 'employerEi'
  | 'employerBenefits'
  | 'employerQpp'
  | 'employerQpp2'
  | 'employerQpip'
  | 'employerHealth'
  | 'employerPension'
  | 'arl'
  | 'severance'
  | 'severanceInterest'
  | 'serviceBonus'
  | 'vacationProvision'
  | 'familyCompensationFund'
  | 'icbf'
  | 'sena'
  | 'employerInss'
  | 'fgts'
  | 'ratWorkAccident'
  | 'thirdPartyContributions'
  | 'totalEmployerObligations'
  | 'totalPayrollCost';

export interface PayrollColumnDefinition<K extends string> {
  key: K;
  label: string;
}

export interface PayrollEmployerSummaryMetricDefinition {
  key: PayrollEmployerSummaryMetricKey;
  label: string;
  accent?: 'primary';
}

export interface PayrollEmployerSummaryConfig {
  helperText: string;
  metrics: PayrollEmployerSummaryMetricDefinition[];
}

export interface PayrollBreakdownConfig {
  taxSectionTitle: string;
  employeeDeductionsTitle: string;
  employerObligationsTitle: string;
  employerObligationsDescription: string;
  contributionBreakdownTitle: string;
  benefitsSectionTitle?: string;
  internalOnlyNotice: string;
  finalCalculationTitle: string;
}
