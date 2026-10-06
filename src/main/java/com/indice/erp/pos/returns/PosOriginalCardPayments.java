package com.indice.erp.pos.returns;
import com.indice.erp.pos.*;
import java.math.BigDecimal;
import org.springframework.jdbc.core.JdbcTemplate;
/** Verified original provider identity; no replacement tender or client-supplied merchant. */
final class PosOriginalCardPayments {
    private final JdbcTemplate jdbc;
    PosOriginalCardPayments(JdbcTemplate jdbc){this.jdbc=jdbc;}
    record Payment(String provider,long intentId,String paymentId){}
    Payment require(PosContext ctx,long ticket,BigDecimal amount,String currency){
        var rows=jdbc.query("SELECT 'SQUARE' provider,id,square_payment_id payment FROM pos_square_terminal_payment_intents WHERE company_id=? AND pos_ticket_id=? AND status='APPROVED' AND amount=? AND currency_code=? AND square_payment_id IS NOT NULL UNION ALL SELECT 'MERCADO_PAGO' provider,id,payment_id payment FROM pos_mercado_pago_payment_intents WHERE company_id=? AND pos_ticket_id=? AND status='APPROVED' AND amount=? AND currency_code='MXN' AND currency_code=? AND payment_id IS NOT NULL AND order_id IS NOT NULL",
            (rs,n)->new Payment(rs.getString("provider"),rs.getLong("id"),rs.getString("payment")),ctx.companyId(),ticket,amount,currency,ctx.companyId(),ticket,amount,currency);
        if(rows.size()!=1)throw PosApiException.conflict("Se requiere exactamente un pago Square verificable o Mercado Pago Point verificable del ticket original.");return rows.getFirst();
    }
}
