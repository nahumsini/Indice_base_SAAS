package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@lombok.RequiredArgsConstructor
public class MpRefundOutstanding {
    private final JdbcTemplate jdbc;

    public void assertNone(MpIntent intent) {
        assertNone(intent, true);
    }
    public void inspectNone(MpIntent intent) {
        assertNone(intent, false);
    }
    private void assertNone(MpIntent intent,boolean lock) {
        var count=jdbc.queryForObject("SELECT COUNT(*) FROM pos_returns WHERE company_id=? AND ticket_id=? AND status<>'CANCELLED'",Integer.class,intent.companyId(),intent.posTicketId());
        if(count!=null&&count>0)throw PosApiException.conflict("An original-tender return already owns this ticket.");
        requireNoPending(intent,lock);
    }
    public void assertOriginalReturn(com.indice.erp.pos.PosContext ctx,MpIntent intent,MpRefundRequest request,long returnId){new MpOriginalReturnAdmission(jdbc).require(ctx,intent,request,returnId);requireNoPending(intent);}
    private void requireNoPending(MpIntent intent){
        requireNoPending(intent,true);
    }
    private void requireNoPending(MpIntent intent,boolean lock){
        var pending = jdbc.queryForList("SELECT id FROM pos_mercado_pago_refund_requests "
            + "WHERE company_id=? AND intent_id=? "
            + "AND status IN ('WAITING','SUBMITTING','PENDING','UNCERTAIN',"
            + "'RECONCILIATION_REQUIRED','DEAD_LETTER')" + (lock ? " FOR UPDATE" : ""),
            Long.class, intent.companyId(), intent.id());
        if (!pending.isEmpty()) {
            throw PosApiException.conflict("Recover the unresolved refund before submitting another refund.");
        }
    }
}
