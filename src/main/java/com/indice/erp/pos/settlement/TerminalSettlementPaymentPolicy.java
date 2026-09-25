package com.indice.erp.pos.settlement;

import com.indice.erp.finance.treasury.TreasuryService;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.cashregister.CashRegisterRecord;
import com.indice.erp.pos.checkout.CheckoutPayment;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class TerminalSettlementPaymentPolicy {
    private final SettlementPolicyRepository repository;
    private final TreasuryService treasury;
    public TerminalSettlementPaymentPolicy(SettlementPolicyRepository repository, TreasuryService treasury) {
        this.repository = repository;
        this.treasury = treasury;
    }
    public List<CheckoutPayment> resolve(PosContext context, CashRegisterRecord register, String currency, List<CheckoutPayment> payments) {
        var rules = repository.findByCurrency(context, register.id(), currency);
        return payments.stream().map(payment -> {
            var rule = rules.stream().filter(candidate -> candidate.paymentMethod().equals(payment.paymentMethod().name())).findFirst()
                .orElseThrow(() -> PosApiException.conflict("Configure the register settlement policy before using a payment terminal."));
            if (!rule.enabled() || rule.destinationPaymentAccountId() == null || !"DEFERRED".equals(rule.settlementTiming()))
                throw PosApiException.conflict("Terminal card collections require an enabled deferred destination account.");
            if (payment.paymentMethod() != com.indice.erp.pos.status.PaymentMethod.CARD)
                throw PosApiException.badRequest("Terminal preflight requires a card payment.");
            treasury.requireEligibleAccount(context.companyId(), rule.destinationPaymentAccountId(), currency,
                register.unitId(), register.businessId(), Set.of("BANK", "CREDIT_CARD"));
            if (payment.paymentAccountId() != null && !payment.paymentAccountId().equals(rule.destinationPaymentAccountId()))
                throw PosApiException.badRequest("Checkout cannot override the cash register destination account.");
            return new CheckoutPayment(payment.paymentMethod(), rule.destinationPaymentAccountId(), payment.amount(), payment.currencyCode(), payment.reference());
        }).toList();
    }
}
