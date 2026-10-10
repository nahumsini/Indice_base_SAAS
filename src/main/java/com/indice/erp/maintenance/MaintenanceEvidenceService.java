package com.indice.erp.maintenance;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.storage.*;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import java.time.*;
import java.util.*;
import java.io.ByteArrayInputStream;
import javax.imageio.ImageIO;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.indice.erp.maintenance.MaintenanceDtos.*;
import static com.indice.erp.maintenance.MaintenancePolicy.*;

@Service
public class MaintenanceEvidenceService {
    private final MaintenanceRepository db;private final MaintenanceAccess access;
    private final ObjectStorageService storage;private final CompanyStorageMeter meter;private final String bucket;
    public MaintenanceEvidenceService(MaintenanceRepository db,MaintenanceAccess access,ObjectStorageService storage,
        CompanyStorageMeter meter,ObjectStorageProperties properties){this.db=db;this.access=access;this.storage=storage;this.meter=meter;this.bucket=properties.getMinio().getBucketDocuments();}
    static String tab(String type){return switch(type){case "REQUEST"->"requests";case "ORDER"->"orders";case "ASSET"->"assets";default->throw new IllegalArgumentException();};}
    private void subject(AuthSessionUser actor,String type,long id,boolean write){
        access.requireTabs(actor,tab(type));
        switch(type){case "REQUEST"->{var row=db.request(actor,id);if(write)require(row.status().equals("NEW"),"maintenance_request_already_reviewed");}
            case "ORDER"->{var row=db.order(actor,id);if(write)require(!TERMINAL.contains(row.status()),"maintenance_order_closed");}
            case "ASSET"->{db.asset(actor,id);if(write)MaintenanceAccess.manage(actor);}default->throw new IllegalArgumentException();}
    }
    @Transactional public UploadTicket presign(AuthSessionUser actor,String type,long id,UploadInput input){
        actor=access.lock(actor,tab(type));subject(actor,type,id,true);require(storage.isEnabled(),"maintenance_storage_unavailable");
        require(Set.of("image/jpeg","image/png","application/pdf").contains(input.contentType()),"maintenance_file_type_invalid");
        require(input.filename().chars().noneMatch(c->c<32||c=='/'||c=='\\'),"maintenance_filename_invalid");
        require(db.attachments(actor.companyId(),type,id).size()<20,"maintenance_attachment_limit");
        String upload=UUID.randomUUID().toString(),key="companies/"+actor.companyId()+"/maintenance/staging/"+upload;
        var signed=meter.presign(actor.companyId(),"maintenance",bucket,key,input.contentType(),input.sizeBytes(),300);
        db.jdbc().update("INSERT INTO maintenance_uploads(id,company_id,actor_id,entity_type,entity_id,filename,content_type,size_bytes,object_key,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?)",upload,actor.companyId(),actor.userId(),type,id,input.filename().trim(),input.contentType(),input.sizeBytes(),key,MaintenanceRepository.time(Instant.now().plusSeconds(300)));
        return new UploadTicket(upload,signed.uploadUrl(),"PUT",signed.uploadHeaders());
    }
    @Transactional public List<Attachment> register(AuthSessionUser actor,String type,long id,String upload){
        actor=access.lock(actor,tab(type));subject(actor,type,id,true);
        var row=db.one(db.jdbc().queryForList("SELECT *,expires_at>UTC_TIMESTAMP(6) valid_now FROM maintenance_uploads WHERE company_id=? AND actor_id=? AND id=? AND entity_type=? AND entity_id=? FOR UPDATE",actor.companyId(),actor.userId(),upload,type,id));
        if(Boolean.TRUE.equals(row.get("registered"))||row.get("registered") instanceof Number n&&n.intValue()==1)return db.attachments(actor.companyId(),type,id);
        require(((Number)row.get("valid_now")).intValue()==1,"maintenance_upload_expired");require(db.attachments(actor.companyId(),type,id).size()<20,"maintenance_attachment_limit");
        String source=String.valueOf(row.get("object_key")),target="companies/"+actor.companyId()+"/maintenance/evidence/"+UUID.randomUUID();long bytes=((Number)row.get("size_bytes")).longValue();String mime=String.valueOf(row.get("content_type"));
        // Validate the immutable copied object; a still-valid staging URL cannot change registered evidence.
        storage.copyObject(bucket,source,target);
        try{
            var metadata=storage.objectMetadata(bucket,target);require(metadata.sizeBytes()==bytes&&mime.equals(metadata.contentType()),"maintenance_file_metadata_invalid");validateBytes(storage.readObjectPrefix(bucket,target,(int)bytes+1),mime,bytes);
            meter.commitMoved(actor.companyId(),bucket,source,target,bytes);
            db.insert("INSERT INTO maintenance_attachments(company_id,entity_type,entity_id,upload_id,filename,content_type,size_bytes,object_key,created_by) VALUES(?,?,?,?,?,?,?,?,?)",actor.companyId(),type,id,upload,row.get("filename"),mime,bytes,target,actor.userId());
            db.jdbc().update("UPDATE maintenance_uploads SET registered=1 WHERE company_id=? AND id=?",actor.companyId(),upload);db.audit(actor,type,id,"EVIDENCE_REGISTERED",String.valueOf(row.get("filename")));
        }catch(RuntimeException failed){try{storage.deleteObject(bucket,target);}catch(RuntimeException ignored){}throw failed;}
        return db.attachments(actor.companyId(),type,id);
    }
    public List<Attachment> list(AuthSessionUser actor,String type,long id){subject(actor,type,id,false);return db.attachments(actor.companyId(),type,id);}
    public Download download(AuthSessionUser actor,String type,long id,long attachment){subject(actor,type,id,false);var row=db.one(db.jdbc().queryForList("SELECT object_key FROM maintenance_attachments WHERE company_id=? AND entity_type=? AND entity_id=? AND id=?",actor.companyId(),type,id,attachment));return new Download(storage.presignDownload(bucket,String.valueOf(row.get("object_key")),60));}
    static void validateBytes(byte[] bytes,String mime,long expected){
        require(bytes.length==expected,"maintenance_file_size_invalid");
        try{
            if(mime.equals("application/pdf")){
                require(bytes.length>5&&new String(bytes,0,5,java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF-"),"maintenance_file_content_invalid");
                try(var pdf=Loader.loadPDF(bytes)){require(!pdf.isEncrypted()&&pdf.getNumberOfPages()>0&&pdf.getNumberOfPages()<=100,"maintenance_pdf_invalid");inspectPdf(pdf.getDocumentCatalog().getCOSObject(),Collections.newSetFromMap(new IdentityHashMap<>()),0);}
            }else{
                boolean png=bytes.length>8&&bytes[0]==(byte)137&&bytes[1]==80&&bytes[2]==78&&bytes[3]==71;
                boolean jpeg=bytes.length>3&&bytes[0]==(byte)255&&bytes[1]==(byte)216&&bytes[2]==(byte)255;
                require(mime.equals("image/png")?png:jpeg,"maintenance_file_content_invalid");
                try(var stream=ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))){var readers=ImageIO.getImageReaders(stream);require(readers.hasNext(),"maintenance_image_invalid");var reader=readers.next();try{reader.setInput(stream);require((long)reader.getWidth(0)*reader.getHeight(0)<=40000000,"maintenance_image_too_large");require(reader.read(0)!=null,"maintenance_image_invalid");}finally{reader.dispose();}}
            }
        }catch(java.io.IOException invalid){require(false,"maintenance_file_content_invalid");}
    }
    private static void inspectPdf(COSBase node,Set<COSBase> seen,int depth){
        if(node==null||!seen.add(node))return;require(depth<=128&&seen.size()<=50000,"maintenance_pdf_too_complex");
        if(node instanceof COSObject object)inspectPdf(object.getObject(),seen,depth+1);
        else if(node instanceof COSArray array)for(var value:array)inspectPdf(value,seen,depth+1);
        else if(node instanceof COSName name)require(!Set.of("JavaScript","Launch","SubmitForm","ImportData","GoToR","GoToE").contains(name.getName()),"maintenance_pdf_active_content");
        else if(node instanceof COSDictionary dictionary)for(var key:dictionary.keySet()){
            require(!Set.of("JS","JavaScript","AA","OpenAction","Launch","EmbeddedFiles","RichMedia","XFA","AcroForm","SubmitForm","ImportData").contains(key.getName()),"maintenance_pdf_active_content");inspectPdf(dictionary.getDictionaryObject(key),seen,depth+1);
        }
    }
}
