package com.indice.erp.pos.mercadopago;

import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;

abstract class MpFinancialDatabaseFixture extends MpRegisterDatabaseFixture {
    MpIntent observed;
    @BeforeEach void persistedOriginalPointIntent() {
        long connectionId = connection(companyId, Long.toString(companyId + 900000000L));
        jdbc.update("""
            INSERT INTO pos_mercado_pago_terminals
            (company_id,connection_id,provider_terminal_id,name,status,operating_mode,cash_register_id)
            VALUES (?,?,'NEWLAND_N950__TEST0001','Synthetic MP terminal','READY','PDV',?)
            """, companyId, connectionId, registerId);
        long terminalId = last("pos_mercado_pago_terminals");
        String key = UUID.randomUUID().toString();
        jdbc.update("""
            INSERT INTO pos_mercado_pago_payment_intents
            (company_id,cash_register_id,shift_id,terminal_id,connection_id,provider_terminal_id,
             seller_id,environment,idempotency_key,external_reference,status,amount,currency_code,
             payload_hash,checkout_json,provider_request_json,order_id,payment_id,
             created_by_user_id,created_by_role,scope_type,scope_unit_id,scope_business_id,expires_at)
            VALUES (?,?,?,?,?,'NEWLAND_N950__TEST0001',?,'sandbox',?,?,'WAITING',70,'MXN',
             ?,'{}','{}',?,? ,?,'admin','BUSINESS_OFFICE',?,?,UTC_TIMESTAMP()+INTERVAL 10 MINUTE)
            """, companyId, registerId, shiftId, terminalId, connectionId, Long.toString(companyId + 900000000L),
            key, key, MpSecurity.hash(key), "ORD" + companyId, "PAY" + companyId, actorId, unitId, businessId);
        observed = application.getBean(MpIntentStore.class).find(companyId, last("pos_mercado_pago_payment_intents")).orElseThrow();
    }
    MpVerifiedOrder partialRefund() {
        ObjectNode order = MpPaymentTestFixtures.order();
        order.put("id", observed.orderId()).put("user_id", observed.sellerId())
            .put("external_reference", observed.externalReference()).put("status_detail", "partially_refunded");
        MpPaymentTestFixtures.transaction(order).put("id", observed.paymentId()).put("refunded_amount", "10.00");
        order.withObject("transactions").putArray("refunds").addObject().put("id", "REF" + companyId)
            .put("transaction_id", observed.paymentId()).put("amount", "10.00").put("status", "processed");
        return new MpVerifiedOrder(order, MpPaymentTestFixtures.verifier().verify(observed, order));
    }
}
