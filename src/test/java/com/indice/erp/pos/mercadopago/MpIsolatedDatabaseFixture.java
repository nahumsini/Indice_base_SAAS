package com.indice.erp.pos.mercadopago;

import static org.junit.jupiter.api.Assertions.assertEquals;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties={
    "app.pos.mercado-pago.enabled=false", "app.pos.square.enabled=false"})
@Transactional
abstract class MpIsolatedDatabaseFixture {
    @Autowired JdbcTemplate jdbc;
    @Autowired ApplicationContext application;
    long companyId;
    @BeforeEach void isolatedCompany() {
        assertEquals("indice_test_db", jdbc.queryForObject("SELECT DATABASE()", String.class));
        companyId = company();
    }
    long company() {
        var name = "Synthetic MP integration " + UUID.randomUUID();
        jdbc.update("INSERT INTO companies(name) VALUES (?)", name);
        return jdbc.queryForObject("SELECT id FROM companies WHERE name=?", Long.class, name);
    }
    long connection(long company, String seller) {
        jdbc.update("""
            INSERT INTO pos_mercado_pago_connections
            (company_id,seller_id,environment,state,country_code,site_id,live_mode,
             access_token_ciphertext,refresh_token_ciphertext,expires_at,scopes)
            VALUES (?,?,'sandbox','CONNECTED','MX','MLM',false,
                'synthetic-encrypted-access','synthetic-encrypted-refresh',UTC_TIMESTAMP()+INTERVAL 1 DAY,
                'read write offline_access')
            """, company, seller);
        return jdbc.queryForObject("SELECT id FROM pos_mercado_pago_connections WHERE company_id=? AND environment='sandbox'",
            Long.class, company);
    }
}
