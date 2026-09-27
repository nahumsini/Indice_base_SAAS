package com.indice.erp.pos.square;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;

abstract class SquarePaymentDatabaseFixture extends SquareRegisterDatabaseFixture {
    @Autowired SquarePaymentIntentRepository intents;
    @Autowired SquareRefundReservation reservation;
    SquareRecords.PaymentIntent intent;
    @BeforeEach void payment() {
        jdbc.update("INSERT INTO pos_square_connections(company_id,environment,merchant_id,access_token_protected,status,created_by_user_id) VALUES (?,'sandbox','merchant-1','synthetic','CONNECTED',?)",company,actor);
        jdbc.update("INSERT INTO pos_square_locations(company_id,square_location_id,name,currency_code,country_code,created_by_user_id) VALUES (?,'loc-1','Square location','CAD','CA',?)",company,actor);
        var location=last("pos_square_locations");
        jdbc.update("INSERT INTO pos_square_terminals(company_id,square_location_row_id,square_device_code_id,square_device_id,name,status,created_by_user_id) VALUES (?,?,'code-1','device-1','Square terminal','PAIRED',?)",company,location,actor);
        var terminal=last("pos_square_terminals");
        jdbc.update("""
            INSERT INTO pos_square_terminal_payment_intents
            (company_id,cash_register_id,shift_id,terminal_id,square_location_id,square_device_id,
             idempotency_key,square_checkout_id,square_payment_id,status,amount,currency_code,
             checkout_payload_sha256,checkout_request_json,created_by_user_id,created_by_role,
             scope_type,expires_at)
            VALUES (?,?,?,?,'loc-1','device-1','payment-key','checkout-1','payment-1','APPROVED',
              10.50,'CAD',REPEAT('0',64),'{}',?,'admin','CORPORATE_OFFICE',UTC_TIMESTAMP()+INTERVAL 1 DAY)
            """,company,register,shift,terminal,actor);
        intent=intents.findById(company,last("pos_square_terminal_payment_intents")).orElseThrow();
    }
}
