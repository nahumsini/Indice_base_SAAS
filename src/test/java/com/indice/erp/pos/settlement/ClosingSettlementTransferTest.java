package com.indice.erp.pos.settlement;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.cashclosing.CashClosingAmounts;
import com.indice.erp.pos.cashregister.CashRegisterRecord;
import com.indice.erp.pos.status.CashRegisterStatus;
import com.indice.erp.pos.status.PaymentMethod;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class ClosingSettlementTransferTest {
    private CashRegisterRecord register() {
        return new CashRegisterRecord(20L, 1L, 5L, 6L, 30L, "Warehouse", "REG", "Register", CashRegisterStatus.ACTIVE,
            true, null, BigDecimal.ZERO, 10L, null, null, null, null, 0L, null, null);
    }
    private CashClosingAmounts amounts(String refunds) {
        return new CashClosingAmounts(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
            BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("100"), new BigDecimal(refunds), 1, List.of());
    }
    @Test
    void verifiedPartialRefundReducesCardTransferAndPreservesGross() {
        var transfer = ClosingSettlementTransfer.calculate(PaymentMethod.CARD, new BigDecimal("100"),
            register(), amounts("25"), BigDecimal.ZERO);
        assertThat(transfer.gross()).isEqualByComparingTo("100");
        assertThat(transfer.transferable()).isEqualByComparingTo("75");
        assertThat(amounts("25").totalSalesAmount()).isEqualByComparingTo("100");
    }
    @Test
    void fullRefundLeavesNoCardTransfer() {
        assertThat(ClosingSettlementTransfer.calculate(PaymentMethod.CARD, new BigDecimal("100"),
            register(), amounts("100"), BigDecimal.ZERO).transferable()).isEqualByComparingTo("0");
    }
    @Test
    void refundGreaterThanCapturedCardGrossFailsClosed() {
        assertThatThrownBy(() -> ClosingSettlementTransfer.calculate(PaymentMethod.CARD, new BigDecimal("100"),
            register(), amounts("101"), BigDecimal.ZERO)).isInstanceOf(PosApiException.class);
    }
}
