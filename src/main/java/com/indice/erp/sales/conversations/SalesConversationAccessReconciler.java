package com.indice.erp.sales.conversations;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.sales.conversations.SalesConversationDtos.Capability;
import com.indice.erp.sales.conversations.whatsapp.WhatsAppProperties;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Rechecks current native authority instead of relying on a nonexistent HR/Config Center event bus. */
@Service
public class SalesConversationAccessReconciler {
    private final SalesConversationNotificationSource notices;
    private final JdbcTemplate db;private final SalesConversationAccess access;private final SalesConversationRepository repository;
    private final SessionAuthService auth;private final WhatsAppProperties flags;private final TransactionTemplate tx;
    public SalesConversationAccessReconciler(JdbcTemplate db,SalesConversationAccess access,SalesConversationRepository repository,SessionAuthService auth,WhatsAppProperties flags,PlatformTransactionManager manager,SalesConversationNotificationSource notices){this.notices=notices;this.db=db;this.access=access;this.repository=repository;this.auth=auth;this.flags=flags;this.tx=new TransactionTemplate(manager);}
    @Scheduled(fixedDelayString="${app.sales-conversations.reconcile-ms:10000}",initialDelayString="${app.sales-conversations.initial-delay-ms:30000}")
    public void poll(){if(flags.workerEnabled()&&flags.enabled())for(var row:db.query("SELECT DISTINCT company_id,connection_id FROM sales_wa_members ORDER BY company_id,connection_id",(r,n)->Map.entry(r.getLong(1),r.getString(2))))reconcile(row.getKey(),row.getValue());}
    public void reconcile(long company,String connection){tx.executeWithoutResult(s->{repository.lock(company);
        var members=db.query("SELECT m.membership_id,uc.user_id FROM sales_wa_members m JOIN user_companies uc ON uc.company_id=m.company_id AND uc.id=m.membership_id WHERE m.company_id=? AND m.connection_id=? ",(r,n)->Map.entry(r.getLong(1),r.getLong(2)),company,connection);
        for(var m:members){boolean valid;
            try{var actor=auth.scheduledActor(m.getValue(),company).orElseThrow();valid=!access.capabilities(actor,connection).isEmpty();}catch(RuntimeException denied){valid=false;}
            if(valid)continue;
            if(repository.members(company,connection).stream().anyMatch(row->row.membershipId()==m.getKey()&&row.active())){repository.revoke(company,connection,m.getKey());repository.event(company,connection,null,null,"MEMBER_ACCESS_LOST",m.getKey(),null);}
            var chats=db.query("SELECT id,version FROM sales_conversations WHERE company_id=? AND connection_id=? AND assignee_membership_id=?",(r,n)->Map.entry(r.getString(1),r.getLong(2)),company,connection,m.getKey());
            for(var c:chats){repository.assignment(company,c.getKey(),c.getValue(),null,false);long seq=repository.event(company,connection,c.getKey(),null,"ASSIGNEE_RELEASED",m.getKey(),null);notices.enqueue(company,c.getKey(),seq);}
            var queued=db.query("SELECT m.id,m.conversation_id FROM sales_conversation_messages m JOIN sales_wa_outbox o ON o.company_id=m.company_id AND o.message_id=m.id WHERE m.company_id=? AND m.connection_id=? AND m.author_membership_id=? AND o.state IN ('QUEUED','CLAIMED')",(r,n)->Map.entry(r.getString(1),r.getString(2)),company,connection,m.getKey());
            for(var message:queued){db.update("UPDATE sales_wa_outbox SET state='CANCELLED',error_code='ACCESS_REVOKED',fence=fence+1 WHERE company_id=? AND message_id=? AND state IN ('QUEUED','CLAIMED')",company,message.getKey());
                long seq=repository.event(company,connection,message.getValue(),null,"MESSAGE_CANCELLED",m.getKey(),null);
                db.update("UPDATE sales_conversation_messages SET dispatch_state='CANCELLED',error_code='ACCESS_REVOKED',change_seq=? WHERE company_id=? AND id=? AND dispatch_state='QUEUED'",seq,company,message.getKey());}
        }
    });}
}
