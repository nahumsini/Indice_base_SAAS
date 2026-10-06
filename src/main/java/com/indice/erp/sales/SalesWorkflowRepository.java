package com.indice.erp.sales;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrOperationalScope;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class SalesWorkflowRepository {
    private final JdbcTemplate jdbc;
    SalesWorkflowRepository(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    String collection(String kind) {
        return switch(kind) { case "sale" -> "sales"; case "contract" -> "contracts";
            case "follow_up" -> "post-sales"; case "rule" -> "commission-rules";
            default -> throw new IllegalArgumentException("Unknown sales workflow kind."); };
    }
    String table(String kind) { return SalesDefinitions.definitions().get(collection(kind)).tableName(); }
    void require(AuthSessionUser user,HrOperationalScope scope,String kind,long id,boolean lock) {
        var args=new ArrayList<Object>(List.of(user.companyId(),id));
        String where=predicate(kind,scope,args);
        if(jdbc.queryForList("SELECT e.id FROM "+table(kind)+" e WHERE e.company_id = ? AND e.id = ? AND e.deleted_at IS NULL"+where+(lock?" FOR UPDATE":""),Long.class,args.toArray()).isEmpty())
            throw new NoSuchElementException("Sales workflow record not found.");
    }
    IdPage page(AuthSessionUser user,HrOperationalScope scope,String kind,SalesWorkflowContracts.Query q,int offset,int limit) {
        var args=new ArrayList<Object>(List.of(user.companyId()));
        var d=SalesDefinitions.definitions().get(collection(kind));
        String where=" FROM "+table(kind)+" e WHERE e.company_id = ? AND e.deleted_at IS NULL"+predicate(kind,scope,args);
        if(q.status()!=null) { where+=" AND e."+(kind.equals("sale")?"commercial_status":"status")+" = ?";args.add(q.status()); }
        if(q.query()!=null&&!q.query().isBlank()) { where+=" AND LOCATE(LOWER(?), LOWER(e."+d.codeColumnName()+")) > 0";args.add(q.query().trim()); }
        if(q.from()!=null||q.to()!=null) {
            if(!kind.equals("sale"))throw new IllegalArgumentException("Date filters apply only to sales.");
            if(q.from()!=null) {where+=" AND e.sale_date >= ?";args.add(q.from());}
            if(q.to()!=null) {where+=" AND e.sale_date <= ?";args.add(q.to());}
        }
        int count=jdbc.queryForObject("SELECT COUNT(*)"+where,Integer.class,args.toArray());
        if(offset>count)throw new IllegalArgumentException("Cursor is no longer valid.");
        args.add(limit);args.add(offset);
        return new IdPage(jdbc.queryForList("SELECT e.id"+where+" ORDER BY e.id LIMIT ? OFFSET ?",Long.class,args.toArray()),count);
    }
    private String predicate(String kind,HrOperationalScope scope,List<Object> args) {
        if(kind.equals("sale")) { args.addAll(scope.assignmentParameters());return scope.assignmentPredicate("e.unit_id","e.business_id","e.company_id"); }
        if(kind.equals("rule")) { if(!scope.isCorporateOffice())throw new SecurityException("Company-wide commission policy requires corporate scope.");return ""; }
        if(scope.isCorporateOffice())return "";
        args.addAll(scope.assignmentParameters());args.addAll(scope.assignmentParameters());
        return " AND (EXISTS (SELECT 1 FROM sales_opportunities owner WHERE owner.company_id=e.company_id AND owner.id=e.opportunity_id AND owner.deleted_at IS NULL"
            +scope.assignmentPredicate("owner.unit_id","owner.business_id","owner.company_id")+") OR (e.opportunity_id IS NULL AND EXISTS (SELECT 1 FROM sales_contacts owner WHERE owner.company_id=e.company_id AND owner.id=e.contact_id AND owner.deleted_at IS NULL"
            +scope.assignmentPredicate("owner.unit_id","owner.business_id","owner.company_id")+")))";
    }
    void lockCompany(long company) { jdbc.queryForList("SELECT id FROM companies WHERE id=? FOR UPDATE",company); }
    List<Map<String,Object>> balances(long company,long warehouse,Collection<Long> products,boolean lock) {
        if(products.isEmpty())return List.of();
        var args=new ArrayList<Object>(List.of(company,warehouse));args.addAll(new TreeSet<>(products));
        return jdbc.queryForList("SELECT id, product_id, available_quantity, reserved_quantity, unit_cost, uses_inventory FROM sales_inventory_balances WHERE company_id=? AND warehouse_id=? AND product_id IN ("
            +String.join(",",Collections.nCopies(products.size(),"?"))+") AND deleted_at IS NULL ORDER BY product_id"+(lock?" FOR UPDATE":""),args.toArray());
    }
    List<Map<String,Object>> financialEvidence(long company,long id,boolean lock) {
        return jdbc.queryForList("SELECT id,payment_account_id,available_delta,currency_code,unit_id,business_id,event_key FROM finance_payment_account_movements WHERE company_id=? AND source_module='SALES' AND source_id=? ORDER BY id"+(lock?" FOR UPDATE":""),company,String.valueOf(id));
    }
    List<Map<String,Object>> credits(long company,long id,boolean lock) {
        return jdbc.queryForList("SELECT id,original_amount,status FROM finance_receivable_accounts WHERE company_id=? AND sales_record_id=? AND deleted_at IS NULL AND status<>'CANCELLED' ORDER BY id"+(lock?" FOR UPDATE":""),company,id);
    }
    List<Map<String,Object>> rules(long company,boolean lock) {
        return jdbc.queryForList("SELECT id,name,status,commission_type,commission_value,user_ids_json,product_ids_json,valid_from,valid_until,priority FROM sales_commission_rules WHERE company_id=? AND deleted_at IS NULL ORDER BY id"+(lock?" FOR UPDATE":""),company);
    }
    void lockNamedReference(long company,String kind,long id) {
        String table=switch(kind) {case "product"->"sales_products";case "warehouse"->"sales_inventory_warehouses";
            case "account"->"finance_payment_accounts";case "member"->"user_companies";default->throw new IllegalArgumentException("Unknown workflow reference.");};
        jdbc.queryForList("SELECT id FROM "+table+" WHERE company_id=? AND id=? FOR UPDATE",company,id);
    }
    boolean hasQuoteSale(long company,long quote) { return jdbc.queryForObject("SELECT COUNT(*) FROM sales_records WHERE company_id=? AND quote_id=? AND deleted_at IS NULL",Integer.class,company,quote)>0; }
    record IdPage(List<Long> ids,int count) {}
}
