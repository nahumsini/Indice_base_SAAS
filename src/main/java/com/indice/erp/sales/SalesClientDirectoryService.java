package com.indice.erp.sales;

import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Explicit read-only master-client contract. Consumers cannot own or duplicate Sales contacts. */
@Service
public class SalesClientDirectoryService {
    public record Client(long id,String companyName,String contactPerson,String email,String phone,String status) { }
    public record Directory(List<Client> items,long total,int page,int pageSize) { }
    private final JdbcTemplate db;
    private final com.indice.erp.access.module.ModuleAccessService modules;
    private final com.indice.erp.access.tab.TabPermissionAccessService tabs;
    public SalesClientDirectoryService(JdbcTemplate db,com.indice.erp.access.module.ModuleAccessService modules,
        com.indice.erp.access.tab.TabPermissionAccessService tabs){this.db=db;this.modules=modules;this.tabs=tabs;}
    public boolean canSelect(com.indice.erp.auth.AuthSessionUser actor){
        return modules.canAccess(actor,"crm")&&tabs.canAccess(actor,new com.indice.erp.access.tab.TabPermissionRequirement(List.of("crm.contacts")));
    }
    public Client selected(com.indice.erp.auth.AuthSessionUser actor,long id){
        if(!canSelect(actor))throw new SecurityException();
        return db.query("SELECT id,company_name,contact_person,email,phone,status FROM sales_contacts WHERE company_id=? AND id=? AND deleted_at IS NULL",
            (r,n)->new Client(r.getLong(1),r.getString(2),r.getString(3),r.getString(4),r.getString(5),r.getString(6)),actor.companyId(),id)
            .stream().findFirst().orElseThrow(java.util.NoSuchElementException::new);
    }
    @Transactional(readOnly=true)
    public Directory read(long company,String search,int page,int size){
        if(company<=0||page<1||page>10000||!List.of(10,25,50,100,200).contains(size)||search!=null&&search.length()>180)
            throw new IllegalArgumentException("Invalid directory scope.");
        String scope=" WHERE company_id=? AND deleted_at IS NULL";
        var args=new ArrayList<Object>();args.add(company);
        if(search!=null&&!search.isBlank()){
            scope+=" AND (company_name LIKE ? OR contact_person LIKE ? OR email LIKE ?)";
            String term="%"+search.trim().replace("!","!!").replace("%","!%").replace("_","!_")+"%";
            scope=scope.replace("LIKE ?","LIKE ? ESCAPE '!'");args.addAll(List.of(term,term,term));
        }
        long total=db.queryForObject("SELECT COUNT(*) FROM sales_contacts"+scope,Long.class,args.toArray());
        args.add(size);args.add((page-1)*size);
        var rows=db.query("SELECT id,company_name,contact_person,email,phone,status FROM sales_contacts"+scope+" ORDER BY company_name,id LIMIT ? OFFSET ?",
            (r,n)->new Client(r.getLong("id"),r.getString("company_name"),r.getString("contact_person"),r.getString("email"),r.getString("phone"),r.getString("status")),args.toArray());
        return new Directory(rows,total,page,size);
    }
}
