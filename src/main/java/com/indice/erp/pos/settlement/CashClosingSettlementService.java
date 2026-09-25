package com.indice.erp.pos.settlement;
import com.indice.erp.finance.treasury.TreasuryService;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.cashclosing.CashClosingAmounts;
import com.indice.erp.pos.cashregister.CashRegisterRecord;
import com.indice.erp.pos.shift.ShiftRecord;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CashClosingSettlementService {
    public record CashControl(int openShifts, Map<String, BigDecimal> retainedByCurrency) {}
    private final CashClosingSettlementRepository repository;
    private final ClosingSettlementCreation creation;
    private final SettlementConfirmation confirmation;
    @Autowired
    public CashClosingSettlementService(CashClosingSettlementRepository repository,
            SettlementPolicyService policy, TreasuryService treasury,
            TerminalRefundAdjustmentBalance refunds) {
        this.repository = repository;
        this.creation = new ClosingSettlementCreation(repository, policy, new ClosingSettlementWriter(repository, treasury));
        this.confirmation = new SettlementConfirmation(repository, treasury, refunds);
    }
    CashClosingSettlementService(CashClosingSettlementRepository repository,
            SettlementPolicyService policy, TreasuryService treasury) {
        this(repository, policy, treasury, null);
    }
    @Transactional(readOnly = true)
    public CashControl cashControl(long companyId) {
        return new CashControl(repository.openShifts(companyId), repository.retainedCash(companyId));
    }
    @Transactional
    public List<CashClosingSettlement> settleClose(PosContext context, long closingId, ShiftRecord shift,
            CashRegisterRecord register, CashClosingAmounts amounts, BigDecimal countedCash) {
        return creation.create(context, closingId, shift, register, amounts, countedCash);
    }
    @Transactional(readOnly = true)
    public List<CashClosingSettlement> list(PosContext context, long closingId) {
        return repository.findByClosing(context, closingId);
    }
    @Transactional
    public CashClosingSettlement confirm(PosContext context, long closingId, long id, ConfirmSettlementRequest request) {
        return confirmation.confirm(context, closingId, id, request);
    }
}
