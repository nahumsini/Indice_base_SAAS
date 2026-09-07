package com.indice.erp.finance.receivables;

import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.receivables.ReceivablesDtos.CandidateSaleResponse;
import com.indice.erp.finance.receivables.ReceivablesDtos.CreateCreditPolicyRequest;
import com.indice.erp.finance.receivables.ReceivablesDtos.CreateCreditSaleRequest;
import com.indice.erp.finance.receivables.ReceivablesDtos.CreditSimulationResponse;
import com.indice.erp.finance.receivables.ReceivablesDtos.ReceivableAccountResponse;
import com.indice.erp.finance.receivables.ReceivablesDtos.ReceivablesWorkspaceResponse;
import com.indice.erp.finance.receivables.ReceivablesDtos.RegisterReceivablePaymentRequest;
import com.indice.erp.finance.receivables.ReceivablesDtos.SimulateCreditSaleRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.shared.FinanceValidationSupport;
import java.math.BigDecimal;
import java.util.Set;
import java.util.Objects;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import com.indice.erp.finance.treasury.TreasuryService;
import com.indice.erp.finance.treasury.TreasuryAccount;
import com.indice.erp.finance.treasury.TreasuryMovementCommand;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReceivablesService {

    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");
    private static final BigDecimal TWELVE = new BigDecimal("12");

    private final ReceivablesRepository repository;
    private final FinanceAccessService accessService;
    private final TreasuryService treasury;
    private final FinanceBusinessTimeZoneResolver timeZones;
    private final ReceivableReceiptService receipts;

    public ReceivablesService(ReceivablesRepository repository, FinanceAccessService accessService,
            TreasuryService treasury, FinanceBusinessTimeZoneResolver timeZones, ReceivableReceiptService receipts) {
        this.repository = repository;
        this.accessService = accessService;
        this.treasury = treasury;
        this.timeZones = timeZones;
        this.receipts = receipts;
    }

    private LocalDate businessDate(FinanceContext context) {
        return LocalDate.now(timeZones.resolve(context.companyId()));
    }

    @Transactional(readOnly = true)
    public List<TreasuryAccount> paymentAccounts(FinanceContext context, long receivableId) {
        var account = repository.findReceivableAccount(context, receivableId, businessDate(context))
            .orElseThrow(() -> new NoSuchElementException("Receivable account not found."));
        return treasury.listEligibleAccounts(context.companyId(), account.currency(), account.unitId(), account.businessId())
            .stream().filter(destination -> Set.of("BANK", "CASH").contains(destination.type())).toList();
    }

    @Transactional(readOnly = true)
    public ReceivablesWorkspaceResponse workspace(FinanceContext context) {
        return workspaceResponse(context);
    }

    @Transactional(readOnly = true)
    public List<CandidateSaleResponse> candidateSales(FinanceContext context) {
        return repository.listCandidateSales(context);
    }

    @Transactional(readOnly = true)
    public List<CreditSimulationResponse> simulate(SimulateCreditSaleRequest request) {
        var amount = positiveAmount(request.amount(), "amount");
        var termMonths = positiveMonths(request.termMonths());
        var annualInterestRate = nonNegative(request.annualInterestRate(), "annualInterestRate");
        return buildSimulations(amount, annualInterestRate, termMonths);
    }

    @Transactional
    public ReceivablesWorkspaceResponse createCreditSale(FinanceContext context, CreateCreditSaleRequest request) {
        var financedAmount = positiveAmount(request.financedAmount(), "financedAmount");
        var firstDueDate = request.firstDueDate() == null ? businessDate(context).plusMonths(1) : request.firstDueDate();
        var source = resolveSource(context, request);
        if (financedAmount.compareTo(source.amount()) > 0) throw FinanceApiException.badRequest("Financed amount cannot exceed the unpaid sale amount.");
        if (source.posTicketId() != null && financedAmount.compareTo(source.amount()) != 0) {
            throw FinanceApiException.badRequest("A POS credit must cover exactly the credit tender recorded on its ticket.");
        }
        var creditSubject = applyCreditSubject(context, source, request);
        var simulation = normalizeSimulation(request.selectedSimulation(), financedAmount);
        var policy = validateCreditCapacity(context, creditSubject, financedAmount);
        var status = resolveAccountStatus(simulation.totalPayable(), firstDueDate, businessDate(context));

        var createdSale = repository.insertCreditSale(context, creditSubject, financedAmount, firstDueDate, simulation);
        repository.linkCreditPolicy(context, createdSale.id(), policy.id());
        var createdAccount = repository.insertReceivableAccount(context, createdSale, status);
        repository.insertInstallments(context, createdAccount, businessDate(context));
        repository.decreaseAvailableCredit(context, policy.id(), financedAmount);
        return workspaceResponse(context);
    }

    @Transactional
    public ReceivablesWorkspaceResponse registerPayment(FinanceContext context, RegisterReceivablePaymentRequest request) {
        if (request.receivableId() == null) {
            throw FinanceApiException.badRequest("receivableId is required.");
        }
        var key = request.idempotencyKey() == null ? "" : request.idempotencyKey().trim();
        if (!key.matches("[A-Za-z0-9:_-]{8,120}")) {
            throw FinanceApiException.badRequest("A valid idempotencyKey is required for a collection.");
        }
        repository.lockReceivable(context, request.receivableId());
        var amount = positiveAmount(request.amount(), "amount");
        var paymentDate = request.paymentDate() == null ? businessDate(context) : request.paymentDate();
        var method = normalizePaymentMethod(request.method());
        var account = repository.findReceivableAccount(context, request.receivableId(), businessDate(context))
            .orElseThrow(() -> new NoSuchElementException("Receivable account not found."));

        var existing = repository.findPaymentByKey(context, key);
        if (existing.isPresent()) {
            var payment = existing.get();
            if (!Objects.equals(payment.receivableId(), account.id()) || payment.amount().compareTo(amount) != 0
                    || !payment.paymentDate().equals(paymentDate) || !payment.method().equals(method)
                    || (request.paymentAccountId() != null && !request.paymentAccountId().equals(payment.paymentAccountId()))) {
                throw FinanceApiException.conflict("The collection retry key belongs to different payment details.");
            }
            return workspaceResponse(context);
        }
        if (paymentDate.isAfter(businessDate(context))) {
            throw FinanceApiException.badRequest("A collection cannot be recorded in the future.");
        }
        if ("CANCELLED".equals(account.status())) {
            throw FinanceApiException.conflict("A cancelled receivable cannot receive payments.");
        }
        Long destination = request.paymentAccountId();
        if (destination == null && "CASH".equals(method)) {
            destination = treasury.ensureUniversalCash(context.companyId(), context.userId(), account.currency()).id();
        }
        if (destination == null) throw FinanceApiException.badRequest("paymentAccountId is required for a non-cash collection.");
        treasury.requireEligibleAccount(context.companyId(), destination, account.currency(), account.unitId(), account.businessId(),
            "CASH".equals(method) ? Set.of("CASH") : Set.of("BANK"));
        if (account.balance().compareTo(BigDecimal.ZERO) <= 0) {
            throw FinanceApiException.conflict("Receivable account is already paid.");
        }
        if (amount.compareTo(account.balance()) > 0) {
            throw FinanceApiException.badRequest("Payment amount cannot exceed balance.");
        }

        var paidAmount = money(account.paidAmount().add(amount));
        var balance = money(account.totalPayable().subtract(paidAmount).max(BigDecimal.ZERO));

        var paymentId = repository.insertPayment(context, account, method, amount, paymentDate,
            blankToDefault(request.reference(), "Sin referencia"),
            blankToDefault(context.userName(), "Finanzas"), destination, key);
        receipts.register(context, account.id(), paymentId, request.receipt());
        treasury.post(new TreasuryMovementCommand(context.companyId(), destination, account.unitId(), account.businessId(),
            account.currency(), "RECEIVABLES", "RECEIVABLE_COLLECTION", Long.toString(paymentId),
            "RECEIVABLE_COLLECTION:" + paymentId, amount, BigDecimal.ZERO, "Cobro de " + account.saleNumber(),
            paymentDate.atStartOfDay(timeZones.resolve(context.companyId())).toInstant(), context.userId(), null, null));
        repository.applyPaymentToInstallments(context, account.id(), amount, paymentDate, businessDate(context));
        var nextPaymentDate = balance.compareTo(BigDecimal.ZERO) == 0
            ? account.dueDate()
            : repository.findNextOpenInstallmentDueDate(context, account.id()).orElseGet(() -> fallbackNextPaymentDate(account));
        var status = resolveAccountStatus(balance, nextPaymentDate, businessDate(context));
        repository.updateReceivableAfterPayment(context, account, paidAmount, balance, nextPaymentDate, status);
        if (balance.compareTo(BigDecimal.ZERO) == 0) {
            repository.markCreditSaleCompleted(context, account.creditSaleId());
        }
        repository.policyForCollection(context, account)
            .ifPresent(policy -> {
                var principalBefore = account.paidAmount().multiply(account.originalAmount()).divide(account.totalPayable(), 4, RoundingMode.HALF_UP);
                var principalAfter = paidAmount.multiply(account.originalAmount()).divide(account.totalPayable(), 4, RoundingMode.HALF_UP);
                repository.increaseAvailableCredit(context, policy.id(), principalAfter.subtract(principalBefore));
            });
        return workspaceResponse(context);
    }

    @Transactional
    public ReceivablesWorkspaceResponse createCreditPolicy(FinanceContext context, CreateCreditPolicyRequest request) {
        var customerName = blankToNull(request.customerName());
        if (customerName == null) {
            throw FinanceApiException.badRequest("customerName is required.");
        }
        var creditLine = nonNegative(request.creditLine(), "creditLine");
        var monthlyPurchaseLimit = nonNegative(request.monthlyPurchaseLimit(), "monthlyPurchaseLimit");
        var defaultTermMonths = positiveMonths(request.defaultTermMonths());
        var annualInterestRate = nonNegative(request.annualInterestRate(), "annualInterestRate");
        var status = normalizePolicyStatus(request.status());
        var currencyCode = com.indice.erp.finance.shared.FinanceValidationSupport.requireCurrencyCode(request.currencyCode());
        var assignment = resolveAssignment(context, request.unitId(), request.businessId());

        validateReferences(context, assignment.unitId(), assignment.businessId(), request.contactId());
        repository.lockCompanyForPolicyCreation(context);
        if (repository.findCreditPolicy(context, request.contactId(), customerName, currencyCode).isPresent()) {
            throw FinanceApiException.conflict("A credit policy already exists for this customer and currency.");
        }
        repository.insertCreditPolicy(context, request.contactId(), assignment.unitId(), assignment.businessId(),
            customerName, currencyCode, creditLine, monthlyPurchaseLimit, defaultTermMonths, annualInterestRate,
            status, blankToNull(request.notes()));
        return workspaceResponse(context);
    }

    @Transactional
    public ReceivablesWorkspaceResponse updateCreditPolicy(FinanceContext context, long id, CreateCreditPolicyRequest request) {
        var existing = repository.lockCreditPolicy(context, id);
        if (!java.util.Objects.equals(existing.contactId(), request.contactId())
                || !existing.currencyCode().equalsIgnoreCase(request.currencyCode())
                || !java.util.Objects.equals(existing.unitId(), request.unitId())
                || !java.util.Objects.equals(existing.businessId(), request.businessId())
                || !existing.customerName().equals(request.customerName())) {
            throw FinanceApiException.badRequest("The policy retains its customer, currency and organizational scope. Create a separate policy for another assignment.");
        }
        var line = nonNegative(request.creditLine(), "creditLine");
        if (line.compareTo(existing.creditLine().subtract(existing.availableCredit())) < 0) {
            throw FinanceApiException.conflict("The credit line cannot be lower than the credit already in use.");
        }
        repository.updateCreditPolicy(context, existing, line, nonNegative(request.monthlyPurchaseLimit(), "monthlyPurchaseLimit"),
            positiveMonths(request.defaultTermMonths()), nonNegative(request.annualInterestRate(), "annualInterestRate"),
            normalizePolicyStatus(request.status()), blankToNull(request.notes()));
        return workspaceResponse(context);
    }

    @Transactional
    public ReceivablesWorkspaceResponse archiveCreditPolicy(FinanceContext context, long id) {
        var policy = repository.lockCreditPolicy(context, id);
        if (policy.availableCredit().compareTo(policy.creditLine()) < 0 || repository.hasOutstandingCredit(context, policy)) {
            throw FinanceApiException.conflict("A policy with outstanding credit must be blocked instead of archived.");
        }
        repository.archiveCreditPolicy(context, id);
        return workspaceResponse(context);
    }

    private ReceivablesWorkspaceResponse workspaceResponse(FinanceContext context) {
        var today = businessDate(context);
        var creditSales = repository.listCreditSales(context);
        var receivables = repository.listReceivableAccounts(context, today);
        var installments = repository.listInstallments(context, today);
        var payments = repository.listPayments(context);
        var creditPolicies = repository.listCreditPolicies(context);
        var candidateSales = repository.listCandidateSales(context);
        return new ReceivablesWorkspaceResponse(
            creditSales,
            receivables,
            installments,
            payments,
            creditPolicies,
            candidateSales,
            creditSales.size() + receivables.size() + installments.size() + payments.size() + creditPolicies.size()
        );
    }

    private ReceivablesDtos.CreditPolicyResponse validateCreditCapacity(FinanceContext context, CandidateSaleResponse source, BigDecimal financedAmount) {
        var policy = repository.findCreditPolicy(context, source.contactId(), source.customerName(), source.currency())
            .orElseThrow(() -> FinanceApiException.conflict("Active credit customer policy is required."));
        if (!"ACTIVE".equalsIgnoreCase(policy.status())) {
            throw FinanceApiException.conflict("Credit customer policy must be active.");
        }
        if (financedAmount.compareTo(policy.availableCredit()) > 0) {
            throw FinanceApiException.conflict("Financed amount exceeds available credit.");
        }
        if (policy.monthlyPurchaseLimit().compareTo(BigDecimal.ZERO) > 0) {
            var monthStart = businessDate(context).withDayOfMonth(1);
            var monthEnd = monthStart.plusMonths(1);
            var currentMonthlyUsage = repository.sumMonthlyCreditSales(
                context,
                source.contactId(),
                source.customerName(),
                source.currency(),
                monthStart,
                monthEnd
            );
            if (currentMonthlyUsage.add(financedAmount).compareTo(policy.monthlyPurchaseLimit()) > 0) {
                throw FinanceApiException.conflict("Financed amount exceeds monthly credit limit.");
            }
        }
        return policy;
    }

    private CandidateSaleResponse applyCreditSubject(
            FinanceContext context,
            CandidateSaleResponse source,
            CreateCreditSaleRequest request) {
        var creditCustomerId = blankToNull(request.creditCustomerId());
        var creditCustomerName = blankToNull(request.creditCustomerName());
        var creditContactId = request.creditContactId();

        if (creditCustomerId == null && creditCustomerName == null && creditContactId == null) {
            return source;
        }

        validateReferences(context, source.unitId(), source.businessId(), creditContactId);
        var customerName = blankToDefault(creditCustomerName, source.customerName());
        var customerId = blankToDefault(
            creditCustomerId,
            creditContactId == null
                ? "customer:" + customerName.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-")
                : String.valueOf(creditContactId)
        );

        return new CandidateSaleResponse(
            source.id(),
            source.salesRecordId(),
            source.posTicketId(),
            creditContactId,
            source.unitId(),
            source.businessId(),
            source.saleNumber(),
            customerId,
            customerName,
            source.unit(),
            source.business(),
            source.saleDate(),
            source.amount(),
            source.currency(),
            source.source()
        );
    }

    private CandidateSaleResponse resolveSource(FinanceContext context, CreateCreditSaleRequest request) {
        var salesRecordId = firstNonNull(request.salesRecordId(), parseSalesRecordId(request.candidateId()));
        if (salesRecordId != null) {
            repository.lockCandidateSale(context, salesRecordId);
            return repository.findCandidateSale(context, salesRecordId)
                .orElseThrow(() -> new NoSuchElementException("Candidate sale not found."));
        }

        if (request.posTicketId() != null) throw FinanceApiException.badRequest("Select the saved POS sale to create its credit account.");
        var saleNumber = blankToDefault(request.saleNumber(), "MANUAL-" + System.currentTimeMillis());
        var customerName = blankToDefault(request.customerName(), "Cliente sin nombre");
        var originalAmount = positiveAmount(firstNonNull(request.originalAmount(), request.financedAmount()), "originalAmount");
        var currency = FinanceValidationSupport.requireCurrencyCode(blankToDefault(request.currency(), "MXN"));
        var assignment = resolveAssignment(context, request.unitId(), request.businessId());
        validateReferences(context, assignment.unitId(), assignment.businessId(), request.contactId());

        return new CandidateSaleResponse(
            "manual:" + saleNumber,
            null,
            request.posTicketId(),
            request.contactId(),
            assignment.unitId(),
            assignment.businessId(),
            saleNumber,
            request.contactId() == null ? "customer:" + customerName.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-") : String.valueOf(request.contactId()),
            customerName,
            "Unidad general",
            "Negocio general",
            request.saleDate() == null ? businessDate(context) : request.saleDate(),
            originalAmount,
            currency,
            normalizeSource(request.source())
        );
    }

    private ScopedAssignment resolveAssignment(FinanceContext context, Long requestedUnitId, Long requestedBusinessId) {
        var scope = context.scope();
        var unitId = requestedUnitId;
        var businessId = requestedBusinessId;

        if (scope.type() == FinanceScope.Type.UNIT_HEADQUARTERS) {
            if (unitId != null && !unitId.equals(scope.unitId())) {
                throw FinanceApiException.forbidden("Forbidden");
            }
            unitId = scope.unitId();
        }

        if (scope.type() == FinanceScope.Type.BUSINESS_OFFICE) {
            if (businessId != null && !businessId.equals(scope.businessId())) {
                throw FinanceApiException.forbidden("Forbidden");
            }
            if (unitId != null && scope.unitId() != null && !unitId.equals(scope.unitId())) {
                throw FinanceApiException.forbidden("Forbidden");
            }
            unitId = unitId == null ? scope.unitId() : unitId;
            businessId = scope.businessId();
        }

        if (!accessService.containsAssignment(context, unitId, businessId)) {
            throw FinanceApiException.forbidden("Forbidden");
        }
        return new ScopedAssignment(unitId, businessId);
    }

    private void validateReferences(FinanceContext context, Long unitId, Long businessId, Long contactId) {
        if (!repository.unitExists(context, unitId)) {
            throw FinanceApiException.badRequest("unitId is invalid for this company.");
        }
        if (!repository.businessExists(context, unitId, businessId)) {
            throw FinanceApiException.badRequest("businessId is invalid for this company.");
        }
        if (!repository.contactExists(context, contactId)) {
            throw FinanceApiException.badRequest("contactId is invalid for this company.");
        }
    }

    private List<CreditSimulationResponse> buildSimulations(BigDecimal amount, BigDecimal annualInterestRate, int termMonths) {
        return List.of(
            buildSimulation("balanced", "Balanceada", amount, annualInterestRate, termMonths),
            buildSimulation("accelerated", "Acelerada", amount, annualInterestRate.subtract(new BigDecimal("1.5")).max(BigDecimal.ZERO),
                Math.max(1, Math.round(termMonths * 0.75f))),
            buildSimulation("extended", "Extendida", amount, annualInterestRate.add(new BigDecimal("1.25")),
                Math.max(1, Math.round(termMonths * 1.25f)))
        );
    }

    private CreditSimulationResponse buildSimulation(
            String id,
            String name,
            BigDecimal amount,
            BigDecimal annualInterestRate,
            int termMonths) {
        var monthlyRate = annualInterestRate.divide(ONE_HUNDRED, MathContext.DECIMAL64)
            .divide(TWELVE, MathContext.DECIMAL64);
        BigDecimal monthlyPayment;
        if (monthlyRate.compareTo(BigDecimal.ZERO) == 0) {
            monthlyPayment = amount.divide(BigDecimal.valueOf(termMonths), 8, RoundingMode.HALF_UP);
        } else {
            var rate = monthlyRate.doubleValue();
            var factor = Math.pow(1 + rate, termMonths);
            monthlyPayment = amount.multiply(BigDecimal.valueOf((rate * factor) / (factor - 1)));
        }
        var roundedMonthlyPayment = money(monthlyPayment);
        var totalPayable = money(roundedMonthlyPayment.multiply(BigDecimal.valueOf(termMonths)));
        if (totalPayable.compareTo(amount) < 0) {
            totalPayable = money(amount);
        }
        var totalInterest = money(totalPayable.subtract(amount).max(BigDecimal.ZERO));
        return new CreditSimulationResponse(
            id,
            name,
            termMonths,
            annualInterestRate.setScale(2, RoundingMode.HALF_UP),
            roundedMonthlyPayment,
            totalPayable,
            totalInterest
        );
    }

    private CreditSimulationResponse normalizeSimulation(CreditSimulationResponse simulation, BigDecimal financedAmount) {
        if (simulation == null) {
            return buildSimulations(financedAmount, new BigDecimal("24"), 6).getFirst();
        }
        var termMonths = positiveMonths(simulation.termMonths());
        var annualInterestRate = nonNegative(simulation.annualInterestRate(), "annualInterestRate");
        var fallback = buildSimulation(
            blankToDefault(simulation.id(), "selected"),
            blankToDefault(simulation.name(), "Seleccionada"),
            financedAmount,
            annualInterestRate,
            termMonths
        );
        var monthlyPayment = nonNegative(firstNonNull(simulation.monthlyPayment(), fallback.monthlyPayment()), "monthlyPayment");
        var totalPayable = nonNegative(firstNonNull(simulation.totalPayable(), fallback.totalPayable()), "totalPayable");
        if (totalPayable.compareTo(financedAmount) < 0) {
            totalPayable = money(financedAmount);
        }
        var rawTotalInterest = firstNonNull(simulation.totalInterest(), totalPayable.subtract(financedAmount));
        var totalInterest = rawTotalInterest.compareTo(BigDecimal.ZERO) < 0
            ? BigDecimal.ZERO
            : money(rawTotalInterest);
        return new CreditSimulationResponse(
            blankToDefault(simulation.id(), "selected"),
            blankToDefault(simulation.name(), "Seleccionada"),
            termMonths,
            annualInterestRate.setScale(2, RoundingMode.HALF_UP),
            money(monthlyPayment),
            money(totalPayable),
            money(totalInterest)
        );
    }

    private String resolveAccountStatus(BigDecimal balance, LocalDate dueDate, LocalDate today) {
        if (balance.compareTo(BigDecimal.ZERO) <= 0) {
            return "PAID";
        }
        if (dueDate.isBefore(today)) {
            return "OVERDUE";
        }
        if (!dueDate.isAfter(today.plusDays(7))) {
            return "DUE_SOON";
        }
        return "ON_TIME";
    }

    private LocalDate fallbackNextPaymentDate(ReceivableAccountResponse account) {
        var nextPaymentDate = account.nextPaymentDate().plusMonths(1);
        return nextPaymentDate.isAfter(account.dueDate()) ? account.dueDate() : nextPaymentDate;
    }

    private BigDecimal positiveAmount(BigDecimal amount, String fieldName) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw FinanceApiException.badRequest(fieldName + " must be greater than zero.");
        }
        return money(amount);
    }

    private BigDecimal nonNegative(BigDecimal amount, String fieldName) {
        if (amount == null) {
            throw FinanceApiException.badRequest(fieldName + " is required.");
        }
        if (amount.compareTo(BigDecimal.ZERO) < 0) {
            throw FinanceApiException.badRequest(fieldName + " must be non-negative.");
        }
        return money(amount);
    }

    private int positiveMonths(Integer months) {
        if (months == null || months <= 0) {
            throw FinanceApiException.badRequest("termMonths must be greater than zero.");
        }
        return months;
    }

    private String normalizePaymentMethod(String value) {
        var normalized = blankToDefault(value, "TRANSFER").toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "CASH", "CARD", "TRANSFER", "CHECK", "WALLET" -> normalized;
            default -> throw FinanceApiException.badRequest("Unsupported payment method.");
        };
    }

    private String normalizePolicyStatus(String value) {
        var normalized = blankToDefault(value, "ACTIVE").toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "ACTIVE", "REVIEW", "BLOCKED" -> normalized;
            default -> throw FinanceApiException.badRequest("Unsupported credit policy status.");
        };
    }

    private String normalizeSource(String value) {
        var normalized = blankToDefault(value, "MANUAL").toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "SALES", "POS", "MANUAL" -> normalized;
            default -> "MANUAL";
        };
    }

    private Long parseSalesRecordId(String candidateId) {
        if (candidateId == null || !candidateId.startsWith("sales:")) {
            return null;
        }
        try {
            return Long.parseLong(candidateId.substring("sales:".length()));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private String blankToDefault(String value, String fallback) {
        var cleaned = blankToNull(value);
        return cleaned == null ? fallback : cleaned;
    }

    private String blankToNull(String value) {
        var cleaned = value == null ? "" : value.trim();
        return cleaned.isBlank() ? null : cleaned;
    }

    private <T> T firstNonNull(T primary, T fallback) {
        return primary == null ? fallback : primary;
    }

    private record ScopedAssignment(Long unitId, Long businessId) {
    }
}
