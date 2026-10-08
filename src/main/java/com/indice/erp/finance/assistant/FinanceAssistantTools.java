package com.indice.erp.finance.assistant;

import java.util.*;

/** Closed owner catalog. Delegated consent never replaces the named module/tab gate. */
public final class FinanceAssistantTools {
    private FinanceAssistantTools() {}
    public record Spec(String name, String kind, String operation, String scope, String module, String tab) {
        public boolean write() { return !Set.of("list", "get", "reviews", "responsibles").contains(operation); }
    }
    public static final Map<String, Spec> ALL;
    public static final Set<String> READS;
    public static final Set<String> ACTIONS;
    static {
        var tools = new LinkedHashMap<String, Spec>();
        catalog(tools, "accounting_account", "accounting_accounts", "expenses.accounting.manage", "accounting");
        catalog(tools, "payment_account", "payment_accounts", "expenses.accounts.manage", "payment-accounts");
        catalog(tools, "provider", "providers", "expenses.providers.manage", "providers");
        catalog(tools, "budget", "budgets", "expenses.budgets.manage", "budgets");
        catalog(tools, "budget_line", "budget_lines", "expenses.budgets.manage", "budgets");
        add(tools, "create_budget_obligation_schedule", "budget_line", "schedule", "expenses.budgets.manage", "expenses", "budgets");
        add(tools, "list_budget_obligation_reviews", "review", "reviews", "expenses.read", "expenses", "expenses");
        add(tools, "list_finance_expenses", "expense", "list", "expenses.read", "expenses", "expenses");
        add(tools, "get_finance_expense", "expense", "get", "expenses.read", "expenses", "expenses");
        add(tools, "list_expense_payments", "payment", "list", "expenses.read", "expenses", "expenses");
        for (var verb : List.of("create", "correct", "submit", "approve", "reject", "cancel", "close", "remove", "classify", "import", "bulk_classify", "bulk_status")) {
            String name = switch (verb) {
                case "create" -> "create_expense_payable";
                case "import" -> "import_finance_expenses";
                case "bulk_classify" -> "classify_finance_expenses";
                case "bulk_status" -> "update_finance_expense_due_status";
                default -> verb + "_finance_expense";
            };
            String scope = Set.of("approve", "reject").contains(verb) ? "expenses.approve"
                : Set.of("remove", "cancel").contains(verb) ? "expenses.reverse" : "expenses.manage";
            add(tools, name, "expense", verb, scope, "expenses", "expenses");
        }
        add(tools, "register_expense_payment", "expense", "pay", "expenses.pay", "expenses", "expenses");
        add(tools, "settle_expense_payment", "expense", "settle", "expenses.pay", "expenses", "expenses");
        add(tools, "reverse_expense_payment", "expense", "reverse_payment", "expenses.reverse", "expenses", "expenses");
        add(tools, "pay_finance_expenses", "expense", "bulk_pay", "expenses.pay", "expenses", "expenses");
        add(tools, "correct_finance_expenses", "expense", "bulk_correct", "expenses.manage", "expenses", "expenses");
        for (var kind : List.of("fund", "receipt", "statement", "movement", "type_change")) {
            String tab = kind.equals("fund") || kind.equals("type_change") ? "cash" : kind.equals("statement") ? "statements" : "control";
            add(tools, "list_petty_cash_" + (kind.equals("receipt") ? "receipts" : kind.equals("type_change") ? "type_changes" : kind + "s"), kind, "list", "petty_cash.read", "petty_cash", tab);
            if (!kind.equals("type_change")) add(tools, "get_petty_cash_" + kind, kind, "get", "petty_cash.read", "petty_cash", tab);
        }
        add(tools, "list_petty_cash_responsibles", "responsible", "responsibles", "petty_cash.read", "petty_cash", "cash");
        for (var verb : List.of("create", "update", "close", "schedule_type_change", "cancel_type_change", "disable_kiosk", "enable_kiosk", "revoke_kiosk")) {
            add(tools, verb + "_petty_cash_fund", "fund", verb, "petty_cash.funds.manage", "petty_cash", "cash");
        }
        add(tools, "deposit_petty_cash_fund", "fund", "deposit", "petty_cash.deposit:create", "petty_cash", "control");
        for (var verb : List.of("capture", "authorize", "reject", "reverse", "classify", "bulk_classify")) {
            String scope = verb.equals("capture") ? "petty_cash.expense:create"
                : verb.equals("authorize") ? "petty_cash.receipts.approve" : "petty_cash.receipts.manage";
            add(tools, verb + "_petty_cash_receipt", "receipt", verb, scope, "petty_cash", "control");
        }
        add(tools, "close_petty_cash_statement", "statement", "close", "petty_cash.statements.close", "petty_cash", "statements");
        add(tools, "remove_expense_attachment", "expense", "remove_attachment", "expenses.manage", "expenses", "expenses");
        add(tools, "remove_budget_line_attachment", "budget_line", "remove_attachment", "expenses.budgets.manage", "expenses", "budgets");
        add(tools, "remove_petty_cash_receipt_attachment", "receipt", "remove_attachment", "petty_cash.receipts.manage", "petty_cash", "control");
        ALL = Collections.unmodifiableMap(tools);
        READS = Collections.unmodifiableSet(new LinkedHashSet<>(tools.values().stream().filter(s -> !s.write()).map(Spec::name).toList()));
        ACTIONS = Collections.unmodifiableSet(new LinkedHashSet<>(tools.values().stream().filter(Spec::write).map(Spec::name).toList()));
    }
    private static void catalog(Map<String, Spec> tools, String kind, String plural, String scope, String tab) {
        add(tools, "list_finance_" + plural, kind, "list", "expenses.read", "expenses", tab);
        add(tools, "get_finance_" + kind, kind, "get", "expenses.read", "expenses", tab);
        for (var verb : List.of("create", "update", "inactivate")) add(tools, verb + "_finance_" + kind, kind, verb, scope, "expenses", tab);
    }
    private static void add(Map<String, Spec> tools, String name, String kind, String operation, String scope, String module, String tab) {
        if (tools.put(name, new Spec(name, kind, operation, scope, module, tab)) != null) throw new IllegalStateException("Duplicate finance tool.");
    }
    public static Spec require(String name) {
        var spec = ALL.get(name);
        if (spec == null) throw new IllegalArgumentException("Unknown finance workflow tool.");
        return spec;
    }
}
