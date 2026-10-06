package com.indice.erp.pos.settlement;

import com.indice.erp.finance.treasury.TreasuryService;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.cashclosing.CashClosingAmounts;
import com.indice.erp.pos.cashregister.CashRegisterRecord;
import com.indice.erp.pos.status.PaymentMethod;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Pure counterpart of the closing writer; missing system accounts are disclosed, never created. */
@Service
public class ClosingSettlementPreview {
    public record Effect(String paymentMethod,String currency,BigDecimal gross,BigDecimal refunded,BigDecimal retained,
        BigDecimal transferable,Long destinationAccountId,String destinationName,String timing,boolean createsSystemAccount,
        BigDecimal destinationAvailable,BigDecimal destinationPending,String reviewStatus) {}
    private final SettlementPolicyService policies;private final TreasuryService treasury;
    public ClosingSettlementPreview(SettlementPolicyService policies,TreasuryService treasury){this.policies=policies;this.treasury=treasury;}
    @Transactional(readOnly=true)
    public List<Effect> inspect(PosContext ctx,CashRegisterRecord register,String currency,CashClosingAmounts amounts,BigDecimal counted){
        var rules=new EnumMap<PaymentMethod,SettlementRuleResponse>(PaymentMethod.class);
        policies.list(ctx,register.id()).stream().filter(r->currency.equals(r.currencyCode())).forEach(r->rules.put(PaymentMethod.valueOf(r.paymentMethod()),r));
        var accounts=treasury.listEligibleAccounts(ctx.companyId(),currency,register.unitId(),register.businessId());var effects=new ArrayList<Effect>();
        for(var method:List.of(PaymentMethod.CASH,PaymentMethod.CARD,PaymentMethod.TRANSFER,PaymentMethod.WALLET)){
            var gross=amounts.paymentsSummary().stream().filter(v->v.paymentMethod()==method).map(v->v.amount()).reduce(BigDecimal.ZERO,BigDecimal::add);
            var transfer=ClosingSettlementTransfer.calculate(method,gross,register,amounts,counted);
            if(method!=PaymentMethod.CASH&&transfer.gross().signum()<=0)continue;
            var rule=rules.get(method);Long accountId=null;String name,timing,review;boolean creates=false;
            if(rule!=null){if(!rule.enabled()||rule.destinationPaymentAccountId()==null)throw PosApiException.conflict("Closing destination policy is incomplete.");accountId=rule.destinationPaymentAccountId();name=rule.destinationPaymentAccountName();timing=rule.settlementTiming();review=rule.reviewStatus();}
            else {String key=method==PaymentMethod.CASH?"UNIVERSAL_CASH:"+currency:"POS_UNASSIGNED_"+method+":"+currency;
                var existing=accounts.stream().filter(a->key.equals(a.systemKey())).findFirst();accountId=existing.map(a->a.id()).orElse(null);
                name=existing.map(a->a.name()).orElse(method==PaymentMethod.CASH?"Efectivo universal · "+currency+" · Índice":"Cobros POS por asignar · "+method+" · "+currency);
                timing=method==PaymentMethod.CASH?"IMMEDIATE":"DEFERRED";review=method==PaymentMethod.CASH?"READY":"NEEDS_REVIEW";creates=existing.isEmpty();}
            BigDecimal available=null,pending=null;
            if(accountId!=null){var allowed=method==PaymentMethod.CASH?Set.of("CASH","BANK"):method==PaymentMethod.CARD?Set.of("BANK","CREDIT_CARD"):Set.of("BANK");var account=treasury.requireEligibleAccount(ctx.companyId(),accountId,currency,register.unitId(),register.businessId(),allowed);available=account.availableBalance();pending=account.pendingBalance();}
            if(transfer.transferable().signum()>0)effects.add(new Effect(method.name(),currency,transfer.gross(),amounts.refunded(method),transfer.retained(),transfer.transferable(),accountId,name,timing,creates,available,pending,review));
        }
        return List.copyOf(effects);
    }
}
