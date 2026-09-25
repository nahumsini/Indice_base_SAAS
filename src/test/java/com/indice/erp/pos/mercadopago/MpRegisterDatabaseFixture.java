package com.indice.erp.pos.mercadopago;

import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;

abstract class MpRegisterDatabaseFixture extends MpIsolatedDatabaseFixture {
    long actorId, unitId, businessId, warehouseId, registerId, shiftId;
    @BeforeEach void originalFinancialRegister() {
        String email = "mp-test-" + UUID.randomUUID() + "@example.test";
        jdbc.update("INSERT INTO users(email,password_hash,full_name) VALUES (?,'isolated-no-login','Synthetic MP actor')", email);
        actorId = jdbc.queryForObject("SELECT id FROM users WHERE email=?", Long.class, email);
        jdbc.update("INSERT INTO user_companies(user_id,company_id,role,status) VALUES (?,?,'admin','active')", actorId, companyId);
        jdbc.update("INSERT INTO units(company_id,name) VALUES (?,'Synthetic MP unit')", companyId);
        unitId = last("units");
        jdbc.update("INSERT INTO businesses(company_id,unit_id,name) VALUES (?,?,'Synthetic MP business')", companyId, unitId);
        businessId = last("businesses");
        jdbc.update("""
            INSERT INTO sales_inventory_warehouses
            (company_id,warehouse_code,name,type,status,business_unit_id,business_id)
            VALUES (?,?,'Synthetic MP warehouse','main','active',?,?)
            """, companyId, UUID.randomUUID().toString(), unitId, businessId);
        warehouseId = last("sales_inventory_warehouses");
        jdbc.update("""
            INSERT INTO pos_cash_registers
            (company_id,warehouse_id,unit_id,business_id,code,name,status,is_active,created_by_user_id)
            VALUES (?,?,?,?,'MP-SYNTHETIC','Synthetic MP register','ACTIVE',1,?)
            """, companyId, warehouseId, unitId, businessId, actorId);
        registerId = last("pos_cash_registers");
        jdbc.update("""
            INSERT INTO pos_shifts
            (company_id,unit_id,business_id,warehouse_id,cash_register_id,opened_by_user_id,
             created_by_user_id,status,currency_code,opening_amount,expected_cash_amount)
            VALUES (?,?,?,?,?,?,?,'OPEN','MXN',0,0)
            """, companyId, unitId, businessId, warehouseId, registerId, actorId, actorId);
        shiftId = last("pos_shifts");
    }
    long last(String trustedTable) {
        return jdbc.queryForObject("SELECT MAX(id) FROM " + trustedTable + " WHERE company_id=?", Long.class, companyId);
    }
}
