package com.indice.erp.finance.receivables;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class ReceivablesDtos {

    private ReceivablesDtos() {
    }

    public record ReceivablesWorkspaceResponse(
        List<CreditSaleResponse> creditSales,
        List<ReceivableAccountResponse> receivables,
        List<ReceivableInstallmentResponse> installments,
        List<ReceivablePaymentResponse> payments,
        List<CreditPolicyResponse> creditPolicies,
        List<CandidateSaleResponse> candidateSales,
        int count
    ) {
    }

    public record CandidateSaleResponse(
        String id,
        Long salesRecordId,
        Long posTicketId,
        Long contactId,
        Long unitId,
        Long businessId,
        String saleNumber,
        String customerId,
        String customerName,
        String unit,
        String business,
        LocalDate saleDate,
        BigDecimal amount,
        String currency,
        String source
    ) {
    }

    public record CreditSimulationResponse(
        String id,
        String name,
        int termMonths,
        BigDecimal annualInterestRate,
        BigDecimal monthlyPayment,
        BigDecimal totalPayable,
        BigDecimal totalInterest
    ) {
    }

    public record CreditPolicyResponse(
        Long id,
        Long companyId,
        Long unitId,
        Long businessId,
        Long contactId,
        String customerId,
        String customerName,
        BigDecimal creditLine,
        BigDecimal monthlyPurchaseLimit,
        BigDecimal availableCredit,
        int defaultTermMonths,
        BigDecimal annualInterestRate,
        String status,
        String unit,
        String business,
        String notes
    ) {
    }

    public record CreditSaleResponse(
        Long id,
        Long companyId,
        Long unitId,
        Long businessId,
        Long salesRecordId,
        Long posTicketId,
        Long contactId,
        String saleId,
        String saleNumber,
        String customerId,
        String customerName,
        String unit,
        String business,
        LocalDate saleDate,
        BigDecimal originalAmount,
        BigDecimal financedAmount,
        String currency,
        String status,
        CreditSimulationResponse selectedSimulation,
        LocalDate firstDueDate,
        LocalDate dueDate,
        String source
    ) {
    }

    public record ReceivableAccountResponse(
        Long id,
        Long companyId,
        Long unitId,
        Long businessId,
        Long creditSaleId,
        Long salesRecordId,
        Long posTicketId,
        Long contactId,
        String saleNumber,
        String customerId,
        String customerName,
        String unit,
        String business,
        BigDecimal originalAmount,
        BigDecimal totalPayable,
        BigDecimal paidAmount,
        BigDecimal balance,
        String currency,
        LocalDate dueDate,
        LocalDate nextPaymentDate,
        BigDecimal installmentAmount,
        int termMonths,
        BigDecimal annualInterestRate,
        String status
    ) {
    }

    public record ReceivableInstallmentResponse(
        Long id,
        Long companyId,
        Long receivableId,
        Long creditSaleId,
        int installmentNumber,
        String saleNumber,
        String customerName,
        String unit,
        String business,
        LocalDate dueDate,
        BigDecimal amount,
        BigDecimal paidAmount,
        BigDecimal balance,
        String currency,
        String status
    ) {
    }

    public record ReceivablePaymentResponse(
        Long id,
        Long companyId,
        Long receivableId,
        String saleNumber,
        String customerName,
        LocalDate paymentDate,
        String method,
        BigDecimal amount,
        String currency,
        String reference,
        String registeredBy
    ) {
    }

    public record SimulateCreditSaleRequest(
        BigDecimal amount,
        BigDecimal annualInterestRate,
        Integer termMonths
    ) {
    }

    public record CreateCreditSaleRequest(
        String candidateId,
        Long salesRecordId,
        Long posTicketId,
        Long contactId,
        Long creditContactId,
        String creditCustomerId,
        String creditCustomerName,
        Long unitId,
        Long businessId,
        String saleNumber,
        String customerName,
        LocalDate saleDate,
        BigDecimal originalAmount,
        BigDecimal financedAmount,
        String currency,
        LocalDate firstDueDate,
        String source,
        CreditSimulationResponse selectedSimulation
    ) {
    }

    public record RegisterReceivablePaymentRequest(
        Long receivableId,
        LocalDate paymentDate,
        String method,
        BigDecimal amount,
        String reference,
        String registeredBy
    ) {
    }

    public record CreateCreditPolicyRequest(
        Long contactId,
        Long unitId,
        Long businessId,
        String customerId,
        String customerName,
        BigDecimal creditLine,
        BigDecimal monthlyPurchaseLimit,
        Integer defaultTermMonths,
        BigDecimal annualInterestRate,
        String status,
        String notes
    ) {
    }
}
