package com.indice.erp.finance.reporting;

import com.indice.erp.exchange.BusinessExchangeRateEvidence;
import com.indice.erp.exchange.BusinessExchangeRateSnapshotRepository;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Reconstructs weighted historical functional cost from immutable receipt and stock movement evidence. */
@Service
class HistoricalInventoryCost {
    private final JdbcTemplate jdbc;
    private final BusinessExchangeRateSnapshotRepository snapshots;
    private final FinanceBusinessTimeZoneResolver timezones;
    HistoricalInventoryCost(JdbcTemplate jdbc, BusinessExchangeRateSnapshotRepository snapshots, FinanceBusinessTimeZoneResolver timezones) {
        this.jdbc = jdbc; this.snapshots = snapshots; this.timezones = timezones;
    }

    Valuation sale(long company, long sale, String nativeCurrency, String functionalCurrency, BigDecimal expectedNative) {
        var targets = jdbc.queryForList("""
            SELECT movement.id, movement.product_id, movement.from_warehouse_id
            FROM sales_inventory_movements movement JOIN sales_products product
              ON product.company_id = movement.company_id AND product.id = movement.product_id
            LEFT JOIN pos_tickets ticket ON ticket.company_id = movement.company_id
              AND ticket.id = CAST(JSON_UNQUOTE(JSON_EXTRACT(movement.metadata_json, '$.posTicketId')) AS UNSIGNED)
            WHERE movement.company_id = ? AND product.currency = ? AND movement.deleted_at IS NULL
              AND (CAST(JSON_UNQUOTE(JSON_EXTRACT(movement.metadata_json, '$.saleId')) AS UNSIGNED) = ?
                OR ticket.sales_record_id = ?)
              AND movement.movement_type IN ('sale', 'POS_SALE_OUT')
              AND movement.status IN ('completed', 'posted') ORDER BY movement.id
            """, company, nativeCurrency, sale, sale);
        if (targets.isEmpty()) throw missing();
        var evidence = new LinkedHashMap<String, Object>();
        BigDecimal functional = BigDecimal.ZERO, nativeTotal = BigDecimal.ZERO;
        for (var target : targets) {
            long targetId = ((Number) target.get("id")).longValue();
            var movements = jdbc.queryForList("""
                SELECT movement.id, movement.movement_type, movement.quantity, movement.unit_cost,
                  movement.created_at, movement.metadata_json, receipt.created_at receipt_date, receipt.currency_code receipt_currency
                FROM sales_inventory_movements movement
                LEFT JOIN pos_inventory_receipts receipt ON receipt.company_id = movement.company_id
                  AND receipt.id = CAST(JSON_UNQUOTE(JSON_EXTRACT(movement.metadata_json, '$.receiptId')) AS UNSIGNED)
                  AND receipt.status IN ('POSTED', 'REVERSED')
                WHERE movement.company_id = ? AND movement.product_id = ? AND movement.id <= ?
                  AND (movement.from_warehouse_id = ? OR movement.to_warehouse_id = ?)
                  AND movement.deleted_at IS NULL AND movement.status IN ('completed', 'posted') ORDER BY movement.id
                """, company, target.get("product_id"), targetId, target.get("from_warehouse_id"), target.get("from_warehouse_id"));
            BigDecimal quantity = BigDecimal.ZERO, nativeUnit = BigDecimal.ZERO, carrying = BigDecimal.ZERO;
            var consumed = new java.util.HashMap<Long, BigDecimal[]>();
            for (var movement : movements) {
                long id = ((Number) movement.get("id")).longValue();
                String type = String.valueOf(movement.get("movement_type"));
                BigDecimal qty = (BigDecimal) movement.get("quantity"), cost = (BigDecimal) movement.get("unit_cost");
                if (qty == null || qty.signum() <= 0) throw missing();
                if ("POS_PAID_RECEIPT_IN".equals(type) || "POS_PAID_RECEIPT_REVERSAL".equals(type)) {
                    if (movement.get("receipt_date") == null || !nativeCurrency.equalsIgnoreCase(String.valueOf(movement.get("receipt_currency"))) || cost == null) throw missing();
                    var date = databaseInstant(movement.get("receipt_date")).atZone(timezones.resolve(company)).toLocalDate();
                    var rate = rate(nativeCurrency, functionalCurrency, date, evidence);
                    boolean incoming = "POS_PAID_RECEIPT_IN".equals(type);
                    var delta = incoming ? qty : qty.negate();
                    BigDecimal next = quantity.add(delta);
                    if (next.signum() < 0) throw missing();
                    BigDecimal nativeValue = quantity.multiply(nativeUnit).add(delta.multiply(cost));
                    carrying = carrying.add(delta.multiply(cost).multiply(rate));
                    if (nativeValue.signum() < 0 || carrying.signum() < 0) throw missing();
                    nativeUnit = next.signum() == 0 ? BigDecimal.ZERO : nativeValue.divide(next, 4, RoundingMode.HALF_UP);
                    quantity = next;
                } else if ("sale".equals(type) || "POS_SALE_OUT".equals(type)) {
                    if (quantity.compareTo(qty) < 0) throw missing();
                    BigDecimal nativeCost = qty.multiply(nativeUnit).setScale(4, RoundingMode.HALF_UP);
                    BigDecimal functionalCost = carrying.multiply(qty).divide(quantity, 4, RoundingMode.HALF_UP);
                    consumed.put(id, new BigDecimal[]{nativeCost, functionalCost});
                    if (id == targetId) { nativeTotal = nativeTotal.add(nativeCost); functional = functional.add(functionalCost); }
                    quantity = quantity.subtract(qty); carrying = carrying.subtract(functionalCost);
                } else if ("sale_return".equals(type)) {
                    Long original;
                    try { original = new com.fasterxml.jackson.databind.ObjectMapper().readTree(String.valueOf(movement.get("metadata_json"))).path("reversalOfMovementId").longValue(); }
                    catch (Exception error) { throw missing(); }
                    var prior = consumed.get(original); if (prior == null) throw missing();
                    var next = quantity.add(qty);
                    nativeUnit = quantity.multiply(nativeUnit).add(prior[0]).divide(next, 4, RoundingMode.HALF_UP);
                    quantity = next; carrying = carrying.add(prior[1]);
                } else throw missing();
            }
        }
        if (nativeTotal.subtract(expectedNative).abs().compareTo(new BigDecimal("0.0100")) > 0) throw missing();
        return new Valuation(functional, Map.copyOf(evidence));
    }

