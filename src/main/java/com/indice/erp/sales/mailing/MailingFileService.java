package com.indice.erp.sales.mailing;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.*;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.email.mailbox.*;
import com.indice.erp.storage.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.*;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;
import static com.indice.erp.sales.mailing.MailingFileContracts.*;

/** Sales owns company template assets. Email owns validation and private draft transport.
 * Verified objects are immutable; snapshots reference them without making another quota copy. */
@Service
public class MailingFileService {
    private final JdbcTemplate db;
    private final ModuleAccessService modules;
    private final TabPermissionAccessService tabs;
    private final ObjectStorageService storage;
    private final CompanyStorageMeter meter;
    private final String bucket;
    public MailingFileService(JdbcTemplate db,ModuleAccessService modules,TabPermissionAccessService tabs,
        ObjectStorageService storage,CompanyStorageMeter meter,ObjectStorageProperties properties) {
        this.db=db;this.modules=modules;this.tabs=tabs;this.storage=storage;this.meter=meter;
        this.bucket=properties.getMinio().getBucketDocuments();
    }
    private static void require(boolean value,org.springframework.http.HttpStatus status,String code) {
        if(!value)throw new ResponseStatusException(status,code);
    }
    private static void uuid(String id) {
        try {require(UUID.fromString(id).toString().equals(id),BAD_REQUEST,"mailing_file_invalid");}
        catch(IllegalArgumentException|NullPointerException invalid){throw new ResponseStatusException(BAD_REQUEST,"mailing_file_invalid");}
    }
    public void readAccess(AuthSessionUser actor) {
        require(modules.canAccess(actor,"crm")&&tabs.canAccess(actor,TabPermissionRequirement.one("crm.mailing")),FORBIDDEN,"mailing_file_access_denied");
    }
    private void mutation(AuthSessionUser actor) {
        readAccess(actor);require(MailingService.manager(actor),FORBIDDEN,"mailing_template_edit_forbidden");
        db.queryForObject("SELECT id FROM companies WHERE id=? FOR UPDATE",Long.class,actor.companyId());
        require(modules.companyCanAccessForMutation(actor.companyId(),"crm"),FORBIDDEN,"mailing_module_unavailable");
    }
    private record Row(File file,long owner,String key,String state) { @Override public String toString(){return "MailingFile[redacted]";} }
    private Row row(AuthSessionUser actor,String id) {
        uuid(id);
        return db.query("SELECT * FROM sales_mailing_files WHERE company_id=? AND id=?",
            (r,n)->new Row(new File(r.getString("id"),r.getString("filename"),r.getString("content_type"),r.getLong("size_bytes")),r.getLong("created_by"),r.getString("object_key"),r.getString("status")),actor.companyId(),id)
            .stream().findFirst().orElseThrow(()->new ResponseStatusException(NOT_FOUND,"mailing_file_unavailable"));
    }
    private Row ready(AuthSessionUser actor,String id) {
        var row=row(actor,id);require(row.state().equals("READY"),CONFLICT,"mailing_file_not_ready");
        boolean shared=Boolean.TRUE.equals(db.queryForObject("SELECT EXISTS(SELECT 1 FROM sales_mailing_template_files WHERE company_id=? AND file_id=?)",Boolean.class,actor.companyId(),id));
        boolean campaign=tabs.canAccess(actor,TabPermissionRequirement.one("crm.contacts"))&&Boolean.TRUE.equals(db.queryForObject("SELECT EXISTS(SELECT 1 FROM sales_mailing_campaign_files WHERE company_id=? AND file_id=?)",Boolean.class,actor.companyId(),id));
        require(row.owner()==actor.userId()||shared||campaign,NOT_FOUND,"mailing_file_unavailable");return row;
    }
    @Transactional
    public Upload upload(AuthSessionUser actor,UploadInput in) {
        mutation(actor);uuid(in.requestId());require(storage.isEnabled(),SERVICE_UNAVAILABLE,"email_storage_unavailable");
        MailFilePolicy.metadata(in.filename(),in.contentType(),in.sizeBytes());
        var existing=db.queryForList("SELECT id FROM sales_mailing_files WHERE company_id=? AND id=?",String.class,actor.companyId(),in.requestId());
        String key="mailing/"+actor.companyId()+"/staging/"+in.requestId();
        if(!existing.isEmpty()) {
            var old=row(actor,in.requestId());require(old.owner()==actor.userId()&&old.state().equals("PENDING")&&old.file().filename().equals(in.filename())&&old.file().contentType().equals(in.contentType())&&old.file().sizeBytes()==in.sizeBytes(),CONFLICT,"mailing_file_upload_changed");
        } else {
            long pending=db.queryForObject("SELECT COUNT(*) FROM sales_mailing_files WHERE company_id=? AND created_by=? AND status='PENDING' AND created_at>CURRENT_TIMESTAMP(6)-INTERVAL 10 MINUTE",Long.class,actor.companyId(),actor.userId());
            require(pending<MailFilePolicy.COUNT,UNPROCESSABLE_ENTITY,"email_attachment_limit");
            db.update("INSERT INTO sales_mailing_files(company_id,id,created_by,filename,content_type,size_bytes,object_key) VALUES(?,?,?,?,?,?,?)",actor.companyId(),in.requestId(),actor.userId(),in.filename(),in.contentType(),in.sizeBytes(),key);
        }
        var upload=meter.presign(actor.companyId(),"crm",bucket,key,in.contentType(),in.sizeBytes(),300);
        return new Upload(in.requestId(),upload.uploadUrl(),upload.uploadHeaders());
    }
    @Transactional
    public File register(AuthSessionUser actor,String id) {
        mutation(actor);var row=row(actor,id);require(row.owner()==actor.userId(),NOT_FOUND,"mailing_file_unavailable");
        if(row.state().equals("READY"))return row.file();
        require(storage.objectExists(bucket,row.key()),BAD_REQUEST,"email_attachment_missing");
        var metadata=storage.objectMetadata(bucket,row.key());
        require(metadata.sizeBytes()==row.file().sizeBytes()&&row.file().contentType().equalsIgnoreCase(metadata.contentType()),BAD_REQUEST,"email_attachment_mismatch");
        String sealed="mailing/"+actor.companyId()+"/files/"+id+"/"+UUID.randomUUID();
        storage.copyObject(bucket,row.key(),sealed);
        // Rollback cleanup also covers metadata/meter errors after content verification.
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){
            @Override public void afterCompletion(int status){if(status!=STATUS_COMMITTED)delete(sealed);}
        });
        var bytes=storage.readObject(bucket,sealed,MailFilePolicy.MAX+1);
        require(bytes.length==row.file().sizeBytes(),BAD_REQUEST,"email_attachment_mismatch");
        MailFilePolicy.bytes(row.file().filename(),row.file().contentType(),bytes);
        meter.commitMoved(actor.companyId(),bucket,row.key(),sealed,row.file().sizeBytes());
        db.update("UPDATE sales_mailing_files SET status='READY',object_key=? WHERE company_id=? AND id=?",sealed,actor.companyId(),id);
        StorageCommitCleanup.afterCommit(()->delete(row.key()));return row.file();
    }
    private void delete(String key){try{storage.deleteObject(bucket,key);}catch(RuntimeException ignored){ }}
    private List<File> files(long company,String table,String column,String id) {
        return db.query("SELECT f.id,f.filename,f.content_type,f.size_bytes FROM "+table+" r JOIN sales_mailing_files f ON f.company_id=r.company_id AND f.id=r.file_id WHERE r.company_id=? AND r."+column+"=? AND f.status='READY' ORDER BY r.position,f.id",
            (r,n)->new File(r.getString(1),r.getString(2),r.getString(3),r.getLong(4)),company,id);
    }
    List<File> template(long company,String id){return files(company,"sales_mailing_template_files","template_id",id);}
    List<File> campaign(long company,String id){return files(company,"sales_mailing_campaign_files","campaign_id",id);}
    public List<File> validate(AuthSessionUser actor,List<String> ids) {
        readAccess(actor);require(ids!=null&&ids.size()<=MailFilePolicy.COUNT&&new HashSet<>(ids).size()==ids.size(),UNPROCESSABLE_ENTITY,"email_attachment_limit");
        var files=ids.stream().map(id->ready(actor,id).file()).toList();
        require(files.stream().mapToLong(File::sizeBytes).sum()<=MailFilePolicy.TOTAL,UNPROCESSABLE_ENTITY,"email_attachment_limit");return files;
    }
    void replace(AuthSessionUser actor,String id,List<String> ids,boolean template) {
        if(ids==null)return; // Old clients preserve an existing snapshot.
        validate(actor,ids);
        String table=template?"sales_mailing_template_files":"sales_mailing_campaign_files",column=template?"template_id":"campaign_id";
        db.update("DELETE FROM "+table+" WHERE company_id=? AND "+column+"=?",actor.companyId(),id);
        for(int i=0;i<ids.size();i++)db.update("INSERT INTO "+table+"(company_id,"+column+",file_id,position) VALUES(?,?,?,?)",actor.companyId(),id,ids.get(i),i);
    }
    @Transactional(readOnly=true)
    public MailboxTransport.FilePart download(AuthSessionUser actor,String id) {
        readAccess(actor);var row=ready(actor,id);var bytes=storage.readObject(bucket,row.key(),MailFilePolicy.MAX+1);
        require(bytes.length==row.file().sizeBytes(),CONFLICT,"email_attachment_mismatch");
        MailFilePolicy.bytes(row.file().filename(),row.file().contentType(),bytes);
        return new MailboxTransport.FilePart(row.file().filename(),row.file().contentType(),bytes);
    }
    private List<MailboxContracts.SharedFile> stored(AuthSessionUser actor,List<File> files) {
        validate(actor,files.stream().map(File::id).toList());
        return files.stream().map(f->{var row=ready(actor,f.id());return new MailboxContracts.SharedFile(f.id(),f.filename(),f.contentType(),f.sizeBytes(),row.key());}).toList();
    }
    @Transactional(readOnly=true)
    public List<MailboxContracts.SharedFile> templateSnapshot(AuthSessionUser actor,String id,long version) {
        readAccess(actor);uuid(id);
        require(Boolean.TRUE.equals(db.queryForObject("SELECT EXISTS(SELECT 1 FROM sales_mailing_templates WHERE company_id=? AND id=? AND version=? AND status='ACTIVE')",Boolean.class,actor.companyId(),id,version)),CONFLICT,"mailing_template_version_conflict");
        return stored(actor,template(actor.companyId(),id));
    }
    @Transactional(readOnly=true)
    public List<MailboxContracts.SharedFile> campaignSnapshot(AuthSessionUser actor,String id) {
        readAccess(actor);require(tabs.canAccess(actor,TabPermissionRequirement.one("crm.contacts")),FORBIDDEN,"mailing_file_access_denied");
        require(Boolean.TRUE.equals(db.queryForObject("SELECT EXISTS(SELECT 1 FROM sales_mailing_campaigns WHERE company_id=? AND id=?)",Boolean.class,actor.companyId(),id)),NOT_FOUND,"mailing_not_found");
        return stored(actor,campaign(actor.companyId(),id));
    }
}
