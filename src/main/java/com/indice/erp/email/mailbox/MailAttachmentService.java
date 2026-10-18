package com.indice.erp.email.mailbox;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.storage.*;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import java.util.*;
import org.springframework.stereotype.Service;
import static com.indice.erp.email.mailbox.MailboxContracts.*;
import static com.indice.erp.email.mailbox.MailboxAccess.*;
import static org.springframework.http.HttpStatus.*;
@Service
public class MailAttachmentService {
    private final MailboxAccess access;private final MailAttachmentRepository repository;private final ObjectStorageService storage;private final CompanyStorageMeter meter;private final String bucket;private final MailboxTransport transport;
    public MailAttachmentService(MailboxAccess access,MailAttachmentRepository repository,ObjectStorageService storage,CompanyStorageMeter meter,ObjectStorageProperties properties,MailboxTransport transport){this.access=access;this.repository=repository;this.storage=storage;this.meter=meter;this.bucket=properties.getMinio().getBucketDocuments();this.transport=transport;}
    private void editable(AuthSessionUser actor,String account,String id,Version v){var a=access.mutation(actor,account);access.sameVersion(a,v.accountVersion());var message=access.message(actor,account,a.version(),id).view();require(message.state().equals("DRAFT")&&message.version()==v.version(),CONFLICT,"email_message_changed");}
    public Upload upload(AuthSessionUser actor,String account,String id,UploadInput in){return access.tx.execute(s->{
        editable(actor,account,id,new Version(in.version(),in.accountVersion()));require(storage.isEnabled(),SERVICE_UNAVAILABLE,"email_storage_unavailable");MailFilePolicy.metadata(in.filename(),in.contentType(),in.sizeBytes());
        require(repository.pending(actor,account,id)<5,UNPROCESSABLE_ENTITY,"email_attachment_limit");
        String aid=UUID.randomUUID().toString(),key="email/"+actor.companyId()+"/"+account+"/"+id+"/staging/"+aid;
        var upload=meter.presign(actor.companyId(),"correo",bucket,key,in.contentType(),in.sizeBytes(),300);repository.insert(actor,account,id,aid,in,key);return new Upload(aid,upload.uploadUrl(),upload.uploadHeaders());
    });}
    public Message register(AuthSessionUser actor,String account,String id,String attachment,Version version){return access.tx.execute(s->{
        editable(actor,account,id,version);var row=repository.get(actor,account,id,attachment);if(row.state().equals("READY"))return access.repository.get(actor,account,id).view();
        require(repository.list(actor,account,id).size()<5,UNPROCESSABLE_ENTITY,"email_attachment_limit");
        require(repository.list(actor,account,id).stream().mapToLong(MailAttachmentRepository.Row::size).sum()+row.size()<=10*1024*1024,UNPROCESSABLE_ENTITY,"email_attachment_limit");
        require(storage.objectExists(bucket,row.key()),BAD_REQUEST,"email_attachment_missing");var meta=storage.objectMetadata(bucket,row.key());require(meta.sizeBytes()==row.size()&&row.type().equalsIgnoreCase(meta.contentType()),BAD_REQUEST,"email_attachment_mismatch");
        String sealed="email/"+actor.companyId()+"/"+account+"/"+id+"/files/"+attachment;
        // Verify the immutable destination after copying; the upload URL cannot overwrite it.
        storage.copyObject(bucket,row.key(),sealed);try{var bytes=storage.readObject(bucket,sealed,MailFilePolicy.MAX+1);require(bytes.length==row.size(),BAD_REQUEST,"email_attachment_mismatch");MailFilePolicy.bytes(row.filename(),row.type(),bytes);
        meter.commitMoved(actor.companyId(),bucket,row.key(),sealed,row.size());}catch(RuntimeException failure){try{storage.deleteObject(bucket,sealed);}catch(RuntimeException ignored){ }throw failure;}repository.ready(actor,account,id,attachment,sealed);StorageCommitCleanup.afterCommit(()->{try{storage.deleteObject(bucket,row.key());}catch(RuntimeException ignored){ }});access.repository.audit(actor,account,version.accountVersion(),"ATTACHMENT_ADDED");return access.repository.get(actor,account,id).view();
    });}
    public Message remove(AuthSessionUser actor,String account,String id,String attachment,Version version){return access.tx.execute(s->{editable(actor,account,id,version);repository.get(actor,account,id,attachment);repository.remove(actor,account,id,attachment);return access.repository.get(actor,account,id).view();});}
    public List<Attachment> list(AuthSessionUser actor,String account,String id){var a=access.read(actor,account);var row=access.message(actor,account,a.version(),id);
        var local=repository.list(actor,account,id);if(!local.isEmpty()||row.uid()==null)return local.stream().map(f->new Attachment(f.id(),f.filename(),f.type(),f.size(),false)).toList();
        var folder=access.folder(actor,account,a.version(),row.view().folderId());var material=access.accounts.connection(actor,account,false);access.sameVersion(material.account(),a.version());var result=transport.attachments(material,cursor(folder),row.uid()).stream().map(f->new Attachment(f.path(),f.name(),f.type(),f.size(),true)).toList();access.sameVersion(access.read(actor,account),a.version());return result;
    }
    public MailboxTransport.FilePart download(AuthSessionUser actor,String account,String id,String attachment){var a=access.read(actor,account);var row=access.message(actor,account,a.version(),id);MailboxTransport.FilePart file;
        if(attachment.equals("0")||attachment.startsWith("0.")){require(row.uid()!=null,NOT_FOUND,"email_attachment_unavailable");var folder=access.folder(actor,account,a.version(),row.view().folderId());var material=access.accounts.connection(actor,account,false);access.sameVersion(material.account(),a.version());file=transport.attachment(material,cursor(folder),row.uid(),attachment);}
        else{var f=repository.get(actor,account,id,attachment);require(f.state().equals("READY"),NOT_FOUND,"email_attachment_unavailable");file=new MailboxTransport.FilePart(f.filename(),f.type(),storage.readObject(bucket,f.key(),MailFilePolicy.MAX+1));}
        MailFilePolicy.bytes(file.name(),file.type(),file.bytes());access.sameVersion(access.read(actor,account),a.version());return file;
    }
    List<MailboxTransport.FilePart> outgoing(AuthSessionUser actor,String account,String id){var result=new ArrayList<MailboxTransport.FilePart>();long total=0;for(var row:repository.list(actor,account,id)){var bytes=storage.readObject(bucket,row.key(),MailFilePolicy.MAX+1);require(bytes.length==row.size(),CONFLICT,"email_attachment_mismatch");total+=bytes.length;require(total<=10*1024*1024,UNPROCESSABLE_ENTITY,"email_attachment_limit");MailFilePolicy.bytes(row.filename(),row.type(),bytes);result.add(new MailboxTransport.FilePart(row.filename(),row.type(),bytes));}return result;}
}