    private BigDecimal rate(String source, String target, LocalDate date, Map<String, Object> evidence) {
        var snapshot = snapshots.find(date).or(() -> snapshots.findLatestBefore(date)).orElseThrow(HistoricalInventoryCost::missing);
        var rates = BusinessExchangeRateEvidence.verifiedRates(snapshot, date, false);
        if (!rates.containsKey(source) || !rates.containsKey(target)) throw missing();
        var rate = rates.get(target).divide(rates.get(source), 12, RoundingMode.HALF_UP);
        evidence.put(date + ":" + source + ":" + target, Map.of("acquisitionDate", date.toString(), "rate", rate, "sources", snapshot.sources()));
        return rate;
    }
    private static AccountingCurrencyConversion.MissingRecognition missing() {
        return new AccountingCurrencyConversion.MissingRecognition("Falta costo histórico verificable del inventario en moneda funcional. Revisa aperturas, entradas y movimientos del producto; no se sustituirá por el tipo de cambio de la venta.");
    }
    record Valuation(BigDecimal functionalCost, Map<String, Object> evidence) {}
    private static java.time.Instant databaseInstant(Object value) {
        return value instanceof java.sql.Timestamp timestamp ? timestamp.toInstant()
            : ((java.time.LocalDateTime) value).toInstant(java.time.ZoneOffset.UTC);
    }

}
