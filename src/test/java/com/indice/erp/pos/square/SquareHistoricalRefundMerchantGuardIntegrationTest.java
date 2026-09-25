package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SquareHistoricalRefundMerchantGuardIntegrationTest extends SquarePaymentDatabaseFixture {
    @Autowired SquareConnectionChangeGuard guard;
    @Test void completedRefundableSaleKeepsItsOriginalMerchant() {
        jdbc.update("""
            INSERT INTO pos_tickets
              (company_id,unit_id,business_id,warehouse_id,cash_register_id,shift_id,ticket_number,
               status,currency_code,subtotal_amount,total_amount,paid_amount,balance_amount,created_by_user_id)
            VALUES (?,?,?,?,?,?,'SQUARE-HISTORY','COMPLETED','CAD',10.50,10.50,10.50,0,?)
            """,company,unit,business,warehouse,register,shift,actor);
        jdbc.update("UPDATE pos_square_terminal_payment_intents SET pos_ticket_id=? WHERE id=? AND company_id=?",
            last("pos_tickets"),intent.id(),company);
        assertThatThrownBy(() -> guard.requireReplacementAllowed(company,"merchant-1","merchant-2"))
            .isInstanceOf(PosApiException.class).hasMessageContaining("original merchant");
    }
}
