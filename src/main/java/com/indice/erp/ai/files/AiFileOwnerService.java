package com.indice.erp.ai.files;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.hr.assistant.*;
import com.indice.erp.hr.users.HrUserService;
import com.indice.erp.hr.assets.HrAssetService;
import com.indice.erp.hr.records.HrRecordService;
import com.indice.erp.hr.announcements.*;
import com.indice.erp.hr.permissions.*;
import com.indice.erp.hr.payroll.HrPayrollService;
import com.indice.erp.processTasks.tasks.*;
import com.indice.erp.storage.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import static com.indice.erp.ai.files.AiFileContracts.*;

/** Named owner orchestration. Each object is authorized through its owner before any tenant query. */
@Service
public class AiFileOwnerService {
    private final HrAssistantService hr;private final HrAssistantRecordsService records;private final HrAssistantPermissionsService permissions;
    private final HrUserService people;private final HrAssetService assets;private final HrRecordService recordFiles;
    private final HrAnnouncementSecurityService announcements;private final AnnFileSvc announcementFiles;
    private final HrPermissionSecurityService permissionSecurity;private final HrPermissionAttachmentService permissionFiles;
    private final ProcessTaskAssistantService taskOwner;private final ProcessTasksService taskFiles;private final HrPayrollService payroll;
    private final JdbcTemplate jdbc;private final ObjectMapper mapper;private final ObjectStorageService storage;
    private final ObjectStorageProperties properties;private final CompanyStorageMeter meter;private final AiCommerceFileOwnerService commerce;
    public AiFileOwnerService(HrAssistantService hr,HrAssistantRecordsService records,HrAssistantPermissionsService permissions,
        HrUserService people,HrAssetService assets,HrRecordService recordFiles,HrAnnouncementSecurityService announcements,AnnFileSvc announcementFiles,
        HrPermissionSecurityService permissionSecurity,HrPermissionAttachmentService permissionFiles,ProcessTaskAssistantService taskOwner,
        ProcessTasksService taskFiles,HrPayrollService payroll,JdbcTemplate jdbc,ObjectMapper mapper,ObjectStorageService storage,ObjectStorageProperties properties,CompanyStorageMeter meter,AiCommerceFileOwnerService commerce) {
        this.hr=hr;this.records=records;this.permissions=permissions;this.people=people;this.assets=assets;this.recordFiles=recordFiles;
        this.announcements=announcements;this.announcementFiles=announcementFiles;this.permissionSecurity=permissionSecurity;this.permissionFiles=permissionFiles;
        this.taskOwner=taskOwner;this.taskFiles=taskFiles;this.payroll=payroll;this.jdbc=jdbc;this.mapper=mapper;this.storage=storage;this.properties=properties;this.meter=meter;this.commerce=commerce;
    }
    public record Target(String name,String version) { }
    public record FileRef(long attachmentId,String fileName,String mimeType,long sizeBytes,String objectKey,String inlineData,String documentType) { }
    public record FileMetadata(long attachmentId,String fileName,String mimeType,long sizeBytes,String documentType) { }
    public record FileList(Purpose purpose,long targetId,List<FileMetadata> items) { }
    public Target target(AuthSessionUser user,Purpose purpose,long id) {
        if(AiCommerceFileOwnerService.supports(purpose))return commerce.target(user,purpose,id);
        Object value;String name;
        switch(purpose) {
            case employee_document->{var v=hr.employee(user,id);value=v;name=v.name();}
            case announcement_attachment->{var v=hr.announcement(user,id);value=v;name=v.title();}
            case asset_photo->{var v=hr.asset(user,id);value=v;name=v.name();}
            case hr_record_attachment->{var v=records.detail(user,id);value=v;name=v.title();}
            case my_hr_permission_attachment,hr_permission_attachment->{var v=permissions.detail(user,id,purpose==Purpose.hr_permission_attachment);value=v;name=v.employeeName()+" / "+v.startDate()+" / "+v.type();}
            case task_evidence->{var v=taskOwner.snapshot(user.companyId(),user.userId(),id);value=v;name=String.valueOf(v.task().getOrDefault("title",""));}
            default->throw new IllegalArgumentException("Unsupported file purpose.");
        }
        try {
            // Include full active metadata, including the server key, only in a one-way version hash.
            var fileVersions=refs(user,purpose,id).stream().map(f->List.of(f.attachmentId(),f.objectKey(),f.fileName(),f.mimeType(),f.sizeBytes(),AiFileValidation.hash(f.inlineData()))).toList();
            return new Target(name,AiFileValidation.hash(mapper.writeValueAsString(List.of(value,fileVersions))));
        } catch(com.fasterxml.jackson.core.JsonProcessingException e){throw new IllegalStateException("File target cannot be reviewed.",e);}
    }
    public void lock(AuthSessionUser user,Purpose purpose,long id) {
        if(AiCommerceFileOwnerService.supports(purpose)){commerce.validateWrite(user,purpose,id,true);return;}
        String table=switch(purpose) {
            case employee_document->"hr_users";case announcement_attachment->"hr_announcements";case asset_photo->"user_assets";
            case hr_record_attachment->"user_records";case my_hr_permission_attachment,hr_permission_attachment->"user_permission_requests";case task_evidence->"process_tasks";default->throw new IllegalArgumentException("Unsupported file purpose.");
        };
        if(jdbc.queryForList("SELECT id FROM "+table+" WHERE company_id=? AND id=? FOR UPDATE",Long.class,user.companyId(),id).isEmpty())throw new NoSuchElementException("File target not found.");
    }
    public String reserve(AuthSessionUser user,StageRequest request,long size) {
        if(AiCommerceFileOwnerService.supports(request.purpose()))return commerce.reserve(user,request,size);
        target(user,request.purpose(),request.targetId());
        var payload=payload(request.fileName(),request.mimeType(),size,request.documentType(),null);
        Map<String,Object> upload=switch(request.purpose()) {
            case employee_document->people.createDocumentUpload(user,request.targetId(),payload);
            case announcement_attachment->announcementFiles.presign(announcements.delegatedActor(user),request.targetId(),payload);
            case hr_record_attachment->recordFiles.createAttachmentUpload(user,request.targetId(),payload);
            case my_hr_permission_attachment->permissionFiles.createOwnUpload(permissionSecurity.delegatedActor(user,false),request.targetId(),payload);
            case hr_permission_attachment->permissionFiles.createManagementUpload(permissionSecurity.delegatedActor(user,true),request.targetId(),payload);
            case task_evidence->taskFiles.createAttachmentUpload(user.companyId(),user.userId(),request.targetId(),payload);
            case asset_photo->{String key="ai/files/"+user.companyId()+"/asset-photos/"+UUID.randomUUID();meter.reserve(user.companyId(),"HUMAN_RESOURCES",bucket(),key,size);yield Map.of("object_key",key);}
            default->throw new IllegalArgumentException("Unsupported file purpose.");
        };
        return String.valueOf(upload.get("object_key"));
    }
    public long register(AuthSessionUser user,AiStagedFileRepository.Stored file,byte[] bytes) {
        var f=file.view();var payload=payload(f.fileName(),f.mimeType(),f.sizeBytes(),f.documentType(),file.objectKey());
        if(AiCommerceFileOwnerService.supports(f.purpose()))commerce.register(user,file);
        else switch(f.purpose()) {
            case employee_document->people.registerUserDocument(user,f.targetId(),payload);
            case announcement_attachment->announcementFiles.register(announcements.delegatedActor(user),f.targetId(),payload);
            case hr_record_attachment->recordFiles.registerAttachment(user,f.targetId(),payload);
            case my_hr_permission_attachment->permissionFiles.registerOwnAttachment(permissionSecurity.delegatedActor(user,false),f.targetId(),payload);
            case hr_permission_attachment->permissionFiles.registerManagementAttachment(permissionSecurity.delegatedActor(user,true),f.targetId(),payload);
            case task_evidence->taskFiles.registerAttachment(user.companyId(),user.userId(),f.targetId(),payload);
            case asset_photo->{
                var photo=Map.<String,Object>of("file_name",f.fileName(),"mime_type",f.mimeType(),"size_bytes",f.sizeBytes(),"data_url","data:"+f.mimeType()+";base64,"+Base64.getEncoder().encodeToString(bytes));
                assets.updateAsset(user,f.targetId(),Map.of("photos",List.of(photo)));
                meter.release(user.companyId(),file.objectKey(),"ai_asset_photo_registered_inline");
                StorageCommitCleanup.afterCommit(()->deleteQuietly(file.bucket(),file.objectKey()));
            }
        }
        return refs(user,f.purpose(),f.targetId()).stream().filter(r->f.purpose()==Purpose.asset_photo?
            r.fileName().equals(f.fileName())&&AiFileValidation.hash(inlineBytes(r)).equals(f.sha256()):r.objectKey().equals(file.objectKey()))
            .mapToLong(FileRef::attachmentId).max().orElseThrow(()->new IllegalStateException("Owner file registration missing."));
    }
    public FileList list(AuthSessionUser user,Purpose purpose,long id) {
        target(user,purpose,id);
        return new FileList(purpose,id,refs(user,purpose,id).stream().map(r->new FileMetadata(r.attachmentId(),r.fileName(),r.mimeType(),r.sizeBytes(),r.documentType())).toList());
    }
    public FileContent read(AuthSessionUser user,ReadRequest request) {
        if(request==null||request.purpose()==null||request.targetId()==null||request.targetId()<1||request.attachmentId()==null||request.attachmentId()<1)throw new IllegalArgumentException("File purpose, target and attachment required.");
        target(user,request.purpose(),request.targetId());
        var ref=refs(user,request.purpose(),request.targetId()).stream().filter(r->r.attachmentId()==request.attachmentId()).findFirst().orElseThrow(()->new NoSuchElementException("File not found."));
        if(request.purpose()==Purpose.employee_document&&(ref.documentType()==null||!Set.of("proof_of_address","resume","profile_photo").contains(ref.documentType())))
            throw new SecurityException("Identity documents remain in the employee document channel.");
        byte[] bytes=ref.inlineData().isEmpty()?storage.readObject(bucket(request.purpose()),ref.objectKey(),boundedSize(ref.sizeBytes())):inlineBytes(ref);
        if(bytes.length!=ref.sizeBytes())throw new Conflict("file_integrity_changed");
        AiFileValidation.validateMime(ref.mimeType(),bytes);
        var registeredHashes=jdbc.queryForList("SELECT sha256 FROM ai_staged_files WHERE company_id=? AND purpose=? AND target_id=? AND attachment_id=? AND state='ATTACHED'",String.class,user.companyId(),request.purpose().name(),request.targetId(),request.attachmentId());
        if(registeredHashes.stream().anyMatch(hash->!hash.equals(AiFileValidation.hash(bytes))))throw new Conflict("file_integrity_changed");
        return content("indice://files/"+request.purpose()+"/"+request.targetId()+"/"+request.attachmentId(),ref.fileName(),ref.mimeType(),bytes);
    }
    public FileContent export(AuthSessionUser user,ExportRequest request) {
        if(request==null||request.runId()==null||request.runId()<1||request.format()==null||!Set.of("csv","pdf").contains(request.format()))throw new IllegalArgumentException("Payroll run and csv/pdf format required.");
        payroll.assistantRun(user,request.runId());
        boolean csv=request.format().equals("csv");
        byte[] bytes=csv?payroll.exportAssistantRunCsv(user,request.runId()).getBytes(StandardCharsets.UTF_8):payroll.exportAssistantRunPdf(user,request.runId());
        boundedSize(bytes.length);
        return content("indice://payroll/"+request.runId()+"/"+request.format(),"payroll-"+request.runId()+"."+request.format(),csv?"text/csv":"application/pdf",bytes);
    }
    public String previous(AuthSessionUser user,Staged file) {
        if(file.purpose()!=Purpose.employee_document)return null;
        return refs(user,file.purpose(),file.targetId()).stream().filter(r->Objects.equals(r.documentType(),file.documentType())).map(FileRef::fileName).findFirst().orElse(null);
    }
    private List<FileRef> refs(AuthSessionUser user,Purpose purpose,long target) {
        if(AiCommerceFileOwnerService.supports(purpose))return commerce.files(user,purpose,target).stream().map(f->new FileRef(f.id(),f.fileName(),f.mimeType(),f.sizeBytes(),f.objectKey(),"",null)).toList();
        String table,column,condition;
        switch(purpose) {
            case employee_document->{table="user_documents";column="user_company_id";condition="status='active'";}
            case announcement_attachment->{table="hr_announcement_attachments";column="announcement_id";condition="deleted_at IS NULL";}
            case asset_photo->{table="user_asset_photos";column="asset_id";condition="1=1";}
            case hr_record_attachment->{table="user_record_attachments";column="record_id";condition="deleted_at IS NULL";}
            case my_hr_permission_attachment,hr_permission_attachment->{table="user_permission_attachments";column="permission_request_id";condition="deleted_at IS NULL";}
            case task_evidence->{table="process_task_attachments";column="task_id";condition="deleted_at IS NULL";}
            default->throw new IllegalArgumentException("Unsupported file purpose.");
        }
        String fields=purpose==Purpose.asset_photo?"id,file_name AS original_filename,mime_type,size_bytes,'' AS object_key,data_url AS inline_data,NULL AS document_type":
            "id,original_filename,mime_type,size_bytes,object_key,'' AS inline_data,"+(purpose==Purpose.employee_document?"document_type":"NULL AS document_type");
        return jdbc.query("SELECT "+fields+" FROM "+table+" WHERE company_id=? AND "+column+"=? AND "+condition+" ORDER BY id",
            (rs,n)->new FileRef(rs.getLong("id"),rs.getString("original_filename"),rs.getString("mime_type"),rs.getLong("size_bytes"),rs.getString("object_key"),rs.getString("inline_data"),rs.getString("document_type")),user.companyId(),target);
    }
    private static Map<String,Object> payload(String name,String mime,long size,String document,String key) {
        var map=new LinkedHashMap<String,Object>();map.put("file_name",name);map.put("original_filename",name);map.put("content_type",mime);map.put("mime_type",mime);map.put("size_bytes",size);
        if(document!=null)map.put("document_type",document);if(key!=null)map.put("object_key",key);return map;
    }
    private static FileContent content(String uri,String name,String mime,byte[] bytes){return new FileContent(uri,name,mime,bytes.length,AiFileValidation.hash(bytes),Base64.getEncoder().encodeToString(bytes));}
    private static byte[] inlineBytes(FileRef ref){var prefix="data:"+ref.mimeType()+";base64,";if(!ref.inlineData().startsWith(prefix))throw new Conflict("file_integrity_changed");try{return Base64.getDecoder().decode(ref.inlineData().substring(prefix.length()));}catch(IllegalArgumentException e){throw new Conflict("file_integrity_changed");}}
    private static int boundedSize(long size){if(size<1||size>10485760)throw new IllegalArgumentException("File exceeds the 10 MB download limit.");return Math.toIntExact(size);}
    public void validateWrite(AuthSessionUser user,Purpose purpose,long id){if(AiCommerceFileOwnerService.supports(purpose))commerce.validateWrite(user,purpose,id,false);else target(user,purpose,id);}
    public String bucket(Purpose purpose){return AiCommerceFileOwnerService.supports(purpose)?commerce.bucket():bucket();}
    public String bucket(){return properties.getMinio().getBucketDocuments();}
    private void deleteQuietly(String bucket,String key){try{storage.deleteObject(bucket,key);}catch(RuntimeException ignored){/* Quota released; orphan handled by storage operations. */}}
}
