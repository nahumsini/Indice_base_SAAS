package com.indice.erp.pos.purchaseorder;

import com.indice.erp.finance.FinanceApiException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Procurement's read/lock contract for removal of a linked financial obligation. */
@Service
public class PurchaseOrderExpensePolicy {
    private final JdbcTemplate jdbc;

    public PurchaseOrderExpensePolicy(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public void requireUnreceived(long companyId, long orderId) {
        var statuses = jdbc.queryForList("SELECT status FROM pos_purchase_orders WHERE company_id = ? AND id = ? FOR UPDATE",
            String.class, companyId, orderId);
        if (statuses.isEmpty()) throw FinanceApiException.conflict("The linked purchase order is unavailable.");
        boolean received = jdbc.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM pos_purchase_order_items
              WHERE company_id = ? AND purchase_order_id = ? AND received_quantity > 0)
            OR EXISTS(SELECT 1 FROM pos_purchase_receipts WHERE company_id = ? AND purchase_order_id = ?)
            """, Boolean.class, companyId, orderId, companyId, orderId);
        if (received || java.util.Set.of("PARTIALLY_RECEIVED", "RECEIVED", "CLOSED").contains(statuses.getFirst()))
            throw FinanceApiException.conflict("Expenses linked to a received purchase order cannot be deleted.");
    }
}
