package com.indice.erp.finance.reporting;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.finance.reporting.AccountingPostingModels.PostingCandidate;
import com.indice.erp.finance.reporting.AccountingPostingModels.PostingLine;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Currency;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Explicit, reviewed ledger evidence. Never rewrites an operational balance or posted entry. */
@Service
class AccountingManualEntryService {
    private final JdbcTemplate jdbc;
    private final FinancialLedgerRepository ledger;
    private final AccountingCurrencyConversion conversion;
    private final FinanceBusinessTimeZoneResolver timezones;
    private final ObjectMapper json;

    AccountingManualEntryService(JdbcTemplate jdbc, FinancialLedgerRepository ledger,
            AccountingCurrencyConversion conversion, FinanceBusinessTimeZoneResolver timezones, ObjectMapper json) {
        this.jdbc = jdbc; this.ledger = ledger; this.conversion = conversion; this.timezones = timezones; this.json = json;
    }

    List<AccountOption> accounts(long company) {
        return jdbc.query("""
            SELECT id, code, name, account_type FROM finance_accounting_accounts
            WHERE company_id = ? AND status = 'ACTIVE' AND is_postable = TRUE AND deleted_at IS NULL ORDER BY code
            """, (rs, row) -> new AccountOption(rs.getLong("id"), rs.getString("code"), rs.getString("name"), rs.getString("account_type")), company);
    }

    @Transactional(readOnly = true)
    Preview preview(long company, EntryRequest request) {
        var candidate = prepare(company, request);
        return preview(company, candidate);
    }

    @Transactional
    EntryResult post(long company, long user, PostRequest request) {
        if (request == null || request.entry() == null) throw invalid("El asiento es obligatorio.");
        jdbc.queryForObject("SELECT id FROM companies WHERE id = ? FOR UPDATE", Long.class, company);
        var candidate = prepare(company, request.entry());
        var prepared = preview(company, candidate);
        if (!prepared.previewHash().equals(request.previewHash())) throw invalid("La vista previa cambió. Revisa nuevamente los importes antes de publicar.");
        var existing = ledger.findEntry(company, candidate.sourceEventKey());
        if (existing.isPresent()) {
            if (!existing.get().fingerprint().equals(candidate.sourceFingerprint())) throw invalid("La referencia de registro ya corresponde a otro asiento.");
            return new EntryResult(existing.get().id(), true);
        }
        var settings = ledger.findSettings(company).orElseThrow(() -> invalid("Primero inicializa los informes contables."));
        ledger.post(company, user, settings, candidate);
        return new EntryResult(ledger.findEntry(company, candidate.sourceEventKey()).orElseThrow().id(), false);
    }

    private PostingCandidate prepare(long company, EntryRequest request) {
        if (request == null || request.date() == null || request.date().isAfter(LocalDate.now(timezones.resolve(company))))
            throw invalid("Indica una fecha contable que no sea futura.");
        if ((request.type() == null || !List.of("OPENING", "ADJUSTMENT").contains(request.type()))) throw invalid("Tipo de asiento inválido.");
        if (request.idempotencyKey() == null || !request.idempotencyKey().matches("[A-Za-z0-9_-]{8,100}")) throw invalid("Referencia de registro inválida.");
        String description = text(request.description(), 8, 500, "Describe el soporte y motivo del asiento (8 a 500 caracteres).");
        String reference = text(request.reference(), 3, 160, "Indica el documento de soporte (3 a 160 caracteres).");
        if (request.lines() == null || request.lines().size() < 2 || request.lines().size() > 100) throw invalid("El asiento requiere de 2 a 100 líneas.");
        var settings = ledger.findSettings(company).orElseThrow(() -> invalid("Primero inicializa los informes contables."));
        var available = new LinkedHashMap<Long, AccountOption>(); accounts(company).forEach(account -> available.put(account.id(), account));
        var balances = new LinkedHashMap<String, BigDecimal>();
        var lines = new ArrayList<PostingLine>();
        for (var line : request.lines()) {
            if (line == null || !available.containsKey(line.accountId())) throw invalid("La cuenta debe estar activa y pertenecer a esta empresa.");
            if ("OPENING".equals(request.type()) && List.of("REVENUE", "EXPENSE").contains(available.get(line.accountId()).type()))
                throw invalid("La apertura admite cuentas de activo, pasivo y patrimonio.");
            validateDimensions(company, line.unitId(), line.businessId());
            String currency = text(line.currency(), 3, 3, "Indica una moneda ISO válida.").toUpperCase(Locale.ROOT);
            try { Currency.getInstance(currency); } catch (IllegalArgumentException invalid) { throw invalid("Indica una moneda ISO válida."); }
            var debit = amount(line.debit()); var credit = amount(line.credit());
            if ((debit.signum() > 0) == (credit.signum() > 0)) throw invalid("Cada línea debe tener un cargo o un abono positivo.");
            balances.merge(currency + ":" + line.unitId() + ":" + line.businessId(), debit.subtract(credit), BigDecimal::add);
            lines.add(new PostingLine(null, line.accountId(), line.unitId(), line.businessId(), description,
                debit, credit, reference, debit.signum() > 0 ? debit : credit, currency, BigDecimal.ONE));
        }
        if (balances.values().stream().anyMatch(balance -> balance.signum() != 0))
            throw invalid("Los cargos y abonos deben cuadrar en cada moneda y asignación organizacional.");
        String fingerprint = hash(List.of(request.type(), request.date().toString(), description, reference, lines));
        var nativeEntry = new PostingCandidate("accounting", "MANUAL_" + request.type(), request.idempotencyKey(),
            "accounting:MANUAL:" + request.idempotencyKey(), fingerprint, request.type(), request.date(), description,
            settings.functionalCurrency(), List.copyOf(lines));
        return conversion.convert(company, nativeEntry, settings.functionalCurrency());
    }

