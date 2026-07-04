package com.indice.erp.notifications;

import com.indice.erp.hr.announcements.HrAnnouncementActor;
import java.time.LocalDate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
class ExpenseNotificationSyncService {

    private final JdbcTemplate jdbcTemplate;

    ExpenseNotificationSyncService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    void sync(HrAnnouncementActor actor) {
        insertPendingApprovals(actor);
        insertDuePayments(actor);
        insertPaidSignals(actor);
    }

    private void insertPendingApprovals(HrAnnouncementActor actor) {
        if (!actor.managementAccess()) {
            return;
        }
        jdbcTemplate.update("""
            INSERT INTO app_notifications
            (company_id, recipient_user_company_id, source_module, source_type, source_id,
             event_type, event_key, title, description, action_url)
            SELECT expense.company_id, ?, 'expenses', 'expense', expense.id, 'expense_pending_approval',
                   CONCAT('expense:', expense.id, ':pending-approval'),
                   CONCAT('Expense pending approval: ', COALESCE(NULLIF(expense.folio, ''), expense.id)),
                   CONCAT(COALESCE(NULLIF(expense.concept, ''), 'Expense'), ' - ', expense.currency_code, ' ', expense.total_amount),
                   '/expenses'
            FROM finance_expenses expense
            WHERE expense.company_id = ?
              AND expense.deleted_at IS NULL
              AND expense.status = 'PENDING_APPROVAL'
              AND (? IS NULL OR expense.unit_id = ? OR expense.unit_id IS NULL)
              AND (? IS NULL OR expense.business_id = ? OR expense.business_id IS NULL)
            ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description),
              action_url = VALUES(action_url), dismissed_at = NULL, dismissed_by = NULL
            """,
            actor.userCompanyId(), actor.companyId(), actor.unitId(), actor.unitId(),
            actor.businessId(), actor.businessId());
    }

    private void insertDuePayments(HrAnnouncementActor actor) {
        jdbcTemplate.update("""
            INSERT INTO app_notifications
            (company_id, recipient_user_company_id, source_module, source_type, source_id,
             event_type, event_key, title, description, action_url)
            SELECT expense.company_id, ?, 'expenses', 'expense', expense.id, 'expense_due',
                   CONCAT('expense:', expense.id, ':due:', DATE_FORMAT(expense.due_date, '%Y-%m-%d')),
                   CONCAT('Expense payment due: ', COALESCE(NULLIF(expense.folio, ''), expense.id)),
                   CONCAT(COALESCE(NULLIF(expense.concept, ''), 'Expense'), ' - balance ', expense.currency_code, ' ', COALESCE(expense.balance_amount, 0)),
                   '/expenses'
            FROM finance_expenses expense
            WHERE expense.company_id = ?
              AND expense.deleted_at IS NULL
              AND expense.due_date IS NOT NULL
              AND expense.due_date <= ?
              AND COALESCE(expense.balance_amount, expense.total_amount - expense.paid_amount) > 0
              AND expense.status NOT IN ('PAID', 'CLOSED', 'CANCELLED', 'REJECTED')
              AND (
                (? = TRUE AND (? IS NULL OR expense.unit_id = ? OR expense.unit_id IS NULL)
                          AND (? IS NULL OR expense.business_id = ? OR expense.business_id IS NULL))
                OR expense.requested_by_user_id = ?
                OR expense.created_by_user_id = ?
                OR expense.approved_by_user_id = ?
              )
            ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description),
              action_url = VALUES(action_url), dismissed_at = NULL, dismissed_by = NULL
            """,
            actor.userCompanyId(), actor.companyId(), java.sql.Date.valueOf(LocalDate.now()),
            actor.managementAccess(), actor.unitId(), actor.unitId(), actor.businessId(), actor.businessId(),
            actor.userId(), actor.userId(), actor.userId());
    }

    private void insertPaidSignals(HrAnnouncementActor actor) {
        jdbcTemplate.update("""
            INSERT INTO app_notifications
            (company_id, recipient_user_company_id, source_module, source_type, source_id,
             event_type, event_key, title, description, action_url)
            SELECT expense.company_id, ?, 'expenses', 'expense', expense.id, 'expense_paid',
                   CONCAT('expense:', expense.id, ':paid'),
                   CONCAT('Expense paid: ', COALESCE(NULLIF(expense.folio, ''), expense.id)),
                   CONCAT(COALESCE(NULLIF(expense.concept, ''), 'Expense'), ' - ', expense.currency_code, ' ', expense.total_amount),
                   '/expenses'
            FROM finance_expenses expense
            WHERE expense.company_id = ?
              AND expense.deleted_at IS NULL
              AND expense.status IN ('PAID', 'CLOSED')
              AND (expense.requested_by_user_id = ? OR expense.created_by_user_id = ?)
            ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description),
              action_url = VALUES(action_url)
            """,
            actor.userCompanyId(), actor.companyId(), actor.userId(), actor.userId());
    }
}
