package com.indice.erp.pos.restaurant;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosSqlSupport;
import com.indice.erp.pos.restaurant.RestaurantOrderDtos.RestaurantCheckoutLine;
import com.indice.erp.pos.restaurant.RestaurantOrderDtos.RestaurantCheckoutOrder;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class RestaurantTerminalCheckoutReader {
    private final JdbcTemplate jdbc;
    public RestaurantTerminalCheckoutReader(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }
    public RestaurantCheckoutOrder requireClaim(PosContext context, long id, long register, long shift) {
        var params = new java.util.ArrayList<Object>(java.util.Arrays.asList(context.companyId(), id, register, shift, context.userId()));
        PosSqlSupport.appendScopeParams(params, context.scope());
        var orders = jdbc.query("""
            SELECT o.id,o.company_id,o.settlement_cash_register_id,o.order_number,o.currency_code,o.claimed_by_user_id
            FROM pos_restaurant_orders o JOIN pos_cash_registers r ON r.id=o.settlement_cash_register_id AND r.company_id=o.company_id
            WHERE o.company_id=? AND o.id=? AND o.settlement_cash_register_id=?
              AND o.settlement_shift_id=? AND o.status='CLAIMED_FOR_CHECKOUT' AND o.claimed_by_user_id=?
              AND """ + PosSqlSupport.scopePredicate("r", context.scope()), (rs, row) -> new RestaurantCheckoutOrder(rs.getLong("id"), rs.getLong("company_id"),
                rs.getLong("settlement_cash_register_id"), rs.getString("order_number"), rs.getString("currency_code"),
                rs.getLong("claimed_by_user_id"), List.of()), params.toArray());
        if (orders.isEmpty()) throw PosApiException.conflict("Restaurant order is not claimed by this cashier and register.");
        var lines = jdbc.query("""
            SELECT product_id,sku_snapshot,product_name_snapshot,quantity,unit_price,line_total_amount
            FROM pos_restaurant_order_items WHERE company_id=? AND order_id=? AND status NOT IN ('CANCELLED','VOIDED')
            ORDER BY sort_order,id
            """, (rs, row) -> new RestaurantCheckoutLine(rs.getLong("product_id"), rs.getString("sku_snapshot"),
                rs.getString("product_name_snapshot"), rs.getBigDecimal("quantity"), rs.getBigDecimal("unit_price"),
                rs.getBigDecimal("line_total_amount")), context.companyId(), id);
        var order = orders.getFirst();
        return new RestaurantCheckoutOrder(order.id(), order.companyId(), order.cashRegisterId(), order.orderNumber(),
            order.currencyCode(), order.claimedByUserId(), List.copyOf(lines));
    }
}
