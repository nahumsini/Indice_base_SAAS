package com.indice.erp.pos.mercadopago;
import static org.junit.jupiter.api.Assertions.*;
import com.indice.erp.finance.shared.*;
import com.indice.erp.finance.terminalrefunds.TerminalRefundAdjustmentService;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.*;

class MercadoPagoClosedRefundAccountingIntegrationTest extends MpFinancialDatabaseFixture {
    @Test void confirmedClosedRefundRequiresOwnerThenPostsExactlyOnceToPendingTreasury() {
        MpClosedRefundAccountingSeed.create(this);
        assertTrue(application.getBean(MpEvidenceApplication.class).apply(observed, partialRefund()));
        var context = new FinanceContext(actorId, companyId, "Synthetic owner", "admin", true,
            FinanceScope.corporateOffice());
        var service = application.getBean(TerminalRefundAdjustmentService.class);
        var pending = service.list(context, null).getFirst();
        assertEquals("PENDING_REVIEW", pending.state());
        assertEquals(0, pending.amount().compareTo(new BigDecimal("10.0000")));
        var approved = service.approve(context, pending.id(), "Provider refund verified", pending.version());
        var posted = service.post(context, approved.id(), approved.version());
        assertEquals("POSTED", posted.state());
        assertEquals("PENDING", posted.postingBalance());
        assertEquals(0, jdbc.queryForObject("SELECT pending_balance FROM finance_payment_accounts WHERE company_id=? AND id=?",
            BigDecimal.class, companyId, posted.paymentAccountId()).compareTo(new BigDecimal("60.0000")));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM finance_payment_account_movements WHERE company_id=? "
            + "AND event_key=?", Integer.class, companyId, "POS_REFUND_ADJUSTMENT:" + posted.id()));
        assertEquals("POSTED", service.post(context, posted.id(), approved.version()).state());
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM finance_payment_account_movements WHERE company_id=? "
            + "AND event_key=?", Integer.class, companyId, "POS_REFUND_ADJUSTMENT:" + posted.id()));
        assertEquals(3, jdbc.queryForObject("SELECT COUNT(*) FROM pos_terminal_refund_adjustment_events "
            + "WHERE company_id=? AND adjustment_id=?", Integer.class, companyId, posted.id()));
    }
    @Test @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void failedTreasuryPostRollsBackMovementAndPersistsRetryableFailure() {
        MpClosedRefundAccountingSeed.create(this);
        assertTrue(application.getBean(MpEvidenceApplication.class).apply(observed, partialRefund()));
        var context = new FinanceContext(actorId, companyId, "Synthetic owner", "admin", true, FinanceScope.corporateOffice());
        var service = application.getBean(TerminalRefundAdjustmentService.class);
        var pending = service.list(context, null).getFirst();
        var approved = service.approve(context, pending.id(), "Provider refund verified", pending.version());
        jdbc.update("UPDATE finance_payment_accounts SET status='INACTIVE' WHERE company_id=? AND id=?",
            companyId, approved.paymentAccountId());
        var failed = service.post(context, approved.id(), approved.version());
        assertEquals("FAILED", failed.state());
        assertEquals("CONFLICT", failed.failureCode());
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM finance_payment_account_movements WHERE company_id=? "
            + "AND event_key=?", Integer.class, companyId, "POS_REFUND_ADJUSTMENT:" + failed.id()));
    }
}
