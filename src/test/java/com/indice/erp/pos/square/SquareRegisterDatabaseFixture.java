package com.indice.erp.pos.square;

import com.indice.erp.pos.*;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest(properties={
    "spring.datasource.url=jdbc:mysql://127.0.0.1:${indice.test.mysql-port:3307}/indice_test_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC",
    "spring.datasource.username=indice_test_user","spring.datasource.password=indice_test_pass",
    "app.pos.mercado-pago.enabled=false","app.pos.square.enabled=false","app.pos.square.environment=sandbox"})
@Transactional
abstract class SquareRegisterDatabaseFixture {
    @Autowired JdbcTemplate jdbc;
    long company,actor,unit,business,warehouse,register,shift; PosContext context;
    @BeforeEach void register() {
        assertEquals("indice_test_db",jdbc.queryForObject("SELECT DATABASE()",String.class));
        var key=UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies(name) VALUES (?)","Synthetic Square "+key);
        company=jdbc.queryForObject("SELECT id FROM companies WHERE name=?",Long.class,"Synthetic Square "+key);
        jdbc.update("INSERT INTO users(email,password_hash) VALUES (?,'isolated-no-login')",key+"@example.test");
        actor=jdbc.queryForObject("SELECT id FROM users WHERE email=?",Long.class,key+"@example.test");
        jdbc.update("INSERT INTO user_companies(user_id,company_id,role,status) VALUES (?,?,'admin','active')",actor,company);
        jdbc.update("INSERT INTO units(company_id,name) VALUES (?,'Square unit')",company); unit=last("units");
        jdbc.update("INSERT INTO businesses(company_id,unit_id,name) VALUES (?,?,'Square business')",company,unit); business=last("businesses");
        jdbc.update("INSERT INTO sales_inventory_warehouses(company_id,warehouse_code,name,type,status,business_unit_id,business_id) VALUES (?,?,'Square warehouse','main','active',?,?)",company,key,unit,business);
        warehouse=last("sales_inventory_warehouses");
        jdbc.update("INSERT INTO pos_cash_registers(company_id,warehouse_id,unit_id,business_id,code,name,status,is_active,created_by_user_id) VALUES (?,?,?,?,'SQ-TEST','Square register','ACTIVE',1,?)",company,warehouse,unit,business,actor); register=last("pos_cash_registers");
        jdbc.update("INSERT INTO pos_shifts(company_id,unit_id,business_id,warehouse_id,cash_register_id,opened_by_user_id,created_by_user_id,status,currency_code,opening_amount,expected_cash_amount) VALUES (?,?,?,?,?,?,?,'OPEN','CAD',0,0)",company,unit,business,warehouse,register,actor,actor); shift=last("pos_shifts");
        context=new PosContext(actor,company,"Square actor","admin",true,PosScope.corporateOffice());
    }
    long last(String table) { return jdbc.queryForObject("SELECT MAX(id) FROM "+table+" WHERE company_id=?",Long.class,company); }
}
