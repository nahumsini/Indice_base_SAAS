package com.indice.erp.notifications;

import com.indice.erp.hr.announcements.HrAnnouncementActor;
import java.time.LocalDate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
class SalesNotificationSyncService {

    private final JdbcTemplate jdbcTemplate;

    SalesNotificationSyncService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    void sync(HrAnnouncementActor actor) {
        insertQuoteFollowUps(actor);
        insertPostSaleFollowUps(actor);
    }

    private void insertQuoteFollowUps(HrAnnouncementActor actor) {
        jdbcTemplate.update("""
            INSERT INTO app_notifications
            (company_id, recipient_user_company_id, source_module, source_type, source_id,
             event_type, event_key, title, description, action_url)
            SELECT quote.company_id, ?, 'sales', 'quote', quote.id, 'sales_quote_follow_up',
                   CONCAT('sales-quote:', quote.id, ':expiration:', DATE_FORMAT(quote.expiration_date, '%Y-%m-%d')),
                   CONCAT('Quote follow-up: ', quote.quote_number),
                   CONCAT(quote.client_name, ' - expires ', DATE_FORMAT(quote.expiration_date, '%Y-%m-%d')),
                   '/sales/quotes'
            FROM sales_quotes quote
            WHERE quote.company_id = ?
              AND quote.deleted_at IS NULL
              AND quote.expiration_date IS NOT NULL
              AND quote.expiration_date <= DATE_ADD(?, INTERVAL 3 DAY)
              AND LOWER(COALESCE(quote.status, 'draft')) NOT IN ('accepted', 'won', 'rejected', 'lost', 'cancelled')
              AND (quote.assigned_seller_user_company_id = ? OR (? = TRUE AND quote.assigned_seller_user_company_id IS NULL))
            ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description),
              action_url = VALUES(action_url), dismissed_at = NULL, dismissed_by = NULL
            """,
            actor.userCompanyId(), actor.companyId(), java.sql.Date.valueOf(LocalDate.now()),
            actor.userCompanyId(), actor.managementAccess());
    }

    private void insertPostSaleFollowUps(HrAnnouncementActor actor) {
        jdbcTemplate.update("""
            INSERT INTO app_notifications
            (company_id, recipient_user_company_id, source_module, source_type, source_id,
             event_type, event_key, title, description, action_url)
            SELECT post_sale.company_id, ?, 'sales', 'post_sale_case', post_sale.id, 'sales_customer_activity',
                   CONCAT('sales-post-sale:', post_sale.id, ':follow-up:', DATE_FORMAT(post_sale.next_follow_up_date, '%Y-%m-%d')),
                   CONCAT('Customer follow-up: ', post_sale.case_number),
                   CONCAT(post_sale.client_name, ' - ', COALESCE(NULLIF(post_sale.next_action, ''), 'Review next action')),
                   '/sales/post-sales'
            FROM sales_post_sale_cases post_sale
            WHERE post_sale.company_id = ?
              AND post_sale.deleted_at IS NULL
              AND post_sale.next_follow_up_date IS NOT NULL
              AND post_sale.next_follow_up_date <= ?
              AND LOWER(COALESCE(post_sale.status, 'active')) NOT IN ('closed', 'cancelled', 'lost')
              AND (post_sale.owner_user_company_id = ? OR (? = TRUE AND post_sale.owner_user_company_id IS NULL))
            ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description),
              action_url = VALUES(action_url), dismissed_at = NULL, dismissed_by = NULL
            """,
            actor.userCompanyId(), actor.companyId(), java.sql.Date.valueOf(LocalDate.now()),
            actor.userCompanyId(), actor.managementAccess());
    }
}
