package com.indice.erp.sales;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrOperationalScopeService;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.storage.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Commercial attachment ownership; no AI-specific contracts enter the domain. */
@Service
public class SalesOperationalFileService {
    private final SalesRepository records; private final SalesWorkflowRepository scope;
    private final HrOperationalScopeService scopes; private final SalesService owner;
    private final CompanyStorageMeter meter; private final ObjectStorageService storage;
    private final ObjectStorageProperties properties; private final JdbcTemplate jdbc;
    public SalesOperationalFileService(SalesRepository records,SalesWorkflowRepository scope,HrOperationalScopeService scopes,
        SalesService owner,CompanyStorageMeter meter,ObjectStorageService storage,ObjectStorageProperties properties,JdbcTemplate jdbc) {
        this.records=records;this.scope=scope;this.scopes=scopes;this.owner=owner;this.meter=meter;this.storage=storage;this.properties=properties;this.jdbc=jdbc;
    }
    public Map<String,Object> target(AuthSessionUser user,String kind,long id,boolean write,boolean lock) {
        if(!Set.of("product","sale","contract").contains(kind))throw new IllegalArgumentException("Unsupported commercial file target.");
        var assignment=scopes.resolve(user);
        if(kind.equals("product")) {
            if(write&&!assignment.isCorporateOffice())throw new SecurityException("Catalog attachment changes require corporate scope.");
            if(lock)scope.lockNamedReference(user.companyId(),"product",id);
        } else scope.require(user,assignment,kind,id,lock);
        var value=records.get(user.companyId(),SalesDefinitions.definitions().get(switch(kind){case "product"->"products";case "sale"->"sales";default->"contracts";}),id);
        if(write&&kind.equals("sale")&&Set.of("cancelled","canceled","rejected","voided").contains(Objects.toString(value.get("commercialStatus"),"")))
            throw new IllegalArgumentException("Payment evidence requires an active sale.");
        if(write&&kind.equals("contract")&&Set.of("cancelled","canceled","rejected").contains(Objects.toString(value.get("status"),"")))
            throw new IllegalArgumentException("Cancelled contracts cannot receive new attachments.");
        return value;
    }
    public List<OperationalFileReference> files(AuthSessionUser user,String kind,long id) {
        target(user,kind,id,false,false);
        return jdbc.query("SELECT id,file_name,object_key,JSON_UNQUOTE(JSON_EXTRACT(metadata_json,'$.contentType')) AS mime,JSON_EXTRACT(metadata_json,'$.sizeBytes') AS bytes FROM sales_files WHERE company_id=? AND entity_type=? AND entity_id=? AND deleted_at IS NULL AND source='object_storage' AND object_key IS NOT NULL ORDER BY id",
            (rs,n)->new OperationalFileReference(rs.getLong("id"),rs.getString("file_name"),rs.getString("mime"),rs.getLong("bytes"),rs.getString("object_key")),user.companyId(),kind,id);
    }
    public String reserve(AuthSessionUser user,String kind,long id,String name,String mime,long bytes) {
        target(user,kind,id,true,false);var payload=payload(name,mime,bytes,null);
        if(kind.equals("product"))return String.valueOf(owner.createProductImageUpload(user.companyId(),payload).get("object_key"));
        if(kind.equals("sale"))return String.valueOf(owner.createSalePaymentEvidenceUploadForSale(user.companyId(),id,payload).get("object_key"));
        var key=prefix(user.companyId(),id)+UUID.randomUUID();meter.reserve(user.companyId(),"SALES",bucket(),key,bytes);return key;
    }
    @Transactional
    public void register(AuthSessionUser user,String kind,long id,String name,String mime,long bytes,String key) {
        target(user,kind,id,true,true);var payload=payload(name,mime,bytes,key);
        if(kind.equals("product")){owner.registerProductImage(user.companyId(),user.userId(),id,payload);return;}
        if(kind.equals("sale")){owner.registerAssistantSalePaymentEvidence(user.companyId(),user.userId(),id,payload);return;}
        if(!key.startsWith(prefix(user.companyId(),id))||!storage.objectExists(bucket(),key))throw new IllegalArgumentException("Uploaded contract document unavailable.");
        if(records.findFileByObjectKey(user.companyId(),key)!=null)throw new IllegalArgumentException("Contract document is already registered.");
        meter.commit(user.companyId(),bucket(),key,bytes);
        records.createFile(user.companyId(),user.userId(),Map.of("entityType","contract","entityId",id,"fileName",name,"fileKind","contract_document","fileStatus","uploaded","source","object_storage","objectKey",key,"metadata",Map.of("contentType",mime,"sizeBytes",bytes)));
    }
    public String bucket(){return properties.getMinio().getBucketSalesDocuments();}
    private static String prefix(long company,long id){return "sales/contracts/"+company+"/"+id+"/documents/";}
    private static Map<String,Object> payload(String name,String mime,long bytes,String key){var result=new LinkedHashMap<String,Object>();result.put("fileName",name);result.put("contentType",mime);result.put("sizeBytes",bytes);if(key!=null)result.put("objectKey",key);return result;}
}
