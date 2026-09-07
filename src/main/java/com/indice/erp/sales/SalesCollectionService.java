package com.indice.erp.sales;

import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import com.indice.erp.finance.treasury.TreasuryMovementCommand;
import com.indice.erp.finance.treasury.TreasuryService;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Commercial payment confirmation owns one native-currency Treasury event per sale. */
@Service
class SalesCollectionService {
    private final JdbcTemplate jdbc;
    private final TreasuryService treasury;
    private final FinanceBusinessTimeZoneResolver timezones;

    SalesCollectionService(JdbcTemplate jdbc, TreasuryService treasury, FinanceBusinessTimeZoneResolver timezones) {
        this.jdbc = jdbc;
        this.treasury = treasury;
        this.timezones = timezones;
    }

    void apply(long companyId, long userId, long saleId, Map<String, Object> before, Map<String, Object> after) {
        // POS owns ticket settlement and Cartera owns installment collection.
        if (count("SELECT COUNT(*) FROM pos_tickets WHERE company_id = ? AND sales_record_id = ?", companyId, saleId) > 0) {
            if (before != null && (!Objects.equals(before.get("commercialStatus"), after.get("commercialStatus"))
                    || !Objects.equals(before.get("financeStatus"), after.get("financeStatus")))) {
                throw new IllegalArgumentException("Administra el cobro y la cancelación del ticket desde POS.");
            }
            return;
        }
        var activeCredits = jdbc.queryForList("SELECT original_amount FROM finance_receivable_accounts WHERE company_id = ? AND sales_record_id = ? AND deleted_at IS NULL AND status <> 'CANCELLED'", companyId, saleId);
        if (cancelled(after) && !activeCredits.isEmpty()) throw new IllegalArgumentException("La venta tiene crédito en Cartera. Resuelve su cuenta y sus abonos antes de cancelar; no se eliminará la deuda.");
        String key = "SALES:COLLECTION:" + saleId;
        var movements = jdbc.queryForList("""
            SELECT id, payment_account_id, available_delta, currency_code, unit_id, business_id
            FROM finance_payment_account_movements WHERE company_id = ? AND event_key = ?
            """, companyId, key);
        if (!movements.isEmpty()) {
            if (before != null) for (String field : List.of("totalAmount", "taxTotal", "subtotal", "discountTotal",
                    "currency", "saleDate", "unitId", "businessId", "paymentMethod", "saleLines")) {
                if (!equivalent(before.get(field), after.get(field))) {
                    throw new IllegalArgumentException("La venta cobrada conserva importes, moneda, fecha, partidas y alcance. Cancélala antes de emitir una venta corregida.");
                }
            }
            var movement = movements.getFirst();
            if (cancelled(after)) {
                treasury.post(new TreasuryMovementCommand(companyId, number(movement.get("payment_account_id")),
                    nullableNumber(movement.get("unit_id")), nullableNumber(movement.get("business_id")),
                    String.valueOf(movement.get("currency_code")), "SALES", "SALE_COLLECTION_REVERSAL", String.valueOf(saleId),
                    key + ":REVERSAL", ((BigDecimal) movement.get("available_delta")).negate(), BigDecimal.ZERO,
                    "Cancelación de cobro de venta " + saleId, Instant.now(), userId, number(movement.get("id")), null));
            } else if (!confirmed(after) || (before != null && cancelled(before))) {
                throw new IllegalArgumentException("Un cobro confirmado solo puede conservarse o cancelarse; emite otra venta para reemplazarlo.");
            }
            return;
        }
        // An old approved record is evidence of prior activity, never authorization to invent a new cash deposit.
        if (!confirmed(after) || (before != null && confirmed(before) && !Set.of("credit", "credito", "crédito").contains(token(before, "paymentMethod")))) return;
        String method = token(after, "paymentMethod");

        if (method.isBlank()) throw new IllegalArgumentException("Selecciona el método de cobro antes de aprobar Finanzas.");
        BigDecimal amount = SalesPayloadSupport.decimalValue(after, "totalAmount");
        if (amount == null || amount.signum() <= 0) throw new IllegalArgumentException("El cobro debe tener un importe positivo.");
        if (!activeCredits.isEmpty()) {
            BigDecimal financed = (BigDecimal) activeCredits.getFirst().get("original_amount");
            amount = amount.subtract(financed);
            if (amount.signum() < 0) throw new IllegalArgumentException("El crédito no puede superar el total de la venta.");
            if (amount.signum() == 0) return;
            if (Set.of("credit", "credito", "crédito").contains(method)) throw new IllegalArgumentException("Selecciona el método y la cuenta del anticipo antes de confirmar su cobro.");
        } else if (Set.of("credit", "credito", "crédito").contains(method)) return;
        String currency = SalesPayloadSupport.stringValue(after, "currency");
        Long unit = SalesPayloadSupport.longValue(after, "unitId"), business = SalesPayloadSupport.longValue(after, "businessId");
        var fields = after.get("customFields") instanceof Map<?, ?> map ? map : Map.of();
        Long accountId = nullableNumber(fields.get("paymentAccountId"));
        boolean cash = Set.of("cash", "efectivo").contains(method);
        if (accountId == null && cash) accountId = treasury.ensureUniversalCash(companyId, userId, currency).id();
        if (accountId == null) throw new IllegalArgumentException("Selecciona la cuenta destino del cobro antes de aprobar Finanzas.");
        treasury.requireEligibleAccount(companyId, accountId, currency, unit, business, cash ? Set.of("CASH") : Set.of("BANK"));
        var date = LocalDate.parse(SalesPayloadSupport.stringValue(after, "saleDate"));
        if (date.isAfter(LocalDate.now(timezones.resolve(companyId)))) throw new IllegalArgumentException("No se puede confirmar un cobro con fecha futura.");
        treasury.post(new TreasuryMovementCommand(companyId, accountId, unit, business, currency,
            "SALES", "SALE_COLLECTION", String.valueOf(saleId), key, amount, BigDecimal.ZERO,
            "Cobro confirmado de venta " + saleId, date.atStartOfDay(timezones.resolve(companyId)).toInstant(), userId, null, null));
    }

    void requireUncollectedForDeletion(long companyId, long saleId) {
        if (count("SELECT COUNT(*) FROM finance_payment_account_movements WHERE company_id = ? AND source_module = 'SALES' AND source_id = ?", companyId, saleId) > 0) {
            throw new IllegalArgumentException("La venta tiene movimientos financieros. Usa la cancelación para conservar su historial.");
        }
    }

    private int count(String sql, long companyId, long saleId) { return jdbc.queryForObject(sql, Integer.class, companyId, saleId); }
    private static boolean confirmed(Map<String, Object> value) { return "approved".equals(token(value, "commercialStatus")) && "approved".equals(token(value, "financeStatus")); }
    private static boolean cancelled(Map<String, Object> value) { return Set.of("cancelled", "canceled").contains(token(value, "commercialStatus")); }
    private static String token(Map<String, Object> value, String key) { return Objects.toString(value.get(key), "").trim().toLowerCase(java.util.Locale.ROOT); }
    private static long number(Object value) { return Long.parseLong(String.valueOf(value)); }
    private static Long nullableNumber(Object value) { return value == null || String.valueOf(value).isBlank() ? null : number(value); }
    private static boolean equivalent(Object a, Object b) {
        if (a instanceof Number && b instanceof Number) return new BigDecimal(a.toString()).compareTo(new BigDecimal(b.toString())) == 0;
        return Objects.equals(a, b);
    }
}
