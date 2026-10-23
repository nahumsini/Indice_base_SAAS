package com.indice.erp.sales.funneling.brand;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.email.mailbox.MailFilePolicy;
import com.indice.erp.storage.*;
import jakarta.validation.Validator;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.*;
import static org.springframework.http.HttpStatus.*;
import static com.indice.erp.sales.funneling.brand.BrandAccess.*;
import static com.indice.erp.sales.funneling.brand.BrandContracts.*;

@Service
public class BrandFileService {
    private final JdbcTemplate db;private final BrandAccess access;private final ObjectStorageService storage;
    private final CompanyStorageMeter meter;private final Validator validator;private final BrandLibraryService library;private final String bucket;
    public BrandFileService(JdbcTemplate db,BrandAccess access,ObjectStorageService storage,CompanyStorageMeter meter,Validator validator,BrandLibraryService library,ObjectStorageProperties properties){this.db=db;this.access=access;this.storage=storage;this.meter=meter;this.validator=validator;this.library=library;bucket=properties.getMinio().getBucketSalesDocuments();}
    private record Row(Asset asset,long owner,String key){@Override public String toString(){return "BrandAsset[redacted]";}}
    private Row row(AuthSessionUser a,String id){uuid(id);return db.query("SELECT * FROM sales_brand_assets WHERE company_id=? AND id=?",(r,n)->new Row(BrandLibraryService.asset(r),r.getLong("created_by"),r.getString("object_key")),a.companyId(),id).stream().findFirst().orElseThrow(()->new org.springframework.web.server.ResponseStatusException(NOT_FOUND,"brand_asset_unavailable"));}
    @Transactional(readOnly=true)
    public List<Asset> list(AuthSessionUser a,boolean archived){access.read(a);return db.query("SELECT * FROM sales_brand_assets WHERE company_id=? AND status=? ORDER BY created_at DESC,id LIMIT 100",(r,n)->BrandLibraryService.asset(r),a.companyId(),archived?"ARCHIVED":"READY");}
    @Transactional
    public Upload upload(AuthSessionUser a,String expected,UploadInput in){
        access.mutation(a,expected);require(in!=null&&validator.validate(in).isEmpty(),BAD_REQUEST,"brand_file_invalid");uuid(in.requestId());require(storage.isEnabled(),SERVICE_UNAVAILABLE,"brand_storage_unavailable");
        require(Set.of("image/png","image/jpeg","application/pdf","text/plain").contains(in.contentType()),BAD_REQUEST,"brand_file_invalid");MailFilePolicy.metadata(in.filename(),in.contentType(),in.sizeBytes());
        require(!in.category().equals("LOGO_VARIANT")||Set.of("image/png","image/jpeg").contains(in.contentType()),BAD_REQUEST,"brand_file_invalid");
        require(in.category().equals("LOGO_VARIANT")||in.logoVariant().isEmpty(),BAD_REQUEST,"brand_file_invalid");
        var exists=db.queryForList("SELECT id FROM sales_brand_assets WHERE company_id=? AND id=?",String.class,a.companyId(),in.requestId());
        String key="brand-library/"+a.companyId()+"/staging/"+in.requestId();
        if(exists.isEmpty()){
            long count=db.queryForObject("SELECT COUNT(*) FROM sales_brand_assets WHERE company_id=? AND (status='READY' OR (status='PENDING' AND created_at>CURRENT_TIMESTAMP(6)-INTERVAL 10 MINUTE))",Long.class,a.companyId());require(count<30,UNPROCESSABLE_ENTITY,"brand_file_limit");
            require(db.queryForObject("SELECT COUNT(*) FROM sales_brand_assets WHERE company_id=? AND status<>'PENDING'",Long.class,a.companyId())<100,UNPROCESSABLE_ENTITY,"brand_file_limit");
            db.update("INSERT INTO sales_brand_assets(company_id,id,created_by,filename,content_type,size_bytes,category,object_key,description,logo_variant) VALUES(?,?,?,?,?,?,?,?,?,?)",a.companyId(),in.requestId(),a.userId(),in.filename(),in.contentType(),in.sizeBytes(),in.category(),key,in.description(),in.logoVariant());
        }else{var old=row(a,in.requestId());require(old.owner()==a.userId()&&(old.asset().status().equals("PENDING")||old.asset().status().equals("READY"))&&old.asset().name().equals(in.filename())&&old.asset().contentType().equals(in.contentType())&&old.asset().sizeBytes()==in.sizeBytes()&&old.asset().category().equals(in.category())&&old.asset().description().equals(in.description())&&old.asset().logoVariant().equals(in.logoVariant()),CONFLICT,"brand_upload_changed");if(old.asset().status().equals("READY"))return new Upload(in.requestId(),null,Map.of(),old.asset());}
        var signed=meter.presign(a.companyId(),"crm",bucket,key,in.contentType(),in.sizeBytes(),300);return new Upload(in.requestId(),signed.uploadUrl(),signed.uploadHeaders(),null);
    }
    @Transactional
    public Asset register(AuthSessionUser a,String expected,String id){
        access.mutation(a,expected);var row=row(a,id);require(row.owner()==a.userId(),NOT_FOUND,"brand_asset_unavailable");if(row.asset().status().equals("READY"))return row.asset();require(row.asset().status().equals("PENDING"),CONFLICT,"brand_asset_unavailable");
        require(db.queryForObject("SELECT COUNT(*) FROM sales_brand_assets WHERE company_id=? AND status='READY'",Long.class,a.companyId())<30,UNPROCESSABLE_ENTITY,"brand_file_limit");
        require(db.queryForObject("SELECT COUNT(*) FROM sales_brand_assets WHERE company_id=? AND status<>'PENDING'",Long.class,a.companyId())<100,UNPROCESSABLE_ENTITY,"brand_file_limit");
        require(storage.objectExists(bucket,row.key()),BAD_REQUEST,"brand_file_missing");var meta=storage.objectMetadata(bucket,row.key());require(meta.sizeBytes()==row.asset().sizeBytes()&&meta.contentType().equalsIgnoreCase(row.asset().contentType()),BAD_REQUEST,"brand_file_mismatch");
        String sealed="brand-library/"+a.companyId()+"/assets/"+id+"/"+UUID.randomUUID();storage.copyObject(bucket,row.key(),sealed);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){@Override public void afterCompletion(int status){if(status!=STATUS_COMMITTED)remove(sealed);}});
        var bytes=storage.readObject(bucket,sealed,5*1024*1024+1);require(bytes.length==row.asset().sizeBytes(),BAD_REQUEST,"brand_file_mismatch");MailFilePolicy.bytes(row.asset().name(),row.asset().contentType(),bytes);
        meter.commitMoved(a.companyId(),bucket,row.key(),sealed,row.asset().sizeBytes());db.update("UPDATE sales_brand_assets SET status='READY',object_key=? WHERE company_id=? AND id=?",sealed,a.companyId(),id);
        StorageCommitCleanup.afterCommit(()->remove(row.key()));library.audit(a,"ASSET_ADDED",id,1);return row(a,id).asset();
    }
    @Transactional
    public Asset status(AuthSessionUser a,String expected,String id,boolean archived){access.mutation(a,expected);var row=row(a,id);require(!row.asset().status().equals("PENDING"),CONFLICT,"brand_asset_unavailable");String next=archived?"ARCHIVED":"READY";if(!archived&&row.asset().status().equals("ARCHIVED")){long count=db.queryForObject("SELECT COUNT(*) FROM sales_brand_assets WHERE company_id=? AND status='READY'",Long.class,a.companyId());require(count<30,UNPROCESSABLE_ENTITY,"brand_file_limit");}if(!next.equals(row.asset().status())){db.update("UPDATE sales_brand_assets SET status=? WHERE company_id=? AND id=?",next,a.companyId(),id);library.audit(a,archived?"ASSET_ARCHIVED":"ASSET_RESTORED",id,0);}return row(a,id).asset();}
    @Transactional(readOnly=true)
    public byte[] download(AuthSessionUser a,String id){access.read(a);var row=row(a,id);require(!row.asset().status().equals("PENDING"),NOT_FOUND,"brand_asset_unavailable");var bytes=storage.readObject(bucket,row.key(),5*1024*1024);require(bytes.length==row.asset().sizeBytes(),CONFLICT,"brand_file_mismatch");MailFilePolicy.bytes(row.asset().name(),row.asset().contentType(),bytes);return bytes;}
    @Transactional(readOnly=true)
    public Asset metadata(AuthSessionUser a,String id){access.read(a);var row=row(a,id);require(!row.asset().status().equals("PENDING"),NOT_FOUND,"brand_asset_unavailable");return row.asset();}
    private void remove(String key){try{storage.deleteObject(bucket,key);}catch(RuntimeException ignored){}}
}
