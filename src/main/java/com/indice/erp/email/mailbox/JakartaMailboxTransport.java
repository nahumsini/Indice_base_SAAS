package com.indice.erp.email.mailbox;

import com.indice.erp.email.accounts.EmailAccountService.ConnectionMaterial;
import com.indice.erp.email.accounts.EmailConnectionFactory;
import jakarta.mail.*;
import jakarta.mail.internet.*;
import java.util.*;
import org.eclipse.angus.mail.imap.*;
import org.springframework.stereotype.Component;

@Component
public class JakartaMailboxTransport implements MailboxTransport {
    private final Connections connections;
    public JakartaMailboxTransport(){this(new Connections());}
    JakartaMailboxTransport(Connections connections){this.connections=connections;}
    /** Injection seam is package-private and has no runtime setting that weakens TLS/destination policy. */
    static class Connections {
        Session smtp(ConnectionMaterial material)throws Exception {
            var a=material.account();var session=EmailConnectionFactory.session("SMTP",a.smtpHost(),a.smtpPort(),a.smtpSecurity());
            // Real submission can include provider filtering; connection probes retain their short timeout.
            session.getProperties().setProperty("mail.smtp.timeout","60000");
            session.getProperties().setProperty("mail.smtp.writetimeout","60000");
            return session;
        }
        Store receive(ConnectionMaterial material)throws Exception {
            var a=material.account();var session=EmailConnectionFactory.session("IMAP",a.receiveHost(),a.receivePort(),"TLS");
            var store=session.getStore("imap");
            try{store.connect(a.receiveHost(),a.receivePort(),a.receiveUsername(),material.password());return store;}
            catch(Exception e){try{store.close();}catch(Exception ignored){ }throw e;}
        }
    }
    @Override public List<FolderInfo> folders(ConnectionMaterial material) {
        try(var store=connections.receive(material)) {
            var result=new ArrayList<FolderInfo>();
            for(var folder:store.getDefaultFolder().list("*")) {
                if(result.size()>=100)break;
                if((folder.getType()&Folder.HOLDS_MESSAGES)==0||folder.getFullName().length()>512)continue;
                result.add(folderInfo(folder));
            }
            return result;
        }catch(Exception e){throw failure(e);}
    }
    private FolderInfo folderInfo(Folder folder)throws MessagingException {
        String kind=folder.getFullName().equalsIgnoreCase("INBOX")?"INBOX":"CUSTOM";
        if(folder instanceof IMAPFolder imap)for(String attribute:imap.getAttributes())kind=switch(attribute.toLowerCase(Locale.ROOT)){
            case "\\sent"->"SENT";case "\\drafts"->"DRAFTS";case "\\trash"->"TRASH";case "\\archive"->"ARCHIVE";case "\\junk"->"JUNK";default->kind;};
        return new FolderInfo(folder.getFullName(),kind);
    }
    @Override public FolderInfo createFolder(ConnectionMaterial material,String name) {
        try(var store=connections.receive(material)) {
            var namespaces=store.getPersonalNamespaces();
            var root=namespaces.length>0?namespaces[0]:store.getDefaultFolder();
            var folder=root.getFolder(name);
            // Same name is idempotent if CREATE succeeded but its response was lost.
            if(!folder.exists()&&!folder.create(Folder.HOLDS_MESSAGES))throw new Failure("email_folder_create_failed");
            if((folder.getType()&Folder.HOLDS_MESSAGES)==0)throw new Failure("email_folder_create_failed");
            return folderInfo(folder);
        }catch(Exception e){throw failure(e);}
    }
    @Override public Batch sync(ConnectionMaterial material,Cursor cursor,boolean older,long[] knownUids) {
        try(var store=connections.receive(material)) {
            var folder=(IMAPFolder)store.getFolder(cursor.name());folder.open(Folder.READ_ONLY);
            try {
                long validity=folder.getUIDValidity(),newest=cursor.validity()==validity?cursor.newest():0,oldest=cursor.validity()==validity?cursor.oldest():0;
                var selected=new ArrayList<Message>();boolean hasOlder=oldest>1;long boundary=0;
                if(newest==0) {
                    int count=folder.getMessageCount();if(count>0)selected.addAll(Arrays.asList(folder.getMessages(Math.max(1,count-49),count)));
                    hasOlder=count>50;
                }else {
                    long next=folder.getUIDNext(),start=older?Math.max(1,oldest-1000):newest+1,end=older?oldest-1:Math.min(next-1,newest+1000);
                    if(start<=end) {
                        var candidates=folder.getMessagesByUID(start,end);
                        for(int i=older?Math.max(0,candidates.length-50):0;i<candidates.length&&selected.size()<50;i++)if(candidates[i]!=null)selected.add(candidates[i]);
                        if(selected.isEmpty())boundary=older?start:end;
                        hasOlder=older?(selected.isEmpty()?start>1:true):oldest>1;
                    }else if(older)hasOlder=false;
                }
                var fetch=new FetchProfile();fetch.add(FetchProfile.Item.ENVELOPE);fetch.add(FetchProfile.Item.FLAGS);fetch.add(UIDFolder.FetchProfileItem.UID);
                fetch.add("Message-ID");fetch.add("References");folder.fetch(selected.toArray(Message[]::new),fetch);
                var headers=new ArrayList<RemoteHeader>();long deadline=System.nanoTime()+30_000_000_000L;
                for(var message:selected){if(System.nanoTime()>deadline)throw new Failure("email_sync_timeout");if(message.isExpunged())continue;
                    long uid=folder.getUID(message);headers.add(MailContent.header(message,uid));newest=Math.max(newest,uid);oldest=oldest==0?uid:Math.min(oldest,uid);}
                if(boundary>0){if(older)oldest=boundary;else newest=boundary;}
                if(oldest<=1)hasOlder=false;
                var flags=new ArrayList<RemoteFlag>();
                if(cursor.validity()==validity&&knownUids.length>0){
                    var existing=folder.getMessagesByUID(knownUids);folder.fetch(Arrays.stream(existing).filter(Objects::nonNull).toArray(Message[]::new),fetch);
                    var found=new HashMap<Long,Message>();for(var m:existing)if(m!=null&&!m.isExpunged())found.put(folder.getUID(m),m);
                    for(long uid:knownUids){var m=found.get(uid);flags.add(new RemoteFlag(uid,m!=null&& !m.isSet(Flags.Flag.DELETED),m!=null&&m.isSet(Flags.Flag.SEEN),m!=null&&m.isSet(Flags.Flag.FLAGGED)));}
                }
                return new Batch(validity,newest,oldest,hasOlder,headers,flags);
            }finally{folder.close(false);}
        }catch(Exception e){throw failure(e);}
    }
    private Message message(IMAPFolder folder,Cursor cursor,long uid) throws MessagingException {
        if(folder.getUIDValidity()!=cursor.validity())throw new Failure("email_folder_changed");
        var message=folder.getMessageByUID(uid);if(message==null||message.isExpunged()||message.isSet(Flags.Flag.DELETED))throw new Failure("email_message_unavailable");return message;
    }
    @Override public Body open(ConnectionMaterial material,Cursor cursor,long uid) {
        try(var store=connections.receive(material)) {
            var folder=(IMAPFolder)store.getFolder(cursor.name());folder.open(Folder.READ_WRITE);
            try{var message=message(folder,cursor,uid);var body=MailContent.body(message);message.setFlag(Flags.Flag.SEEN,true);return body;}
            finally{folder.close(false);}
        }catch(Exception e){throw failure(e);}
    }
    @Override public void action(ConnectionMaterial material,Cursor cursor,long uid,String action,String targetFolder) {
        try(var store=connections.receive(material)) {
            var folder=(IMAPFolder)store.getFolder(cursor.name());folder.open(Folder.READ_WRITE);
            try {
                var message=message(folder,cursor,uid);
                switch(action) {
                    case "READ","UNREAD"->message.setFlag(Flags.Flag.SEEN,action.equals("READ"));
                    case "STAR","UNSTAR"->message.setFlag(Flags.Flag.FLAGGED,action.equals("STAR"));
                    case "MOVE"->{
                        if(!(store instanceof IMAPStore imap)||!imap.hasCapability("MOVE"))throw new Failure("email_move_unsupported");
                        var target=store.getFolder(targetFolder);if(!target.exists())throw new Failure("email_folder_changed");
                        folder.moveMessages(new Message[]{message},target);
                    }
                    default->throw new Failure("email_action_invalid");
                }
            }finally{folder.close(false);}
        }catch(Exception e){throw failure(e);}
    }
    @Override public Outcome send(ConnectionMaterial material,Outgoing outgoing) {
        Transport transport=null;boolean submissionStarted=false;
        try {
            var a=material.account();var session=connections.smtp(material);
            var message=mime(session,material,outgoing);var envelope=message.getAllRecipients();message.removeHeader("Bcc");
            transport=session.getTransport("smtp");transport.connect(a.smtpHost(),a.smtpPort(),a.smtpUsername(),material.password());
            submissionStarted=true;transport.sendMessage(message,envelope);return Outcome.ACCEPTED;
        }catch(Exception e){
            var rejection=MailSendRejection.classify(e,submissionStarted);
            if(rejection!=null)throw rejection;
            // Missing DATA acknowledgement or partial delivery remains uncertain. Never retry automatically.
            return Outcome.UNKNOWN;
        }finally{if(transport!=null)try{transport.close();}catch(Exception ignored){ }}
    }
    private MimeMessage mime(Session session,ConnectionMaterial material,Outgoing outgoing) throws Exception {
        var a=material.account();
        var message=new MimeMessage(session){@Override protected void updateMessageID() throws MessagingException{setHeader("Message-ID",outgoing.messageId());}};
        message.setFrom(new InternetAddress(a.email(),outgoing.displayName()==null?a.displayName():outgoing.displayName(),"UTF-8"));
        recipients(message,Message.RecipientType.TO,outgoing.to());recipients(message,Message.RecipientType.CC,outgoing.cc());recipients(message,Message.RecipientType.BCC,outgoing.bcc());
        message.setSubject(outgoing.subject(),"UTF-8");message.setSentDate(new Date());
        if(outgoing.replyTo()!=null)message.setReplyTo(new Address[]{new InternetAddress(outgoing.replyTo(),true)});
        if(outgoing.unsubscribe()!=null)message.setHeader("List-Unsubscribe","<"+outgoing.unsubscribe()+">");
        if(outgoing.inReplyTo()!=null)message.setHeader("In-Reply-To",outgoing.inReplyTo());
        if(outgoing.references()!=null&&!outgoing.references().isBlank())message.setHeader("References",outgoing.references());
        var body=new MimeBodyPart();body.setText(outgoing.text(),"UTF-8");
        if(outgoing.html()!=null){var alternative=new MimeMultipart("alternative");alternative.addBodyPart(body);alternative.addBodyPart(MailInlineImages.body(outgoing.html()));body=new MimeBodyPart();body.setContent(alternative);}
        if(!outgoing.files().isEmpty()){var mixed=new MimeMultipart("mixed");mixed.addBodyPart(body);for(var file:outgoing.files()){var part=new MimeBodyPart();part.setDataHandler(new jakarta.activation.DataHandler(new jakarta.mail.util.ByteArrayDataSource(file.bytes(),file.type())));part.setFileName(file.name());part.setDisposition(Part.ATTACHMENT);mixed.addBodyPart(part);}message.setContent(mixed);}
        else if(outgoing.html()!=null)message.setContent((Multipart)body.getContent());else message.setText(outgoing.text(),"UTF-8");
        message.saveChanges();return message;
    }
    @Override public CopyOutcome copySent(ConnectionMaterial material,Outgoing outgoing,String name,boolean append) {
        boolean started=false;
        try(var store=connections.receive(material)){
            var folder=(IMAPFolder)store.getFolder(name);if(!folder.exists())return CopyOutcome.UNAVAILABLE;
            folder.open(Folder.READ_WRITE);
            try{
                var matches=folder.search(new jakarta.mail.search.HeaderTerm("Message-ID",outgoing.messageId()));
                for(var found:matches)if(outgoing.messageId().equals(MailContent.header(found,"Message-ID",512)))return CopyOutcome.COPIED;
                if(!append)return CopyOutcome.UNKNOWN;
                var message=mime(Session.getInstance(new Properties()),material,outgoing);message.setFlag(Flags.Flag.SEEN,true);
                started=true;folder.appendMessages(new Message[]{message});return CopyOutcome.COPIED;
            }finally{folder.close(false);}
        }catch(Exception failure){return started?CopyOutcome.UNKNOWN:CopyOutcome.FAILED;}
    }
    @Override public List<RemoteFile> attachments(ConnectionMaterial material,Cursor cursor,long uid){
        try(var store=connections.receive(material)){var folder=(IMAPFolder)store.getFolder(cursor.name());folder.open(Folder.READ_ONLY);
            try{var message=message(folder,cursor,uid);if(message.getSize()>25*1024*1024)throw new Failure("email_attachment_limit");var result=new ArrayList<RemoteFile>();files(message,"0",0,result,new int[]{0});return result;}finally{folder.close(false);}
        }catch(Exception e){throw failure(e);}
    }
    private void files(Part part,String path,int depth,List<RemoteFile> result,int[] count) throws Exception {
        if(depth>10||++count[0]>80||result.size()>=20)return;
        if(part.getFileName()!=null||Part.ATTACHMENT.equalsIgnoreCase(part.getDisposition())){result.add(new RemoteFile(path,MailContent.clipped(part.getFileName()==null?"attachment":part.getFileName(),180),new ContentType(part.getContentType()).getBaseType(),part.getSize()));return;}
        if(part.isMimeType("multipart/*")&&part.getContent() instanceof Multipart multi)for(int i=0;i<Math.min(multi.getCount(),80);i++)files(multi.getBodyPart(i),path+"."+i,depth+1,result,count);
    }
    @Override public FilePart attachment(ConnectionMaterial material,Cursor cursor,long uid,String path){
        if(!path.matches("0(?:\\.[0-9]{1,2}){0,10}"))throw new Failure("email_attachment_unavailable");
        try(var store=connections.receive(material)){var folder=(IMAPFolder)store.getFolder(cursor.name());folder.open(Folder.READ_ONLY);
            try{Part part=message(folder,cursor,uid);if(part.getSize()>25*1024*1024)throw new Failure("email_attachment_limit");
                var indexes=path.split("\\.");for(int i=1;i<indexes.length;i++){if(!(part.getContent() instanceof Multipart multi))throw new Failure("email_attachment_unavailable");part=multi.getBodyPart(Integer.parseInt(indexes[i]));}
                if(part.getFileName()==null&&!Part.ATTACHMENT.equalsIgnoreCase(part.getDisposition()))throw new Failure("email_attachment_unavailable");
                byte[] bytes;try(var input=part.getInputStream()){bytes=input.readNBytes(5*1024*1024+1);}if(bytes.length>5*1024*1024)throw new Failure("email_attachment_limit");
                return new FilePart(MailContent.clipped(part.getFileName()==null?"attachment":part.getFileName(),180),new ContentType(part.getContentType()).getBaseType(),bytes);
            }finally{folder.close(false);}
        }catch(Exception e){throw failure(e);}
    }
    private void recipients(MimeMessage message,Message.RecipientType type,List<String> values) throws MessagingException {
        for(String value:values){var address=new InternetAddress(value,true);address.validate();message.addRecipient(type,address);}
    }
    private Failure failure(Exception e){return e instanceof Failure failure?failure:new Failure("email_provider_unavailable");}
}
