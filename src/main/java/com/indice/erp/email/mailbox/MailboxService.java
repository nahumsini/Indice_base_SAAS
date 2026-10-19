package com.indice.erp.email.mailbox;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.email.accounts.EmailAccountService.ConnectionMaterial;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import static com.indice.erp.email.mailbox.MailboxContracts.*;
import static com.indice.erp.email.mailbox.MailboxAccess.*;

@Service
public class MailboxService {
    private final MailboxAccess access;private final MailboxRepository repository;private final MailboxTransport transport;
    public MailboxService(MailboxAccess access,MailboxRepository repository,MailboxTransport transport){this.access=access;this.repository=repository;this.transport=transport;}
    public List<Account> accounts(AuthSessionUser actor){access.access(actor);return access.accounts.list(actor).items().stream().map(a->new Account(a.id(),a.label(),a.email(),a.displayName(),a.receiveProtocol(),a.version())).toList();}
    public Workspace workspace(AuthSessionUser actor,String account){var a=access.read(actor,account);return repository.workspace(actor,account,a.version());}
    public Page list(AuthSessionUser actor,String account,String folder,String query,int offset){
        return list(actor,account,folder,query,offset,"ALL");
    }
    public Page list(AuthSessionUser actor,String account,String folder,String query,int offset,String filter){
        require(Set.of("ALL","UNREAD","STARRED").contains(filter),HttpStatus.BAD_REQUEST,"email_filter_invalid");
        var a=access.read(actor,account);require(query.length()<=180&&offset>=0&&offset<=10000,HttpStatus.BAD_REQUEST,"email_filter_invalid");
        if(!Set.of("DRAFTS","SENT","OUTBOX").contains(folder))access.folder(actor,account,a.version(),folder);
        return repository.list(actor,account,a.version(),folder,query.trim(),offset,filter);
    }
    public Message get(AuthSessionUser actor,String account,String id){var a=access.read(actor,account);return access.message(actor,account,a.version(),id).view();}
    private record Operation(ConnectionMaterial material,String lease) { @Override public String toString(){return "MailboxOperation[redacted]";} }
    private Operation begin(AuthSessionUser actor,String account,boolean sync){return access.tx.execute(s->{
        access.mutation(actor,account);String lease=access.lease(actor,account);
        if(sync)require(repository.claimSync(actor,account),HttpStatus.TOO_MANY_REQUESTS,"email_sync_rate_limited");
        return new Operation(access.accounts.connection(actor,account,false),lease);
    });}
    public Workspace sync(AuthSessionUser actor,String account,SyncInput input){
        var op=begin(actor,account,true);long version=op.material.account().version();
        try {
            var folders=repository.folders(actor,account,version);
            if(!input.older()){var discovered=transport.folders(op.material);access.tx.executeWithoutResult(s->{access.sameVersion(access.mutation(actor,account),version);repository.discover(actor,account,version,discovered);});folders=repository.folders(actor,account,version);}
            String selected=input.folderId()!=null?input.folderId():folders.stream().filter(f->f.kind().equals("INBOX")).map(Folder::id).findFirst().orElse(null);
            require(selected!=null,HttpStatus.UNPROCESSABLE_ENTITY,"email_inbox_unavailable");
            var folder=access.folder(actor,account,version,selected);
            var batch=transport.sync(op.material,cursor(folder),input.older(),repository.known(actor,account,folder));
            return access.tx.execute(s->{access.sameVersion(access.mutation(actor,account),version);repository.batch(actor,account,version,folder,batch);repository.audit(actor,account,version,"MAIL_SYNCED");return repository.workspace(actor,account,version);});
        }catch(MailboxTransport.Failure failure){
            access.tx.executeWithoutResult(s->repository.syncError(actor,account,op.lease,failure.code()));
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,failure.code());
        }finally{access.release(actor,account,op.lease);}
    }
    public Workspace createFolder(AuthSessionUser actor,String account,FolderInput input){
        require(input.name()!=null&&input.name().trim().matches("[\\p{L}\\p{N} _-]{1,80}"),HttpStatus.BAD_REQUEST,"email_folder_name_invalid");
        var op=begin(actor,account,false);long version=op.material.account().version();
        try {
            access.sameVersion(op.material.account(),input.accountVersion());
            var folders=transport.folders(op.material);
            require(folders.size()<100,HttpStatus.UNPROCESSABLE_ENTITY,"email_folder_limit");
            var created=transport.createFolder(op.material,input.name().trim());
            return access.tx.execute(s->{access.sameVersion(access.mutation(actor,account),version);
                repository.discover(actor,account,version,List.of(created));repository.audit(actor,account,version,"FOLDER_CREATED");
                return repository.workspace(actor,account,version);});
        }catch(MailboxTransport.Failure failure){throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,failure.code());}
        finally{access.release(actor,account,op.lease);}
    }
    public Message open(AuthSessionUser actor,String account,String id){
        var a=access.read(actor,account);var row=access.message(actor,account,a.version(),id);
        if(row.uid()==null)return row.view();
        var op=begin(actor,account,false);
        try {
            access.sameVersion(op.material.account(),row.accountVersion());var folder=access.folder(actor,account,a.version(),row.view().folderId());
            var body=transport.open(op.material,cursor(folder),row.uid());
            return access.tx.execute(s->{access.sameVersion(access.mutation(actor,account),a.version());
                repository.body(actor,account,id,body);
                return repository.get(actor,account,id).view();});
        }catch(MailboxTransport.Failure failure){throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,failure.code());}
        finally{access.release(actor,account,op.lease);}
    }
    public Message action(AuthSessionUser actor,String account,String id,ActionInput input){
        var op=begin(actor,account,false);
        try {
            access.sameVersion(op.material.account(),input.accountVersion());var row=access.message(actor,account,input.accountVersion(),id);
            require(row.view().version()==input.version(),HttpStatus.CONFLICT,"email_message_changed");require(row.uid()!=null,HttpStatus.UNPROCESSABLE_ENTITY,"email_action_unavailable");
            var folder=access.folder(actor,account,input.accountVersion(),row.view().folderId());String target=null;
            if(input.action().equals("MOVE")){require(input.targetFolderId()!=null&&!input.targetFolderId().equals(folder.id()),HttpStatus.BAD_REQUEST,"email_folder_invalid");target=access.folder(actor,account,input.accountVersion(),input.targetFolderId()).name();}
            transport.action(op.material,cursor(folder),row.uid(),input.action(),target);
            return access.tx.execute(s->{access.sameVersion(access.mutation(actor,account),input.accountVersion());
                repository.action(actor,account,id,input.action());
                repository.audit(actor,account,input.accountVersion(),"MESSAGE_"+input.action());return repository.get(actor,account,id).view();});
        }catch(MailboxTransport.Failure failure){throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,failure.code());}
        finally{access.release(actor,account,op.lease);}
    }
}
