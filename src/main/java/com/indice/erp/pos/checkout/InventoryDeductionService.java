package com.indice.erp.pos.checkout;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosJsonSupport;
import com.indice.erp.pos.shift.ShiftRecord;
import com.indice.erp.pos.ticket.TicketItemRecord;
import com.indice.erp.pos.ticket.TicketRecord;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class InventoryDeductionService {

    private final InventoryDeductionRepository repository;

    public InventoryDeductionService(InventoryDeductionRepository repository) {
        this.repository = repository;
    }

    public List<Map<String, Object>> salesLineSnapshots(PosContext context, ShiftRecord shift, List<CheckoutLine> lines) {
        var snapshots = new java.util.ArrayList<Map<String, Object>>();
        for (var line : lines) {
            var snapshot = new java.util.LinkedHashMap<String, Object>();
            snapshot.put("productId", line.productId());
            snapshot.put("productNameSnapshot", line.productNameSnapshot());
            snapshot.put("skuSnapshot", line.skuSnapshot());
            snapshot.put("productTypeSnapshot", line.productTypeSnapshot());
            snapshot.put("quantity", line.quantity());
            snapshot.put("unitPrice", line.unitPrice());
            snapshot.put("discountAmount", line.discountAmount());
            snapshot.put("taxAmount", line.taxAmount());
            snapshot.put("lineTotalAmount", line.lineTotalAmount());
            snapshot.put("subtotal", line.lineTotalAmount().subtract(line.taxAmount()));
            snapshot.put("currencyCode", line.currencyCode());
            snapshot.put("stockTracked", line.stockTracked());
            if (line.stockTracked() && line.productId() != null) {
                snapshot.putAll(repository.costSnapshot(context, shift.warehouseId(), line.productId()));
            } else {
                // Services/manual lines do not consume inventory; payroll/expenses retain their own cost ownership.
                snapshot.put("unitCost", java.math.BigDecimal.ZERO);
                snapshot.put("costCurrency", line.currencyCode());
                snapshot.put("costSource", "NO_INVENTORY_CONSUMPTION");
            }
            snapshots.add(snapshot);
        }
        return snapshots;
    }

    public boolean deduct(
            PosContext context,
            ShiftRecord shift,
            TicketRecord ticket,
            List<CheckoutLine> lines,
            List<TicketItemRecord> items) {
        if (lines.size() != items.size()) {
            throw PosApiException.conflict("POS ticket items could not be matched for inventory deduction.");
        }
        if (lines.stream().noneMatch(line -> line.stockTracked() && line.productId() != null)) {
            return false;
        }

        var warehouseName = repository.warehouseName(context, shift.warehouseId());
        var deducted = false;

        for (var index = 0; index < lines.size(); index++) {
            var line = lines.get(index);
            if (!line.stockTracked() || line.productId() == null) {
                continue;
            }

            var item = items.get(index);
            var updated = repository.deductAvailable(context, shift.warehouseId(), line.productId(), line.quantity());
            if (!updated) {
                throw PosApiException.badRequest(
                    "Insufficient stock for " + line.productNameSnapshot() + " in selected warehouse.");
            }

            repository.insertMovement(context, movementCommand(
                shift, ticket, item, line, warehouseName, index + 1
            ));
            deducted = true;
        }

        return deducted;
    }

    public void requireAvailable(PosContext context, ShiftRecord shift, List<CheckoutLine> lines) {
        for (var line : lines) {
            if (!line.stockTracked() || line.productId() == null) {
                continue;
            }
            if (!repository.hasAvailable(context, shift.warehouseId(), line.productId(), line.quantity())) {
                throw PosApiException.badRequest(
                    "Insufficient stock for " + line.productNameSnapshot() + " in selected warehouse.");
            }
        }
    }

    private InventoryMovementCommand movementCommand(
            ShiftRecord shift,
            TicketRecord ticket,
            TicketItemRecord item,
            CheckoutLine line,
            String warehouseName,
            int index) {
        return new InventoryMovementCommand(
            movementNumber(ticket.id(), index),
            ticket.ticketNumber(),
            line.productId(),
            line.productNameSnapshot(),
            line.skuSnapshot(),
            line.quantity(),
            shift.warehouseId(),
            warehouseName,
            shift.unitId(),
            shift.businessId(),
            ticket.ticketNumber(),
            null,
            PosJsonSupport.toJson(Map.of(
                "source", "POS_CHECKOUT",
                "posTicketId", ticket.id(),
                "posTicketItemId", item.id(),
                "ticketNumber", ticket.ticketNumber()
            ))
        );
    }

    private String movementNumber(long ticketId, int index) {
        return "POSO-" + ticketId + "-" + index;
    }
}
