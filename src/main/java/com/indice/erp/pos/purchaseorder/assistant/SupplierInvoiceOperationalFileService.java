package com.indice.erp.pos.purchaseorder.assistant;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierInvoiceResponse;
import com.indice.erp.storage.*;
import java.sql.Statement;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
public class SupplierInvoiceOperationalFileService {
    private final ProcurementAssistantService owner;private final JdbcTemplate jdbc;private final CompanyStorageMeter meter;
    private final ObjectStorageService storage;private final ObjectStorageProperties properties;
    public SupplierInvoiceOperationalFileService(ProcurementAssistantService owner,JdbcTemplate jdbc,CompanyStorageMeter meter,ObjectStorageService storage,ObjectStorageProperties properties){this.owner=owner;this.jdbc=jdbc;this.meter=meter;this.storage=storage;this.properties=properties;}
    public SupplierInvoiceResponse target(AuthSessionUser user,long id,boolean write,boolean lock){
        if(lock&&jdbc.queryForList("SELECT id FROM pos_supplier_invoices WHERE company_id=? AND id=? FOR UPDATE",Long.class,user.companyId(),id).isEmpty())throw new NoSuchElementException("Invoice not found.");
        var result=owner.read(user,"get_supplier_invoice",new ProcurementAssistantContracts.Query(id,null,null,null,null,null,null,null)).records().invoices().getFirst();
        if(write&&"REJECTED".equals(String.valueOf(result.status())))throw new IllegalArgumentException("Rejected invoices cannot receive new attachments.");return result;
    }
    public List<OperationalFileReference> files(AuthSessionUser user,long id){target(user,id,false,false);return jdbc.query("SELECT id,file_name,mime_type,size_bytes,object_key FROM pos_supplier_invoice_attachments WHERE company_id=? AND invoice_id=? ORDER BY id",(rs,n)->new OperationalFileReference(rs.getLong("id"),rs.getString("file_name"),rs.getString("mime_type"),rs.getLong("size_bytes"),rs.getString("object_key")),user.companyId(),id);}
    public String reserve(AuthSessionUser user,long id,String name,String mime,long bytes){target(user,id,true,false);var key=prefix(user.companyId(),id)+UUID.randomUUID();meter.reserve(user.companyId(),"INVENTORY",bucket(),key,bytes);return key;}
    @Transactional
    public void register(AuthSessionUser user,long id,String name,String mime,long bytes,String key){
        target(user,id,true,true);if(!key.startsWith(prefix(user.companyId(),id))||!storage.objectExists(bucket(),key))throw new IllegalArgumentException("Uploaded invoice attachment unavailable.");
        meter.commit(user.companyId(),bucket(),key,bytes);
        jdbc.update("INSERT INTO pos_supplier_invoice_attachments (company_id,invoice_id,file_name,mime_type,size_bytes,object_key,created_by_user_id) VALUES (?,?,?,?,?,?,?)",user.companyId(),id,name,mime,bytes,key,user.userId());
    }
    public String bucket(){return properties.getMinio().getBucketSalesDocuments();}
    private static String prefix(long company,long id){return "inventory/supplier-invoices/"+company+"/"+id+"/attachments/";}
}
