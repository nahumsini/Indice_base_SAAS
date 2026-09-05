package com.indice.erp.pos.settlement;

import com.indice.erp.finance.treasury.TreasuryAccount;
import com.indice.erp.finance.treasury.TreasuryService;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.cashregister.CashRegisterRecord;
import com.indice.erp.pos.checkout.CheckoutPayment;
import com.indice.erp.pos.status.PaymentMethod;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SettlementPolicyService {

    private static final List<PaymentMethod> ORDERED_METHODS = List.of(
        PaymentMethod.CASH,
        PaymentMethod.CARD,
        PaymentMethod.TRANSFER,
        PaymentMethod.WALLET,
        PaymentMethod.CREDIT
    );

    private final SettlementPolicyRepository repository;
    private final TreasuryService treasuryService;

    public SettlementPolicyService(SettlementPolicyRepository repository, TreasuryService treasuryService) {
        this.repository = repository;
        this.treasuryService = treasuryService;
    }

    @Transactional
    public List<SettlementRuleResponse> ensureCompatibilityPolicy(
            PosContext context,
            CashRegisterRecord register,
            String currencyCode) {
        var currency = currency(currencyCode);
        var existing = repository.findByCurrency(context, register.id(), currency);
        if (existing.size() == ORDERED_METHODS.size()) {
            return existing;
        }
        var byMethod = new EnumMap<PaymentMethod, SettlementRuleResponse>(PaymentMethod.class);
        existing.forEach(rule -> byMethod.put(PaymentMethod.valueOf(rule.paymentMethod()), rule));
        for (var method : ORDERED_METHODS) {
            if (!byMethod.containsKey(method)) {
                var fallback = fallback(context, method, currency);
                repository.upsert(
                    context, register.id(), method.name(), currency,
                    fallback.accountId(), fallback.timing(), true, fallback.reviewStatus()
                );
            }
        }
        return repository.findByCurrency(context, register.id(), currency);
    }

    @Transactional
    public List<SettlementRuleResponse> savePolicy(
            PosContext context,
            CashRegisterRecord register,
            String currencyCode,
            List<SettlementRuleRequest> requestedRules) {
        var currency = currency(currencyCode);
        ensureCompatibilityPolicy(context, register, currency);
        if (requestedRules == null || requestedRules.isEmpty()) {
            return repository.findByCurrency(context, register.id(), currency);
        }
        var seen = new java.util.HashSet<PaymentMethod>();
        for (var request : requestedRules) {
            var method = paymentMethod(request.paymentMethod());
            if (!seen.add(method)) {
                throw PosApiException.badRequest("Each payment method can only be configured once per currency.");
            }
            var enabled = !Boolean.FALSE.equals(request.enabled());
            var accountId = request.destinationPaymentAccountId();
            var timing = timing(request.settlementTiming(), method);
            var reviewStatus = "READY";
            if (method == PaymentMethod.CASH && !enabled) {
                throw PosApiException.badRequest("Cash must remain enabled for every cash register.");
            }
            if (method == PaymentMethod.CREDIT) {
                accountId = null;
                timing = "IMMEDIATE";
            } else {
                if (enabled && accountId == null) {
                    throw PosApiException.badRequest("Enabled collection methods require a destination payment account.");
                }
                if (accountId != null) {
                    var account = treasuryService.requireEligibleAccount(
                        context.companyId(), accountId, currency, register.unitId(), register.businessId(),
                        allowedTypes(method)
                    );
                    if (method == PaymentMethod.CASH && "BANK".equals(account.type())) {
                        timing = "DEFERRED";
                    }
                    if ((method == PaymentMethod.CARD || method == PaymentMethod.WALLET)
                            && "IMMEDIATE".equals(timing)) {
                        throw PosApiException.badRequest("Card and wallet collections require settlement confirmation.");
                    }
                    if (account.systemKey() != null && account.systemKey().startsWith("POS_UNASSIGNED_")) {
                        timing = "DEFERRED";
                        reviewStatus = "NEEDS_REVIEW";
                    }
                }
            }
            repository.upsert(
                context, register.id(), method.name(), currency, accountId, timing, enabled, reviewStatus
            );
        }
        return repository.findByCurrency(context, register.id(), currency);
    }

    @Transactional
    public List<CheckoutPayment> resolveCheckoutPayments(
            PosContext context,
            CashRegisterRecord register,
            String currencyCode,
            List<CheckoutPayment> payments) {
        var rules = ensureCompatibilityPolicy(context, register, currencyCode);
        var byMethod = new EnumMap<PaymentMethod, SettlementRuleResponse>(PaymentMethod.class);
        rules.forEach(rule -> byMethod.put(PaymentMethod.valueOf(rule.paymentMethod()), rule));
        return payments.stream().map(payment -> {
            var rule = byMethod.get(payment.paymentMethod());
            if (rule == null || !rule.enabled()) {
                throw PosApiException.conflict("Payment method is not enabled for this cash register.");
            }
            var resolvedAccountId = rule.destinationPaymentAccountId();
            if (payment.paymentMethod() != PaymentMethod.CREDIT && resolvedAccountId == null) {
                throw PosApiException.conflict("Payment method has no destination account configured.");
            }
            if (resolvedAccountId != null) {
                treasuryService.requireEligibleAccount(
                    context.companyId(), resolvedAccountId, currency(currencyCode),
                    register.unitId(), register.businessId(), allowedTypes(payment.paymentMethod())
                );
            }
            if (payment.paymentAccountId() != null && !payment.paymentAccountId().equals(resolvedAccountId)) {
                throw PosApiException.badRequest("Checkout cannot override the cash register destination account.");
            }
            return new CheckoutPayment(
                payment.paymentMethod(), resolvedAccountId, payment.amount(), payment.currencyCode(), payment.reference()
            );
        }).toList();
    }

    @Transactional(readOnly = true)
    public List<SettlementRuleResponse> list(PosContext context, long registerId) {
        return repository.findAll(context, registerId);
    }

    @Transactional
    public List<TreasuryAccount> eligibleAccounts(
            PosContext context,
            CashRegisterRecord register,
            String currencyCode) {
        ensureCompatibilityPolicy(context, register, currencyCode);
        return treasuryService.listEligibleAccounts(
            context.companyId(), currency(currencyCode), register.unitId(), register.businessId()
        );
    }

    @Transactional
    public List<TreasuryAccount> eligibleAccountsForScope(
            PosContext context,
            Long unitId,
            Long businessId,
            String currencyCode) {
        var currency = currency(currencyCode);
        treasuryService.ensureUniversalCash(context.companyId(), context.userId(), currency);
        treasuryService.ensurePosPendingAccount(context.companyId(), context.userId(), currency, "CARD");
        treasuryService.ensurePosPendingAccount(context.companyId(), context.userId(), currency, "TRANSFER");
        treasuryService.ensurePosPendingAccount(context.companyId(), context.userId(), currency, "WALLET");
        return treasuryService.listEligibleAccounts(context.companyId(), currency, unitId, businessId);
    }

    private Fallback fallback(PosContext context, PaymentMethod method, String currencyCode) {
        if (method == PaymentMethod.CREDIT) {
            return new Fallback(null, "IMMEDIATE", "READY");
        }
        if (method == PaymentMethod.CASH) {
            var account = treasuryService.ensureUniversalCash(context.companyId(), context.userId(), currencyCode);
            return new Fallback(account.id(), "IMMEDIATE", "READY");
        }
        var account = treasuryService.ensurePosPendingAccount(
            context.companyId(), context.userId(), currencyCode, method.name()
        );
        return new Fallback(account.id(), "DEFERRED", "NEEDS_REVIEW");
    }

    private Set<String> allowedTypes(PaymentMethod method) {
        return switch (method) {
            case CASH -> Set.of("CASH", "BANK");
            case CARD -> Set.of("BANK", "CREDIT_CARD");
            case TRANSFER, WALLET -> Set.of("BANK");
            case CREDIT -> Set.of();
        };
    }

    private PaymentMethod paymentMethod(String value) {
        try {
            return PaymentMethod.valueOf(token(value));
        } catch (IllegalArgumentException exception) {
            throw PosApiException.badRequest("Unsupported payment method.");
        }
    }

    private String timing(String value, PaymentMethod method) {
        var fallback = switch (method) {
            case CASH, TRANSFER, CREDIT -> "IMMEDIATE";
            case CARD, WALLET -> "DEFERRED";
        };
        var normalized = value == null || value.isBlank() ? fallback : token(value);
        if (!Set.of("IMMEDIATE", "DEFERRED").contains(normalized)) {
            throw PosApiException.badRequest("Unsupported settlement timing.");
        }
        return normalized;
    }

    private String currency(String value) {
        var currency = token(value);
        if (currency.length() != 3) {
            throw PosApiException.badRequest("currencyCode must have three characters.");
        }
        return currency;
    }

    private String token(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private record Fallback(Long accountId, String timing, String reviewStatus) {
    }
}
