package com.indice.erp.pos.assistant;

import com.indice.erp.pos.PosContext;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Private snapshots and deterministic owner row locks, never a public collection API. */
@Repository
class PosAssistantRepository {
    private final JdbcTemplate jdbc;
    PosAssistantRepository(JdbcTemplate jdbc) {this.jdbc=jdbc;}
    void lockCompany(PosContext c) {jdbc.queryForList("SELECT id FROM companies WHERE id=? FOR UPDATE",c.companyId());}
    List<Map<String,Object>> warehouse(PosContext c,long id,boolean lock) {return jdbc.queryForList("SELECT id,name,status,business_unit_id,business_id FROM sales_inventory_warehouses WHERE company_id=? AND id=? AND deleted_at IS NULL"+(lock?" FOR UPDATE":""),c.companyId(),id);}
    List<Map<String,Object>> product(PosContext c,long id,boolean lock) {return jdbc.queryForList("SELECT id,name,sku,type,currency,price,inventory_ready,pos_ready,status,metadata_json FROM sales_products WHERE company_id=? AND id=? AND deleted_at IS NULL"+(lock?" FOR UPDATE":""),c.companyId(),id);}
    List<Map<String,Object>> balances(PosContext c,long warehouse,Collection<Long> products,boolean lock) {
        if(products.isEmpty())return List.of();var args=new ArrayList<Object>(List.of(c.companyId(),warehouse));args.addAll(new TreeSet<>(products));
        return jdbc.queryForList("SELECT id,product_id,available_quantity,reserved_quantity,unit_cost,uses_inventory FROM sales_inventory_balances WHERE company_id=? AND warehouse_id=? AND product_id IN ("+String.join(",",Collections.nCopies(products.size(),"?"))+") AND deleted_at IS NULL ORDER BY product_id"+(lock?" FOR UPDATE":""),args.toArray());
    }
    List<Map<String,Object>> accounts(PosContext c,Collection<Long> ids,boolean lock) {
        if(ids.isEmpty())return List.of();var args=new ArrayList<Object>(List.of(c.companyId()));args.addAll(new TreeSet<>(ids));
        return jdbc.queryForList("SELECT id,unit_id,business_id,type,currency_code,status,system_key,current_balance,pending_balance FROM finance_payment_accounts WHERE company_id=? AND id IN ("+String.join(",",Collections.nCopies(ids.size(),"?"))+") AND deleted_at IS NULL ORDER BY id"+(lock?" FOR UPDATE":""),args.toArray());
    }
    void lockRegister(PosContext c,long id) {jdbc.queryForList("SELECT id FROM pos_cash_registers WHERE company_id=? AND id=? AND deleted_at IS NULL FOR UPDATE",c.companyId(),id);}
    void lockTicket(PosContext c,long id) {jdbc.queryForList("SELECT id FROM pos_tickets WHERE company_id=? AND id=? AND deleted_at IS NULL FOR UPDATE",c.companyId(),id);jdbc.queryForList("SELECT id FROM pos_payments WHERE company_id=? AND ticket_id=? ORDER BY id FOR UPDATE",c.companyId(),id);}
    List<Map<String,Object>> sourceOrder(PosContext c,String kind,long id,boolean lock) {
        String table=switch(kind) {case "preticket"->"pos_self_service_pretickets";case "restaurant"->"pos_restaurant_orders";default->throw new IllegalArgumentException("Unknown checkout source.");};
        return jdbc.queryForList("SELECT * FROM "+table+" WHERE company_id=? AND id=?"+(lock?" FOR UPDATE":""),c.companyId(),id);
    }
    List<Map<String,Object>> returns(PosContext c,long shift,boolean lock) {return jdbc.queryForList("SELECT id,ticket_id,status,total_amount,currency_code FROM pos_returns WHERE company_id=? AND shift_id=? ORDER BY id"+(lock?" FOR UPDATE":""),c.companyId(),shift);}
    List<Map<String,Object>> registerPopulation(PosContext c,boolean lock) {return jdbc.queryForList("SELECT id,code,status,warehouse_id FROM pos_cash_registers WHERE company_id=? AND deleted_at IS NULL ORDER BY id"+(lock?" FOR UPDATE":""),c.companyId());}
    void lockProvider(PosContext c,long id) {jdbc.queryForList("SELECT id FROM finance_providers WHERE company_id=? AND id=? FOR UPDATE",c.companyId(),id);}
}
