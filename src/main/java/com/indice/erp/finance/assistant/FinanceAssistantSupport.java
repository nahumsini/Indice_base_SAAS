package com.indice.erp.finance.assistant;

import static com.indice.erp.finance.assistant.FinanceAssistantContracts.*;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.shared.*;
import jakarta.validation.Validator;
import java.math.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
import java.util.function.Consumer;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class FinanceAssistantSupport {
    private final FinanceAccessService access;
    private final AiToolAuthorizationService authorization;
    private final FinanceBusinessTimeZoneResolver zones;
    private final ObjectMapper mapper;
    private final Validator validator;
    private final JdbcTemplate jdbc;

    public FinanceContext context(AuthSessionUser user, String tool) {
        if (!authorization.canUseFinanceWorkflowTool(user, tool)) throw new SecurityException("Current finance module and tab permission required.");
        return access.resolveAssistantContext(user,FinanceAssistantTools.require(tool).module()).orElseThrow(() -> new SecurityException("Current finance operating scope required."));
    }
    public LocalDate today(FinanceContext context) { return LocalDate.now(zones.resolve(context.companyId())); }
    public String zone(FinanceContext context) { return zones.resolve(context.companyId()).getId(); }
    public ObjectNode node(Object value) { return mapper.valueToTree(value); }
    public <T> T request(Object value, Class<T> type, Consumer<ObjectNode> defaults) {
        var node = value == null ? mapper.createObjectNode() : node(value);
        defaults.accept(node);
        T result = mapper.convertValue(node, type);
        if (!validator.validate(result).isEmpty()) throw new IllegalArgumentException("Required finance fields are missing or invalid.");
        return result;
    }
    public void lock(FinanceContext context, String table, long id) {
        if (!Set.of("companies","finance_expenses","finance_petty_cash_funds","finance_petty_cash_statements","finance_petty_cash_settlement_lines","finance_accounting_accounts","finance_payment_accounts","finance_providers","finance_budgets","finance_budget_lines").contains(table)) throw new IllegalArgumentException("Unknown finance lock owner.");
        String sql = table.equals("companies") ? "SELECT id FROM companies WHERE id=? FOR UPDATE" : "SELECT id FROM " + table + " WHERE company_id=? AND id=? AND deleted_at IS NULL FOR UPDATE";
        var rows = table.equals("companies") ? jdbc.queryForList(sql, Long.class, context.companyId()) : jdbc.queryForList(sql, Long.class, context.companyId(), id);
        if (rows.isEmpty()) throw new NoSuchElementException("Finance object not found.");
    }
    public String hash(Object value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(mapper.writeValueAsBytes(canonical(mapper.valueToTree(value))))); }
        catch (Exception e) { throw new IllegalStateException("Finance state cannot be reviewed.", e); }
    }
    private Object canonical(JsonNode value){
        if(value.isObject()){var result=new TreeMap<String,Object>();value.fields().forEachRemaining(e->result.put(e.getKey(),canonical(e.getValue())));return result;}
        if(value.isArray()){var result=new ArrayList<Object>();value.forEach(v->result.add(canonical(v)));return result;}
        if(value.isNumber()){var n=value.decimalValue().stripTrailingZeros();return n.scale()<0?n.setScale(0):n;}
        if(value.isNull())return null;if(value.isBoolean())return value.booleanValue();return value.asText();
    }
    public boolean visibleIncludingRemoved(FinanceContext ctx,String table,long id){
        if(!Set.of("finance_expenses","finance_accounting_accounts","finance_payment_accounts","finance_providers","finance_budgets","finance_budget_lines").contains(table))throw new IllegalArgumentException("Unsupported scope owner.");
        return jdbc.query("SELECT unit_id,business_id FROM "+table+" WHERE company_id=? AND id=?",(rs,row)->access.containsAssignment(ctx,rs.getObject("unit_id",Long.class),rs.getObject("business_id",Long.class)),ctx.companyId(),id).stream().anyMatch(Boolean.TRUE::equals);
    }
    public static long id(Long value) { if (value == null || value < 1) throw new IllegalArgumentException("Positive finance object ID required."); return value; }
    public static String text(String value, int min, int max) { if (value == null || value.trim().length() < min || value.trim().length() > max) throw new IllegalArgumentException("Invalid finance text field."); return value.trim(); }
    public static BigDecimal money(BigDecimal amount, boolean positive) {
        if (amount == null || amount.signum() < 0 || positive && amount.signum() == 0 || amount.precision() > 18 || amount.stripTrailingZeros().scale() > 2) throw new IllegalArgumentException("Use an exact nonnegative amount with at most two decimals.");
        return amount.setScale(2, RoundingMode.HALF_UP);
    }
    public static boolean matches(String value, String query) { return query == null || query.isBlank() || value != null && value.toLowerCase(Locale.ROOT).contains(query.trim().toLowerCase(Locale.ROOT)); }
    public static boolean equal(Object value, String filter) { return filter == null || filter.isBlank() || value != null && value.toString().equalsIgnoreCase(filter); }
    public static boolean inDates(LocalDate date, Query q) { return (q.from() == null || date != null && !date.isBefore(q.from())) && (q.to() == null || date != null && !date.isAfter(q.to())); }
    public static void query(Query q) {
        if (q.query() != null && q.query().length() > 160 || q.from() != null && q.to() != null && q.to().isBefore(q.from())) throw new IllegalArgumentException("Invalid finance filters.");
        if (q.limit() != null && (q.limit() < 1 || q.limit() > 100)) throw new IllegalArgumentException("Finance page size must be 1–100.");
        for (Long value : Arrays.asList(q.id(), q.fundId(), q.statementId(), q.unitId(), q.businessId(), q.providerId())) if (value != null) id(value);
        if (q.currencyCode() != null && !q.currencyCode().matches("[A-Z]{3}")) throw new IllegalArgumentException("Use an ISO currency.");
    }
    public void shape(Change change, String... fields) {
        if (change == null) throw new IllegalArgumentException("Finance action data required.");
        var allowed = new HashSet<>(Arrays.asList(fields)); allowed.add("locale");
        node(change).fields().forEachRemaining(e -> { if (!e.getValue().isNull() && !allowed.contains(e.getKey())) throw new IllegalArgumentException("Unexpected field for this finance action."); });
        if (change.locale() != null && !Set.of("es-MX","en-CA").contains(change.locale())) throw new IllegalArgumentException("Unsupported finance locale.");
    }
    public static void version(Long expected, Long actual) { if (expected == null || !expected.equals(actual)) throw new Conflict("finance_version_changed"); }
    public static BigDecimal includedTaxRate(BigDecimal rate) {
        if(rate==null||rate.signum()<0||rate.compareTo(BigDecimal.ONE)>0||rate.stripTrailingZeros().scale()>6)
            throw new IllegalArgumentException("An explicit included-tax fraction between zero and one with at most six decimal places is required.");
        return rate;
    }
    public static void selections(List<Selection> rows) {
        if (rows == null || rows.isEmpty() || rows.size() > 200 || rows.stream().map(Selection::id).distinct().count() != rows.size()) throw new IllegalArgumentException("Select 1–200 distinct finance rows.");
        for (var row : rows) { id(row.id()); if (row.expectedVersion() == null || row.expectedVersion() < 0) throw new IllegalArgumentException("Expected row versions required."); }
    }
    public static boolean english(Change c) { return "en-CA".equals(c.locale()); }
    public static Effect effect(Change c, String currency, BigDecimal amount, BigDecimal treasury, BigDecimal fund, boolean expense, boolean payment, boolean payroll, String es, String en) {
        return new Effect(currency, amount, treasury, fund, expense, payment, payroll, english(c) ? en : es,null,null);
    }
    public <T> List<T> page(AuthSessionUser user, String tool, Query q, List<T> items) {
        int offset = offset(user, tool, q); if (offset > items.size()) throw new IllegalArgumentException("Finance page is no longer available; restart the list.");
        return items.subList(offset, Math.min(items.size(), offset + limit(q)));
    }
    public int limit(Query q) { return q.limit() == null ? 25 : q.limit(); }
    private String binding(AuthSessionUser user, String tool, Query q) {
        var fields=node(q);fields.remove("cursor");
        return hash(Arrays.asList(user.companyId(),user.userId(),user.userCompanyId(),tool,context(user,tool).scope(),fields));
    }
    public int offset(AuthSessionUser user, String tool, Query q) {
        if (q.cursor() == null) return 0;
        try { var parts = new String(Base64.getUrlDecoder().decode(q.cursor()),StandardCharsets.UTF_8).split(":",2);
            if (parts.length != 2 || !parts[1].equals(binding(user,tool,q))) throw new IllegalArgumentException();
            int n=Integer.parseInt(parts[0]);if(n<0)throw new IllegalArgumentException();return n;
        } catch (RuntimeException e) { throw new IllegalArgumentException("Invalid or mismatched finance cursor."); }
    }
    public String cursor(AuthSessionUser user, String tool, Query q, int count) {
        int end = Math.min(count,offset(user,tool,q)+limit(q));
        return end < count ? Base64.getUrlEncoder().withoutPadding().encodeToString((end+":"+binding(user,tool,q)).getBytes(StandardCharsets.UTF_8)) : null;
    }
}
