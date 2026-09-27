package com.indice.erp.pos.mercadopago;

final class MpClosedRefundAccountingSeed {
    private MpClosedRefundAccountingSeed() {}
    static void create(MpFinancialDatabaseFixture f) {
        f.jdbc.update("""
            INSERT INTO finance_payment_accounts
              (company_id,unit_id,business_id,name,type,currency_code,current_balance,pending_balance,status,created_by_user_id)
            VALUES (?,?,?,'Synthetic terminal bank','BANK','MXN',0,70,'ACTIVE',?)
            """, f.companyId, f.unitId, f.businessId, f.actorId);
        long account = f.last("finance_payment_accounts");
        f.jdbc.update("""
            INSERT INTO pos_tickets
              (company_id,unit_id,business_id,warehouse_id,cash_register_id,shift_id,ticket_number,status,currency_code,
               subtotal_amount,total_amount,paid_amount,balance_amount,completed_at,created_by_user_id)
            VALUES (?,?,?,?,?,?,'MP-REFUND-CLOSED','COMPLETED','MXN',70,70,70,0,UTC_TIMESTAMP(),?)
            """, f.companyId, f.unitId, f.businessId, f.warehouseId, f.registerId, f.shiftId, f.actorId);
        long ticket = f.last("pos_tickets");
        f.jdbc.update("""
            INSERT INTO pos_payments
              (company_id,ticket_id,shift_id,cash_register_id,payment_method,payment_account_id,amount,currency_code,
               reference,status,created_by_user_id) VALUES (?,?,?,?, 'CARD',?,70,'MXN',?,'CAPTURED',?)
            """, f.companyId, ticket, f.shiftId, f.registerId, account,
            "Mercado Pago " + f.observed.paymentId(), f.actorId);
        f.jdbc.update("UPDATE pos_mercado_pago_payment_intents SET status='APPROVED',pos_ticket_id=? WHERE company_id=? AND id=?",
            ticket, f.companyId, f.observed.id());
        f.jdbc.update("UPDATE pos_shifts SET status='CLOSED',closed_by_user_id=?,closed_at=UTC_TIMESTAMP() WHERE company_id=? AND id=?",
            f.actorId, f.companyId, f.shiftId);
        f.jdbc.update("""
            INSERT INTO pos_cash_closings
              (company_id,unit_id,business_id,warehouse_id,cash_register_id,shift_id,opening_cash_amount,cash_sales_amount,
               cash_in_amount,cash_out_amount,safe_drop_amount,correction_amount,expected_cash_amount,counted_cash_amount,
               over_short_amount,total_sales_amount,total_refunds_amount,tickets_count,closed_by_user_id)
            VALUES (?,?,?,?,?,?,0,0,0,0,0,0,0,0,0,70,0,1,?)
            """, f.companyId, f.unitId, f.businessId, f.warehouseId, f.registerId, f.shiftId, f.actorId);
        long closing = f.last("pos_cash_closings");
        f.jdbc.update("""
            INSERT INTO pos_cash_closing_settlements
              (company_id,cash_closing_id,shift_id,cash_register_id,payment_method,currency_code,gross_amount,
               transferable_amount,destination_payment_account_id,settlement_timing,pending_amount,status,policy_snapshot_json,created_by_user_id)
            VALUES (?,?,?,?,'CARD','MXN',70,70,?,'DEFERRED',70,'PENDING','{}',?)
            """, f.companyId, closing, f.shiftId, f.registerId, account, f.actorId);
        f.observed = f.application.getBean(MpIntentStore.class).find(f.companyId, f.observed.id()).orElseThrow();
    }
}
