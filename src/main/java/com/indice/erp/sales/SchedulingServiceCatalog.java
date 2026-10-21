package com.indice.erp.sales;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Inventory-owned minimal service projection for Scheduling; excludes prices and stock authority. */
@Service
public class SchedulingServiceCatalog {
    public record Item(long id,String name,String description,String sku,boolean active) { }
    public record Page(List<Item> items,long total,int page,int pageSize) { }
    private final JdbcTemplate db;
    public SchedulingServiceCatalog(JdbcTemplate db){this.db=db;}
    public Page read(long company,String search,int page){
        if(company<=0||page<1||page>10000||search==null||search.length()>180)throw new IllegalArgumentException();
        var term="%"+search.trim().replace("!","!!").replace("%","!%").replace("_","!_")+"%";
        String scope=" WHERE company_id=? AND UPPER(type)='SERVICE' AND deleted_at IS NULL AND (name LIKE ? ESCAPE '!' OR COALESCE(sku,'') LIKE ? ESCAPE '!')";
        long total=db.queryForObject("SELECT COUNT(*) FROM sales_products"+scope,Long.class,company,term,term);
        var items=db.query("SELECT id,name,description,sku,status FROM sales_products"+scope+" ORDER BY name,id LIMIT 25 OFFSET ?",
            (r,n)->new Item(r.getLong(1),r.getString(2),r.getString(3),r.getString(4),"active".equalsIgnoreCase(r.getString(5))),company,term,term,(page-1)*25);
        return new Page(items,total,page,25);
    }
    public Item selected(long company,long id){
        return db.query("SELECT id,name,description,sku,status FROM sales_products WHERE company_id=? AND id=? AND UPPER(type)='SERVICE' AND deleted_at IS NULL FOR UPDATE",
            (r,n)->new Item(r.getLong(1),r.getString(2),r.getString(3),r.getString(4),"active".equalsIgnoreCase(r.getString(5))),company,id)
            .stream().findFirst().filter(Item::active).orElseThrow(()->new IllegalArgumentException("scheduling_catalog_service_unavailable"));
    }
    public boolean available(long company,long id){return Boolean.TRUE.equals(db.queryForObject("SELECT EXISTS(SELECT 1 FROM sales_products WHERE company_id=? AND id=? AND UPPER(type)='SERVICE' AND LOWER(status)='active' AND deleted_at IS NULL)",Boolean.class,company,id));}
}