    private Preview preview(long company, PostingCandidate candidate) {
        var settings = ledger.findSettings(company).orElseThrow();
        var nativeTotals = new LinkedHashMap<String, BigDecimal>();
        candidate.lines().forEach(line -> {
            if (line.debit().signum() > 0) nativeTotals.merge(line.transactionCurrency(), line.transactionAmount(), BigDecimal::add);
        });
        return new Preview(hash(List.of(candidate.sourceFingerprint(), candidate.lines(), candidate.exchangeRateEvidenceJson())),
            settings.functionalCurrency(), candidate.lines().stream().map(PostingLine::debit).reduce(BigDecimal.ZERO, BigDecimal::add),
            nativeTotals, candidate.lines().stream().map(line -> new PreviewLine(line.explicitAccountId(), line.unitId(), line.businessId(),
                line.transactionCurrency(), line.transactionAmount(), line.debit(), line.credit(), line.exchangeRate())).toList());
    }

    private void validateDimensions(long company, Long unit, Long business) {
        if (unit != null && jdbc.queryForObject("SELECT COUNT(*) FROM units WHERE company_id = ? AND id = ?", Integer.class, company, unit) != 1)
            throw invalid("La unidad no pertenece a esta empresa.");
        if (business != null && (unit == null || jdbc.queryForObject("SELECT COUNT(*) FROM businesses WHERE company_id = ? AND id = ? AND unit_id = ?",
                Integer.class, company, business, unit) != 1)) throw invalid("El negocio debe pertenecer a la unidad indicada.");
    }
    private String hash(Object value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json.writeValueAsString(value).getBytes(StandardCharsets.UTF_8))); }
        catch (Exception error) { throw new IllegalStateException("Cannot preserve entry evidence", error); }
    }
    private static BigDecimal amount(BigDecimal value) {
        if (value == null) return BigDecimal.ZERO.setScale(4);
        if (value.signum() < 0 || value.precision() - value.scale() > 14) throw invalid("Importe inválido.");
        try { return value.setScale(4, RoundingMode.UNNECESSARY); }
        catch (ArithmeticException error) { throw invalid("Los importes admiten hasta cuatro decimales."); }
    }
    private static String text(String value, int min, int max, String message) {
        if (value == null || value.trim().length() < min || value.trim().length() > max) throw invalid(message);
        return value.trim();
    }
    private static IllegalArgumentException invalid(String message) { return new IllegalArgumentException(message); }

    record AccountOption(long id, String code, String name, String type) {}
    record EntryLine(long accountId, Long unitId, Long businessId, String currency, BigDecimal debit, BigDecimal credit) {}
    record EntryRequest(String type, LocalDate date, String description, String reference, String idempotencyKey, List<EntryLine> lines) {}
    record PostRequest(EntryRequest entry, String previewHash) {}
    record Preview(String previewHash, String functionalCurrency, BigDecimal functionalTotal, Map<String, BigDecimal> nativeTotals, List<PreviewLine> lines) {}
    record PreviewLine(Long accountId, Long unitId, Long businessId, String currency, BigDecimal nativeAmount, BigDecimal debit, BigDecimal credit, BigDecimal rate) {}
    record EntryResult(long entryId, boolean alreadyPosted) {}
}
