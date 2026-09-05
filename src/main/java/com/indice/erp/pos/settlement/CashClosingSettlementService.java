package com.indice.erp.pos.settlement;

import com.indice.erp.finance.treasury.TreasuryMovementCommand;
import com.indice.erp.finance.treasury.TreasuryService;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosJsonSupport;
import com.indice.erp.pos.cashclosing.CashClosingAmounts;
import com.indice.erp.pos.cashregister.CashRegisterRecord;
import com.indice.erp.pos.status.PaymentMethod;
import com.indice.erp.pos.shift.ShiftRecord;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CashClosingSettlementService {

    private static final BigDecimal ZERO = new BigDecimal("0.0000");

    private final CashClosingSettlementRepository repository;
    private final SettlementPolicyService policyService;
    private final TreasuryService treasuryService;

    public CashClosingSettlementService(
            CashClosingSettlementRepository repository,
            SettlementPolicyService policyService,
            TreasuryService treasuryService) {
        this.repository = repository;
        this.policyService = policyService;
        this.treasuryService = treasuryService;
    }

    @Transactional
    public List<CashClosingSettlement> settleClose(
            PosContext context,
            long closingId,
            ShiftRecord shift,
            CashRegisterRecord register,
            CashClosingAmounts amounts,
            BigDecimal countedCash) {
        var rules = policyService.ensureCompatibilityPolicy(context, register, shift.currencyCode());
        var byMethod = new EnumMap<PaymentMethod, SettlementRuleResponse>(PaymentMethod.class);
        rules.forEach(rule -> byMethod.put(PaymentMethod.valueOf(rule.paymentMethod()), rule));
        var amountsByMethod = new EnumMap<PaymentMethod, BigDecimal>(PaymentMethod.class);
        amounts.paymentsSummary().forEach(payment -> amountsByMethod.put(payment.paymentMethod(), payment.amount()));

        for (var paymentMethod : List.of(
                PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.TRANSFER, PaymentMethod.WALLET)) {
            var gross = money(amountsByMethod.getOrDefault(paymentMethod, ZERO));
            if (paymentMethod != PaymentMethod.CASH && gross.signum() <= 0) {
                continue;
            }
            var rule = byMethod.get(paymentMethod);
            if (rule == null || !rule.enabled() || rule.destinationPaymentAccountId() == null) {
                throw PosApiException.conflict("Cash register settlement policy is incomplete.");
            }
            var retainedLimit = money(register.retainedCashAmount());
            var retained = paymentMethod == PaymentMethod.CASH
                ? retainedLimit.min(money(countedCash)) : ZERO;
            var transferable = paymentMethod == PaymentMethod.CASH
                ? money(amounts.safeDropAmount().add(countedCash.subtract(retained).max(BigDecimal.ZERO)))
                : gross;
            if (transferable.signum() <= 0) {
                continue;
            }
            var deferred = "DEFERRED".equals(rule.settlementTiming());
            var settlement = repository.insert(
                context, closingId, shift.id(), register.id(), register.unitId(), register.businessId(),
                rule, gross, retained, transferable, deferred ? transferable : ZERO,
                deferred ? ZERO : transferable, deferred ? "PENDING" : "SETTLED",
                PosJsonSupport.toJson(Map.of(
                    "paymentMethod", rule.paymentMethod(),
                    "currencyCode", rule.currencyCode(),
                    "destinationPaymentAccountId", rule.destinationPaymentAccountId(),
                    "settlementTiming", rule.settlementTiming(),
                    "reviewStatus", rule.reviewStatus()
                ))
            );
            treasuryService.post(new TreasuryMovementCommand(
                context.companyId(), settlement.destinationPaymentAccountId(), register.unitId(), register.businessId(),
                settlement.currencyCode(), "POS", "CASH_CLOSING_SETTLEMENT", String.valueOf(settlement.id()),
                "POS_CLOSE:" + closingId + ":" + settlement.paymentMethod() + ":INITIAL",
                deferred ? ZERO : transferable, deferred ? transferable : ZERO,
                "Liquidación de corte POS · " + settlement.paymentMethod(), Instant.now(), context.userId(),
                null, "{\"cashClosingId\":" + closingId + "}"
            ));
        }
        return repository.findByClosing(context, closingId);
    }

    @Transactional(readOnly = true)
    public List<CashClosingSettlement> list(PosContext context, long closingId) {
        return repository.findByClosing(context, closingId);
    }

    @Transactional
    public CashClosingSettlement confirm(
            PosContext context,
            long closingId,
            long settlementId,
            ConfirmSettlementRequest request) {
        var settlement = repository.lockById(context, closingId, settlementId)
            .orElseThrow(() -> PosApiException.notFound("Cash closing settlement not found."));
        if (!"PENDING".equals(settlement.status())) {
            if (("SETTLED".equals(settlement.status()) || "RECONCILIATION_REQUIRED".equals(settlement.status()))
                    && settlement.settledAmount().compareTo(money(request.receivedAmount())) == 0) {
                return settlement;
            }
            throw PosApiException.conflict("Cash closing settlement is not pending.");
        }
        var received = money(request.receivedAmount());
        var variance = money(received.subtract(settlement.pendingAmount()));
        var note = normalizeNote(request.note());
        if (variance.signum() != 0 && note.length() < 8) {
            throw PosApiException.badRequest("A settlement difference requires a note of at least 8 characters.");
        }
        var status = variance.signum() == 0 ? "SETTLED" : "RECONCILIATION_REQUIRED";
        treasuryService.post(new TreasuryMovementCommand(
            context.companyId(), settlement.destinationPaymentAccountId(), settlement.unitId(), settlement.businessId(),
            settlement.currencyCode(), "POS", "CASH_CLOSING_CONFIRMATION", String.valueOf(settlement.id()),
            "POS_CLOSE:" + closingId + ":" + settlement.paymentMethod() + ":CONFIRM",
            received, settlement.pendingAmount().negate(),
            "Confirmación de liquidación POS · " + settlement.paymentMethod(), Instant.now(), context.userId(),
            null, PosJsonSupport.toJson(Map.of("note", note, "variance", variance))
        ));
        if (!repository.confirm(context, settlement, received, variance, status, note)) {
            throw PosApiException.conflict("Cash closing settlement changed while it was being confirmed.");
        }
        return repository.lockById(context, closingId, settlementId).orElseThrow();
    }

    private BigDecimal money(BigDecimal value) {
        return (value == null ? ZERO : value).setScale(4, RoundingMode.HALF_UP);
    }

    private String normalizeNote(String value) {
        return value == null ? "" : value.trim();
    }
}
