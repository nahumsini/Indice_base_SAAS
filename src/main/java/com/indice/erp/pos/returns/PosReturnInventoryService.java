package com.indice.erp.pos.returns;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.ticket.TicketRecord;
import com.indice.erp.pos.ticket.TicketRepository;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class PosReturnInventoryService {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final TicketRepository tickets;
    private final FinanceBusinessTimeZoneResolver timezones;
    public PosReturnInventoryService(JdbcTemplate jdbc, ObjectMapper json, TicketRepository tickets,
            FinanceBusinessTimeZoneResolver timezones) {
        this.jdbc = jdbc; this.json = json; this.tickets = tickets; this.timezones = timezones;
    }

    void snapshot(PosContext context, long returnId, TicketRecord ticket) {
        try {
            var source = jdbc.queryForObject("SELECT sale_lines_json FROM sales_records WHERE company_id = ? AND id = ?",
                    String.class, context.companyId(), ticket.salesRecordId());
            var lines = json.readTree(source == null ? "[]" : source);
            var items = tickets.findItems(context, ticket.id());
            if (!lines.isArray() || lines.size() != items.size()) throw PosApiException.conflict("El ticket no conserva sus partidas originales.");
            int stockLines = 0;
            for (int i = 0; i < lines.size(); i++) {
                var line = lines.get(i);
                if (!line.path("stockTracked").asBoolean()) continue;
                stockLines++;
                var item = items.get(i);
                var moves = jdbc.queryForList("""
                    SELECT id, quantity, product_id, from_warehouse_id FROM sales_inventory_movements
                    WHERE company_id = ? AND movement_type = 'POS_SALE_OUT' AND status = 'posted'
                      AND deleted_at IS NULL
                      AND CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.posTicketItemId')) AS UNSIGNED) = ?
                    """, context.companyId(), item.id());
                if (moves.size() != 1 || !line.path("unitCost").isNumber()
                        || line.path("unitCost").decimalValue().signum() < 0
                        || !"INVENTORY_BALANCE".equals(line.path("costSource").asText())
                        || !line.path("costCurrency").asText().matches("[A-Z]{3}"))
                    throw PosApiException.conflict("Falta evidencia del costo o movimiento original de inventario.");
                var move = moves.getFirst();
                if (((Number) move.get("product_id")).longValue() != item.productId()
                        || ((Number) move.get("from_warehouse_id")).longValue() != ticket.warehouseId()
                        || ((BigDecimal) move.get("quantity")).compareTo(item.quantity()) != 0)
                    throw PosApiException.conflict("El movimiento original no coincide con el ticket.");
                jdbc.update("""
                    INSERT INTO pos_return_items (company_id, return_id, movement_id, quantity, unit_cost, cost_currency)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """, context.companyId(), returnId, move.get("id"), item.quantity(),
                    line.path("unitCost").decimalValue(), line.path("costCurrency").asText());
            }
            int movements = jdbc.queryForObject("""
                SELECT COUNT(*) FROM sales_inventory_movements WHERE company_id = ? AND movement_type = 'POS_SALE_OUT'
                  AND status = 'posted' AND deleted_at IS NULL
                  AND CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.posTicketId')) AS UNSIGNED) = ?
                """, Integer.class, context.companyId(), ticket.id());
            if (movements != stockLines) throw PosApiException.conflict("El inventario original requiere conciliación.");
        } catch (com.fasterxml.jackson.core.JsonProcessingException exception) {
            throw PosApiException.conflict("No se pueden interpretar las partidas originales del ticket.");
        }
    }

    void restore(PosContext context, long returnId) {
        var movements = jdbc.queryForList("""
            SELECT movement.*, item.quantity return_quantity, item.unit_cost return_cost,
              item.cost_currency return_currency, product.currency current_currency, product.deleted_at product_deleted
            FROM pos_return_items item JOIN sales_inventory_movements movement
              ON movement.company_id = item.company_id AND movement.id = item.movement_id
            JOIN sales_products product ON product.company_id = movement.company_id AND product.id = movement.product_id
            WHERE item.company_id = ? AND item.return_id = ? ORDER BY movement.id
            """, context.companyId(), returnId);
        var date = LocalDate.now(timezones.resolve(context.companyId()));
        for (var move : movements) {
            if (move.get("product_deleted") != null || !move.get("return_currency").equals(move.get("current_currency")))
                throw PosApiException.conflict("El producto o la moneda del costo cambiaron. El inventario requiere conciliación antes de completar la devolución.");
            int changed = jdbc.update("""
                UPDATE sales_inventory_balances SET
                  unit_cost = ((available_quantity * unit_cost) + (? * ?)) / (available_quantity + ?),
                  available_quantity = available_quantity + ?, last_movement_at = ?, updated_by_user_id = ?,
                  updated_at = CURRENT_TIMESTAMP
                WHERE company_id = ? AND product_id = ? AND warehouse_id = ? AND deleted_at IS NULL
                  AND available_quantity >= 0 AND unit_cost >= 0
                """, move.get("return_quantity"), move.get("return_cost"), move.get("return_quantity"),
                move.get("return_quantity"), date, context.userId(), context.companyId(), move.get("product_id"), move.get("from_warehouse_id"));
            if (changed != 1) throw PosApiException.conflict("No se pudo restituir el inventario al almacén original. La devolución sigue pendiente.");
            jdbc.update("""
                INSERT INTO sales_inventory_movements
                  (company_id, movement_number, group_id, product_id, product_name, product_sku, movement_type,
                   quantity, unit_cost, to_warehouse_id, to_warehouse_name, business_unit_id, business_id,
                   reason, reference, movement_date, status, metadata_json, created_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, 'POS_SALE_RETURN', ?, ?, ?, ?, ?, ?, 'POS full return', ?, ?, 'posted',
                    JSON_OBJECT('source', 'POS_RETURN', 'returnId', ?, 'reversalOfMovementId', ?), ?)
                """, context.companyId(), "POSR-" + returnId + "-" + move.get("id"), "POSR-" + returnId,
                move.get("product_id"), move.get("product_name"), move.get("product_sku"), move.get("return_quantity"),
                move.get("return_cost"), move.get("from_warehouse_id"), move.get("from_warehouse_name"),
                move.get("business_unit_id"), move.get("business_id"), move.get("reference"), date, returnId,
                move.get("id"), context.userId());
        }
    }
}
