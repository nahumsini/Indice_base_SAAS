package com.indice.erp.notifications;

import com.indice.erp.access.ModuleSlugNormalizer;
import java.util.List;

/** Personal presentation switches. Domain modules continue to own event creation and eligibility. */
final class NotificationPreferenceCatalog {
    record Type(String module, String eventType) {
        String key() { return module + "." + eventType; }
    }
    static final List<Type> TYPES = List.of(
        new Type("human_resources", "general"), new Type("human_resources", "urgent"),
        new Type("human_resources", "reminder"),
        new Type("processes_tasks", "task_assigned"), new Type("processes_tasks", "task_reassigned"),
        new Type("processes_tasks", "task_due_today"), new Type("processes_tasks", "task_overdue"),
        new Type("processes_tasks", "task_pending_audit"), new Type("processes_tasks", "task_audited"),
        new Type("expenses", "expense_pending_approval"),
        new Type("expenses", "expense_due"), new Type("expenses", "expense_paid"),
        new Type("point_of_sale", "pos_shift_opened"), new Type("point_of_sale", "pos_shift_closed"),
        new Type("inventory", "pos_stock_low"), new Type("inventory", "pos_purchase_pending"),
        new Type("sales", "sales_quote_follow_up"), new Type("sales", "sales_customer_activity"), new Type("sales", "sales_call_reminder"), new Type("sales", "sales_whatsapping_reminder"),
        new Type("human_resources", "hr_permission_pending"), new Type("human_resources", "hr_permission_resolved"),
        new Type("processes_tasks", "task_contribution_ready"), new Type("processes_tasks", "process_run_created"),
        new Type("processes_tasks", "process_run_attention"), new Type("processes_tasks", "finalized"),
        new Type("processes_tasks", "finalized_with_incidents"),
        new Type("point_of_sale", "pos_shift_difference"),
        new Type("petty_cash", "petty_cash_low_balance"), new Type("petty_cash", "petty_cash_receipt_pending"),
        new Type("receivables", "receivable_due_today"), new Type("receivables", "receivable_overdue"),
        new Type("kpis", "kpi_report_ready"), new Type("kpis", "kpi_report_attention")
    );
    static String module(String source, String event) {
        if ("pos_stock_low".equals(event) || "pos_purchase_pending".equals(event)) return "inventory";
        return switch (ModuleSlugNormalizer.normalize(source)) {
            case "processes" -> "processes_tasks";
            case "crm" -> "sales";
            case "pos" -> "point_of_sale";
            default -> ModuleSlugNormalizer.normalize(source);
        };
    }
    static boolean lowPriority(String event) {
        return List.of("celebration", "task_audited", "expense_paid", "pos_shift_opened", "hr_permission_resolved", "kpi_report_ready", "process_run_created", "finalized").contains(event);
    }
    private NotificationPreferenceCatalog() { }
}
