package com.indice.erp.notifications;

import com.indice.erp.hr.announcements.HrAnnouncementActor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
class PosNotificationSyncService {

    private final JdbcTemplate jdbcTemplate;

    PosNotificationSyncService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    void sync(HrAnnouncementActor actor) {
        insertPendingPurchaseOrders(actor);
        insertPendingSupplierInvoices(actor);
        insertLowStockSignals(actor);
    }

    private void insertPendingPurchaseOrders(HrAnnouncementActor actor) {
        jdbcTemplate.update("""
            INSERT INTO app_notifications
            (company_id, recipient_user_company_id, source_module, source_type, source_id,
             event_type, event_key, title, description, action_url)
            SELECT purchase_order.company_id, ?, 'point_of_sale', 'purchase_order', purchase_order.id,
                   'pos_purchase_pending', CONCAT('pos-purchase-order:', purchase_order.id, ':', purchase_order.status),
                   CONCAT('POS purchase needs attention: ', purchase_order.folio),
                   CONCAT(purchase_order.currency_code, ' ', purchase_order.total_amount, ' - ', purchase_order.status),
                   '/point-of-sale/ordenesCompra'
            FROM pos_purchase_orders purchase_order
            WHERE purchase_order.company_id = ?
              AND purchase_order.deleted_at IS NULL
              AND purchase_order.status IN ('REQUESTED', 'APPROVED', 'SENT', 'PARTIALLY_RECEIVED')
              AND (
                (? = TRUE AND (? IS NULL OR purchase_order.unit_id = ? OR purchase_order.unit_id IS NULL)
                          AND (? IS NULL OR purchase_order.business_id = ? OR purchase_order.business_id IS NULL))
                OR purchase_order.created_by_user_id = ?
              )
            ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description),
              action_url = VALUES(action_url), dismissed_at = NULL, dismissed_by = NULL
            """,
            actor.userCompanyId(), actor.companyId(), actor.managementAccess(), actor.unitId(), actor.unitId(),
            actor.businessId(), actor.businessId(), actor.userId());
    }

    private void insertPendingSupplierInvoices(HrAnnouncementActor actor) {
        if (!actor.managementAccess()) {
            return;
        }
        jdbcTemplate.update("""
            INSERT INTO app_notifications
            (company_id, recipient_user_company_id, source_module, source_type, source_id,
             event_type, event_key, title, description, action_url)
            SELECT invoice.company_id, ?, 'point_of_sale', 'supplier_invoice', invoice.id,
                   'pos_purchase_pending', CONCAT('pos-supplier-invoice:', invoice.id, ':', invoice.status),
                   CONCAT('Supplier invoice needs review: ', invoice.invoice_number),
                   CONCAT(invoice.currency_code, ' ', invoice.total_amount, ' - ', invoice.status),
                   '/point-of-sale/ordenesCompra'
            FROM pos_supplier_invoices invoice
            WHERE invoice.company_id = ?
              AND invoice.deleted_at IS NULL
              AND invoice.status IN ('SUBMITTED', 'MATCHED')
            ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description),
              action_url = VALUES(action_url), dismissed_at = NULL, dismissed_by = NULL
            """,
            actor.userCompanyId(), actor.companyId());
    }

    private void insertLowStockSignals(HrAnnouncementActor actor) {
        if (!actor.managementAccess()) {
            return;
        }
        jdbcTemplate.update("""
            INSERT INTO app_notifications
            (company_id, recipient_user_company_id, source_module, source_type, source_id,
             event_type, event_key, title, description, action_url)
            SELECT balance.company_id, ?, 'point_of_sale', 'inventory_balance', balance.id,
                   'pos_stock_low', CONCAT('pos-stock:', balance.id, ':low'),
                   CONCAT('Low POS stock: ', COALESCE(product.name, balance.balance_code)),
                   CONCAT(balance.warehouse_name, ' - available ', balance.available_quantity, ' / minimum ', balance.minimum_quantity),
                   '/point-of-sale/inventario'
            FROM sales_inventory_balances balance
            LEFT JOIN sales_products product ON product.company_id = balance.company_id
                AND product.id = balance.product_id
            WHERE balance.company_id = ?
              AND balance.deleted_at IS NULL
              AND balance.uses_inventory = 1
              AND balance.minimum_quantity > 0
              AND balance.available_quantity <= balance.minimum_quantity
              AND (? IS NULL OR balance.business_unit_id = CAST(? AS CHAR) OR balance.business_unit_id IS NULL)
              AND (? IS NULL OR balance.business_id = CAST(? AS CHAR) OR balance.business_id IS NULL)
            ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description),
              action_url = VALUES(action_url), dismissed_at = NULL, dismissed_by = NULL
            """,
            actor.userCompanyId(), actor.companyId(), actor.unitId(), actor.unitId(),
            actor.businessId(), actor.businessId());
    }
}
