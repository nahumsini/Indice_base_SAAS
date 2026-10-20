package com.indice.erp.sales.mailing;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.email.accounts.EmailAccountContracts.Sender;
import com.indice.erp.email.accounts.EmailAccountService;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Operational projection. Draft membership and launched delivery snapshots have different meanings. */
@Service
public class MailingWorkspaceService {
    public record Counts(long total,long pending,long submitting,long accepted,long failed,long unknown,long suppressed,long cancelled) { }
    public record Row(String id,String name,String subject,String senderAccountId,String senderName,String status,
        Instant updatedAt,Instant scheduledAt,long selectedCount,Counts delivery,boolean requiresAttention) { }
    public record Summary(long total,long draft,long scheduled,long running,long paused,long completed,long cancelled,long attention) { }
    public record Workspace(List<Row> items,long total,int page,int pageSize,Summary summary,List<Sender> senders,
        boolean publicLinkReady,boolean canEdit,boolean canViewDetails) { }
    private final JdbcTemplate db;
    private final EmailAccountService accounts;
    private final MailingUnsubscribeService unsubscribe;
    public MailingWorkspaceService(JdbcTemplate db,EmailAccountService accounts,MailingUnsubscribeService unsubscribe) {
        this.db=db;this.accounts=accounts;this.unsubscribe=unsubscribe;
    }
    private static final Set<String> STATES=Set.of("ALL","DRAFT","SCHEDULED","RUNNING","PAUSED","COMPLETED","CANCELLED","ATTENTION");
    private static final String BASE="""
        SELECT c.id,c.name,c.subject,c.sender_account_id,c.sender_name,c.status,c.updated_at,r.scheduled_at,
          COALESCE(m.selected_count,0) selected_count,COALESCE(d.total,0) delivery_total,
          COALESCE(d.pending,0) pending,COALESCE(d.submitting,0) submitting,COALESCE(d.accepted,0) accepted,
          COALESCE(d.failed,0) failed,COALESCE(d.unknown_count,0) unknown_count,
          COALESCE(d.suppressed,0) suppressed,COALESCE(d.cancelled,0) cancelled,
          (COALESCE(d.failed,0)>0 OR COALESCE(d.unknown_count,0)>0 OR r.last_error IS NOT NULL) attention
        FROM sales_mailing_campaigns c
        LEFT JOIN sales_mailing_runs r ON r.company_id=c.company_id AND r.campaign_id=c.id
        LEFT JOIN (SELECT campaign_id,COUNT(*) selected_count FROM sales_mailing_recipients WHERE company_id=? GROUP BY campaign_id) m ON m.campaign_id=c.id
        LEFT JOIN (SELECT campaign_id,COUNT(*) total,SUM(state='PENDING') pending,SUM(state='SUBMITTING') submitting,
          SUM(state='ACCEPTED') accepted,SUM(state='FAILED') failed,SUM(state='UNKNOWN') unknown_count,
          SUM(state='SUPPRESSED') suppressed,SUM(state='CANCELLED') cancelled
          FROM sales_mailing_deliveries WHERE company_id=? GROUP BY campaign_id) d ON d.campaign_id=c.id
        WHERE c.company_id=? AND (c.name LIKE ? ESCAPE '!' OR c.subject LIKE ? ESCAPE '!')
        """;
    @Transactional(readOnly=true)
    public Workspace list(AuthSessionUser actor,String search,String status,String senderAccountId,int page,int size,
        String sort,String direction,boolean canViewDetails) {
        if(search.length()>180||!STATES.contains(status)||page<1||page>10000||!Set.of(10,25,50,100,200).contains(size)
            ||!Set.of("asc","desc").contains(direction)||(!senderAccountId.isEmpty()&&!senderAccountId.equals("NONE")&&!senderAccountId.matches("[a-f0-9-]{36}")))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"mailing_filters_invalid");
        String column=switch(sort) {case "name"->"name";case "status"->"status";case "updatedAt"->"updated_at";case "scheduledAt"->"scheduled_at";default->throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"mailing_sort_invalid");};
        String term="%"+search.replace("!","!!").replace("%","!%").replace("_","!_")+"%";
        List<Object> args=new ArrayList<>(List.of(actor.companyId(),actor.companyId(),actor.companyId(),term,term));
        String base=BASE;
        if(senderAccountId.equals("NONE"))base+=" AND c.sender_account_id IS NULL";
        else if(!senderAccountId.isEmpty()){base+=" AND c.sender_account_id=?";args.add(senderAccountId);}
        String source=" FROM ("+base+") w";
        var summary=db.queryForObject("""
            SELECT COUNT(*) total,COALESCE(SUM(status='DRAFT'),0) draft,COALESCE(SUM(status='SCHEDULED'),0) scheduled,
              COALESCE(SUM(status='RUNNING'),0) running,COALESCE(SUM(status='PAUSED'),0) paused,
              COALESCE(SUM(status='COMPLETED'),0) completed,COALESCE(SUM(status='CANCELLED'),0) cancelled,
              COALESCE(SUM(attention),0) attention
            """+source,(r,n)->new Summary(r.getLong("total"),r.getLong("draft"),r.getLong("scheduled"),r.getLong("running"),r.getLong("paused"),r.getLong("completed"),r.getLong("cancelled"),r.getLong("attention")),args.toArray());
        String where=status.equals("ALL")?"":status.equals("ATTENTION")?" WHERE attention=1":" WHERE status=?";
        if(!status.equals("ALL")&&!status.equals("ATTENTION"))args.add(status);
        long total=db.queryForObject("SELECT COUNT(*)"+source+where,Long.class,args.toArray());
        args.add(size);args.add((page-1)*size);
        var rows=db.query("SELECT *"+source+where+" ORDER BY "+column+" "+direction+",id LIMIT ? OFFSET ?",(r,n)->new Row(
            r.getString("id"),r.getString("name"),r.getString("subject"),r.getString("sender_account_id"),r.getString("sender_name"),r.getString("status"),
            r.getTimestamp("updated_at").toInstant(),r.getTimestamp("scheduled_at")==null?null:r.getTimestamp("scheduled_at").toInstant(),r.getLong("selected_count"),
            new Counts(r.getLong("delivery_total"),r.getLong("pending"),r.getLong("submitting"),r.getLong("accepted"),r.getLong("failed"),r.getLong("unknown_count"),r.getLong("suppressed"),r.getLong("cancelled")),r.getBoolean("attention")),args.toArray());
        return new Workspace(rows,total,page,size,summary,accounts.senders(actor),unsubscribe.available(),canViewDetails&&MailingService.manager(actor),canViewDetails);
    }
}
