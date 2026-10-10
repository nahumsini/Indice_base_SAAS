package com.indice.erp.messaging;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.processTasks.tasks.ProcessTaskMessagingContract;
import com.indice.erp.processTasks.tasks.ProcessTaskMessagingContract.TaskLink;
import java.time.LocalDate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.indice.erp.messaging.MessagingContracts.*;

/** Messaging owns authorization/retry receipts; task permissions and mutations stay with Tasks. */
@Service
public class MessagingTaskService {
    public record TaskContext(boolean canCreate) { }
    public record CreateTask(String title,LocalDate dueDate,String requestKey) {
        @Override public String toString() { return "CreateTask[protected]"; }
    }
    private final MessagingRepository conversations;
    private final MessagingAccess access;
    private final ProcessTaskMessagingContract tasks;
    private final JdbcTemplate db;
    public MessagingTaskService(MessagingRepository conversations,MessagingAccess access,ProcessTaskMessagingContract tasks,JdbcTemplate db) {
        this.conversations=conversations;this.access=access;this.tasks=tasks;this.db=db;
    }
    public TaskContext context(Actor a,boolean kiosk,KioskResolvedDefinition definition) {
        if(!a.member() || a.supportOnly() || kiosk && definition==null) return new TaskContext(false);
        return new TaskContext(tasks.allowed(user(a)));
    }
    @Transactional
    public TaskLink create(Actor a,long conversationId,CreateTask raw,boolean kiosk,KioskResolvedDefinition definition) {
        if(!context(a,kiosk,definition).canCreate()) throw MessagingAccess.forbidden();
        var c=conversations.find(a,conversationId,true);access.conversation(a,c);
        if(!java.util.Set.of("DIRECT","GROUP").contains(c.kind())) throw MessagingAccess.forbidden();
        if(raw==null) throw MessagingService.invalid();
        var title=MessagingService.text(raw.title(),220,true);
        var key=MessagingService.uuid(raw.requestKey());
        if(raw.dueDate()!=null && (raw.dueDate().getYear()<2000 || raw.dueDate().getYear()>9999)) throw MessagingService.invalid();
        var fingerprint=fingerprint(conversationId,title,raw.dueDate());
        // Serialize this member's keys across conversations as well as concurrent browser retries.
        db.queryForObject("SELECT id FROM user_companies WHERE id=? AND company_id=? FOR UPDATE",Long.class,a.membershipId(),a.companyId());
        var receipt=db.queryForList("SELECT task_id,fingerprint FROM messaging_task_requests WHERE company_id=? AND membership_id=? AND request_key=?",a.companyId(),a.membershipId(),key);
        var actor=user(a);
        if(!receipt.isEmpty()) {
            if(!fingerprint.equals(receipt.getFirst().get("fingerprint"))) throw MessagingService.conflict();
            return tasks.read(actor,((Number)receipt.getFirst().get("task_id")).longValue());
        }
        var result=tasks.create(actor,definition,title,raw.dueDate());
        db.update("INSERT INTO messaging_task_requests(company_id,membership_id,request_key,conversation_id,task_id,fingerprint) VALUES (?,?,?,?,?,?)",
            a.companyId(),a.membershipId(),key,conversationId,result.id(),fingerprint);
        conversations.audit(a,conversationId,"PERSONAL_TASK_CREATED","Task "+result.id());
        return result;
    }
    private AuthSessionUser user(Actor a) {
        return db.query("SELECT role FROM user_companies WHERE id=? AND user_id=? AND company_id=? AND LOWER(COALESCE(status,'active'))='active'",
            (r,n)->new AuthSessionUser(a.userId(),a.companyId(),a.membershipId(),"",r.getString(1)),a.membershipId(),a.userId(),a.companyId())
            .stream().findFirst().orElseThrow(MessagingAccess::forbidden);
    }
    private static String fingerprint(long conversationId,String title,LocalDate due) {
        try { return java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
            .digest((conversationId+"\n"+title+"\n"+due).getBytes(java.nio.charset.StandardCharsets.UTF_8))); }
        catch(java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}
