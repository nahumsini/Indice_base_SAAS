package com.indice.erp.messaging;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import static com.indice.erp.messaging.MessagingContracts.*;

@Repository
public class MessagingRepository {
    final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate named;
    private static final String SELECT = """
        SELECT c.*, co.name company_name, COALESCE(assignee.full_name,'') assignee_name,
          COALESCE(requester.full_name,'User') requester_name,
          (SELECT COUNT(*) FROM messaging_messages m
           WHERE m.conversation_id = c.id AND m.visibility = 'PUBLIC'
             AND m.sender_user_id <> :userId AND m.id > COALESCE(
               (SELECT r.last_message_id FROM messaging_reads r WHERE r.conversation_id = c.id
                AND r.user_id = :userId AND r.actor_scope = :scope),0)) unread_count
        FROM messaging_conversations c JOIN companies co ON co.id = c.company_id
        JOIN user_companies creator ON creator.id = c.created_by_membership_id
        JOIN users requester ON requester.id = creator.user_id
        LEFT JOIN users assignee ON assignee.id = c.assigned_user_id
        """;
    private static final String PORTFOLIO = """
        c.kind = 'DISTRIBUTOR' AND c.distributor_company_id = :companyId
        AND co.platform_status = 'ACTIVE' AND UPPER(co.commercial_account_type) = 'SUPER_ADMIN'
        AND COALESCE(co.distributor_company_id,co.created_by_distributor_company_id) = :companyId
        """;

    public MessagingRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; this.named = new NamedParameterJdbcTemplate(jdbc); }
    private MapSqlParameterSource params(Actor a) {
        return new MapSqlParameterSource().addValue("userId", a.userId()).addValue("scope", a.scope())
            .addValue("companyId", a.companyId()).addValue("membershipId", a.membershipId());
    }
    private String scope(Actor a) {
        if (a.member()) return "c.company_id = :companyId AND EXISTS (SELECT 1 FROM messaging_participants p WHERE p.conversation_id = c.id AND p.membership_id = :membershipId)" + (a.supportOnly() ? " AND c.kind = 'SUPPORT'" : "");
        return "PLATFORM".equals(a.scope()) ? "c.kind = 'SUPPORT'" : PORTFOLIO;
    }
    public Conversation find(Actor a, long id, boolean lock) {
        if (lock) {
            var boundary=a.member()?" AND company_id = :companyId AND EXISTS(SELECT 1 FROM messaging_participants p WHERE p.conversation_id=messaging_conversations.id AND p.membership_id=:membershipId)"
                : "PLATFORM".equals(a.scope())?" AND kind='SUPPORT'":" AND kind='DISTRIBUTOR' AND distributor_company_id=:companyId";
            var rows = named.queryForList("SELECT id FROM messaging_conversations WHERE id = :id"+boundary+" FOR UPDATE", params(a).addValue("id",id),Long.class);
            if (rows.isEmpty()) throw MessagingAccess.notFound();
        }
        return named.query(SELECT + " WHERE c.id = :id AND " + scope(a), params(a).addValue("id", id), this::conversation)
            .stream().findFirst().orElseThrow(MessagingAccess::notFound);
    }
    public Page<Conversation> list(Actor a, String filter, String query, int offset) {
        var condition = switch (filter) {
            case "UNASSIGNED" -> " AND c.assigned_user_id IS NULL AND c.status <> 'RESOLVED'";
            case "MINE" -> " AND c.assigned_user_id = :userId AND c.status <> 'RESOLVED'";
            case "OPEN", "WAITING_CUSTOMER", "RESOLVED" -> " AND c.status = :filter";
            case "DIRECT", "SUPPORT", "DISTRIBUTOR" -> " AND c.kind = :filter";
            default -> "";
        };
        var rows = named.query(SELECT + " WHERE " + scope(a) + condition
            + " AND (c.subject LIKE :query OR co.name LIKE :query OR requester.full_name LIKE :query)"
            + " ORDER BY c.updated_at DESC, c.id DESC LIMIT 41 OFFSET :offset",
            params(a).addValue("filter", filter).addValue("query", "%" + query + "%").addValue("offset", offset), this::conversation);
        return page(rows, 40);
    }
    public List<Person> directory(Actor a, String query) {
        return jdbc.query("""
            SELECT uc.id, COALESCE(NULLIF(u.full_name,''),'User') name FROM user_companies uc
            JOIN users u ON u.id = uc.user_id WHERE uc.company_id = ? AND uc.id <> ?
              AND LOWER(COALESCE(uc.status,'active')) = 'active' AND COALESCE(u.full_name,'') LIKE ?
            ORDER BY name, uc.id LIMIT 40
            """, (rs,n) -> new Person(rs.getLong(1), rs.getString(2)), a.companyId(), a.membershipId(), "%" + query + "%");
    }
    public Person distributor(long companyId) {
        return jdbc.query("""
            SELECT d.id, d.name FROM companies c JOIN companies d
              ON d.id = COALESCE(c.distributor_company_id,c.created_by_distributor_company_id)
            WHERE c.id = ? AND c.platform_status = 'ACTIVE' AND UPPER(c.commercial_account_type) = 'SUPER_ADMIN'
              AND d.platform_status = 'ACTIVE' AND UPPER(d.commercial_account_type) = 'DISTRIBUTOR'
            """, (rs,n) -> new Person(rs.getLong(1),rs.getString(2)), companyId).stream().findFirst().orElse(null);
    }
    public long unread(Actor a) {
        return named.queryForObject("""
            SELECT COUNT(*) FROM messaging_messages m JOIN messaging_conversations c ON c.id=m.conversation_id
            WHERE c.company_id=:companyId AND m.visibility='PUBLIC' AND m.sender_user_id<>:userId
              AND EXISTS(SELECT 1 FROM messaging_participants p WHERE p.conversation_id=c.id AND p.membership_id=:membershipId)
              AND m.id>COALESCE((SELECT last_message_id FROM messaging_reads r WHERE r.conversation_id=c.id
                AND r.user_id=:userId AND r.actor_scope=:scope),0)
            """ + (a.supportOnly() ? " AND c.kind = 'SUPPORT'" : ""),params(a),Long.class);
    }
    public Page<Message> messages(Actor a, long id, long after, long before) {
        var rows = jdbc.query("""
            SELECT m.*, COALESCE(u.full_name,'User') sender_name FROM messaging_messages m
            JOIN users u ON u.id = m.sender_user_id WHERE m.conversation_id = ?
              AND (m.visibility = 'PUBLIC' OR (m.visibility = 'INTERNAL' AND m.sender_scope = ? AND ? <> 'MEMBER'))
            """ + (after > 0 ? " AND m.id > ? ORDER BY m.id ASC" : " AND m.id < ? ORDER BY m.id DESC") + " LIMIT 51",
            this::message, id, a.scope(), a.scope(), after > 0 ? after : before > 0 ? before : Long.MAX_VALUE);
        var page = page(rows, 50);
        if (after > 0) return page;
        var ordered = new ArrayList<>(page.items());
        java.util.Collections.reverse(ordered);
        return new Page<>(ordered, page.hasMore());
    }
    public Message duplicate(Actor a, long id, String key) {
        return jdbc.query("""
            SELECT m.*, COALESCE(u.full_name,'User') sender_name FROM messaging_messages m
            JOIN users u ON u.id = m.sender_user_id
            WHERE m.conversation_id = ? AND m.sender_user_id = ? AND m.sender_scope = ? AND m.request_key = ?
            """, this::message, id, a.userId(), a.scope(), key).stream().findFirst().orElse(null);
    }
    public List<Person> assignees(Actor a) {
        if ("PLATFORM".equals(a.scope())) return jdbc.query("""
            SELECT u.id, COALESCE(u.full_name,'User') FROM platform_administrators p JOIN users u ON u.id = p.user_id
            WHERE p.status = 'ACTIVE' AND (p.platform_role = 'PLATFORM_ROOT' OR EXISTS
              (SELECT 1 FROM platform_administrator_permissions x WHERE x.platform_administrator_id = p.id
               AND x.permission_code = 'SYSTEM_TICKETS_MANAGE')) ORDER BY u.full_name LIMIT 200
            """, (rs,n) -> new Person(rs.getLong(1),rs.getString(2)));
        return jdbc.query("""
            SELECT u.id, COALESCE(u.full_name,'User') FROM user_companies uc JOIN users u ON u.id = uc.user_id
            WHERE uc.company_id = ? AND LOWER(uc.status) = 'active'
              AND LOWER(uc.role) IN ('root','superadmin','owner','dueno','admin') ORDER BY u.full_name LIMIT 200
            """, (rs,n) -> new Person(rs.getLong(1),rs.getString(2)), a.companyId());
    }
    public Summary summary(Actor a) {
        var values = named.queryForMap("""
            SELECT COALESCE(SUM(c.assigned_user_id IS NULL AND c.status <> 'RESOLVED'),0) unassigned,
              COALESCE(SUM(c.status = 'OPEN'),0) waiting_care,
              COALESCE(SUM(c.status = 'WAITING_CUSTOMER'),0) waiting_customer,
              COALESCE(SUM(c.status = 'RESOLVED'),0) resolved,
              COALESCE(SUM(c.status = 'OPEN' AND c.awaiting_since < CURRENT_TIMESTAMP - INTERVAL 24 HOUR),0) overdue,
              AVG(TIMESTAMPDIFF(MINUTE,c.created_at,c.first_response_at)) first_response,
              AVG(TIMESTAMPDIFF(MINUTE,c.created_at,c.resolved_at)) resolution
            FROM messaging_conversations c JOIN companies co ON co.id = c.company_id WHERE
            """ + scope(a), params(a));
        long pending = "PLATFORM".equals(a.scope()) ? jdbc.queryForObject(
            "SELECT COUNT(*) FROM messaging_notification_outbox WHERE delivered_at IS NULL", Long.class) : 0;
        return new Summary(number(values,"unassigned"), number(values,"waiting_care"), number(values,"waiting_customer"),
            number(values,"resolved"), number(values,"overdue"), nullableNumber(values,"first_response"), nullableNumber(values,"resolution"), pending);
    }
    public void audit(Actor a, long id, String action, String detail) {
        jdbc.update("INSERT INTO messaging_audit(conversation_id,actor_user_id,action,detail) VALUES (?,?,?,?)", id,a.userId(),action,detail);
    }
    public Long creation(Actor a, String key) {
        return jdbc.queryForList("SELECT id FROM messaging_conversations WHERE company_id = ? AND created_by_membership_id = ? AND request_key = ?",
            Long.class,a.companyId(),a.membershipId(),key).stream().findFirst().orElse(null);
    }
    public boolean activeRecipient(Actor a, long id) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM user_companies WHERE id = ? AND company_id = ? AND LOWER(COALESCE(status,'active')) = 'active'",
            Integer.class,id,a.companyId()) == 1;
    }
    public String creationFingerprint(Actor a,String key) {
        return jdbc.queryForList("SELECT creation_fingerprint FROM messaging_conversations WHERE company_id=? AND created_by_membership_id=? AND request_key=?",
            String.class,a.companyId(),a.membershipId(),key).stream().findFirst().orElse(null);
    }
    public long create(Actor a, Create r, Long distributorId, String directKey, String fingerprint) {
        jdbc.update("""
            INSERT INTO messaging_conversations(company_id,kind,subject,topic,module_name,language,created_by_membership_id,
              distributor_company_id,direct_key,request_key,creation_fingerprint) VALUES (?,?,?,?,?,?,?,?,?,?,?)
            ON DUPLICATE KEY UPDATE id = id
            """,a.companyId(),r.kind(),r.subject(),r.topic(),r.moduleName(),r.language(),a.membershipId(),distributorId,directKey,r.requestKey(),fingerprint);
        var id = jdbc.queryForObject("""
            SELECT id FROM messaging_conversations WHERE company_id = ?
            AND ((created_by_membership_id = ? AND request_key = ?) OR direct_key = ?) LIMIT 1
            """,Long.class,a.companyId(),a.membershipId(),r.requestKey(),directKey);
        jdbc.update("INSERT IGNORE INTO messaging_participants(conversation_id,membership_id) VALUES (?,?)",id,a.membershipId());
        if (r.recipientMembershipId()!=null) jdbc.update("INSERT IGNORE INTO messaging_participants(conversation_id,membership_id) VALUES (?,?)",id,r.recipientMembershipId());
        return id;
    }
    public boolean isParticipant(long conversationId, long membershipId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM messaging_participants WHERE conversation_id = ? AND membership_id = ?",Integer.class,conversationId,membershipId)==1;
    }
    public boolean hasRevokedParticipant(long conversationId,long companyId) {
        return jdbc.queryForObject("""
            SELECT COUNT(*) FROM messaging_participants p JOIN user_companies uc ON uc.id=p.membership_id
            WHERE p.conversation_id=? AND (LOWER(COALESCE(uc.status,'active')) <> 'active' OR uc.company_id <> ?)
            """,Integer.class,conversationId,companyId)!=0;
    }
    public void requireSendCapacity(Actor a) {
        jdbc.queryForObject("SELECT id FROM users WHERE id = ? FOR UPDATE",Long.class,a.userId());
        var count = jdbc.queryForObject("SELECT COUNT(*) FROM messaging_messages WHERE sender_user_id = ? AND created_at > CURRENT_TIMESTAMP - INTERVAL 1 MINUTE",Integer.class,a.userId());
        if (count != null && count >= 30) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS,"message_rate_limit");
    }
    public Message insertMessage(Actor a, long id, Send r) {
        jdbc.update("INSERT INTO messaging_messages(conversation_id,sender_user_id,sender_scope,visibility,request_key,body) VALUES (?,?,?,?,?,?)",
            id,a.userId(),a.scope(),r.visibility(),r.requestKey(),r.body());
        return duplicate(a,id,r.requestKey());
    }
    public void afterMessage(Actor a, Conversation c, Message m) {
        var publicMessage = "PUBLIC".equals(m.visibility());
        if (publicMessage) {
            boolean careReply = !a.member();
            String next = "DIRECT".equals(c.kind()) ? "OPEN" : careReply ? "WAITING_CUSTOMER" : "OPEN";
            jdbc.update("""
                UPDATE messaging_conversations SET last_message_id = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP(6),
                  awaiting_since = IF(status <> ?,CURRENT_TIMESTAMP(6),awaiting_since), status = ?, resolved_at = NULL,
                  first_response_at = IF(? AND first_response_at IS NULL,CURRENT_TIMESTAMP(6),first_response_at)
                WHERE id = ?
                """,m.id(),next,next,careReply,c.id());
            jdbc.update("""
                INSERT INTO messaging_notification_outbox(message_id,company_id,recipient_membership_id)
                SELECT ?,uc.company_id,uc.id FROM messaging_participants p JOIN user_companies uc ON uc.id=p.membership_id
                WHERE p.conversation_id = ? AND uc.user_id <> ? AND LOWER(COALESCE(uc.status,'active')) = 'active'
                """,m.id(),c.id(),a.userId());
        } else jdbc.update("UPDATE messaging_conversations SET version = version + 1 WHERE id = ?",c.id());
    }
    public void read(Actor a, long id, long messageId) {
        var valid = jdbc.queryForObject("""
            SELECT COUNT(*) FROM messaging_messages WHERE id = ? AND conversation_id = ?
            AND (visibility = 'PUBLIC' OR (sender_scope = ? AND ? <> 'MEMBER'))
            """,Integer.class,messageId,id,a.scope(),a.scope());
        if (valid == null || valid != 1) throw MessagingAccess.notFound();
        jdbc.update("""
            INSERT INTO messaging_reads(conversation_id,user_id,actor_scope,last_message_id) VALUES (?,?,?,?)
            ON DUPLICATE KEY UPDATE last_message_id = GREATEST(last_message_id,VALUES(last_message_id))
            """,id,a.userId(),a.scope(),messageId);
    }
    public void assign(long id, Long assignee) {
        jdbc.update("UPDATE messaging_conversations SET assigned_user_id = ?, version = version + 1 WHERE id = ?",assignee,id);
    }
    public void status(long id, String status) {
        jdbc.update("""
            UPDATE messaging_conversations SET status = ?, resolved_at = IF(? = 'RESOLVED',CURRENT_TIMESTAMP(6),NULL),
              awaiting_since = CURRENT_TIMESTAMP(6), updated_at = CURRENT_TIMESTAMP(6), version = version + 1 WHERE id = ?
            """,status,status,id);
    }
    public void priority(long id, String priority) {
        jdbc.update("UPDATE messaging_conversations SET priority = ?, version = version + 1 WHERE id = ?",priority,id);
    }
    public void transfer(long id) {
        jdbc.update("""
            UPDATE messaging_conversations SET kind = 'SUPPORT', assigned_user_id = NULL, status = 'OPEN', resolved_at = NULL,
              awaiting_since = CURRENT_TIMESTAMP(6), updated_at = CURRENT_TIMESTAMP(6), version = version + 1 WHERE id = ?
            """,id);
    }
    public List<Audit> audit(long id, long before) {
        return jdbc.query("""
            SELECT a.*, COALESCE(u.full_name,'User') actor_name FROM messaging_audit a JOIN users u ON u.id = a.actor_user_id
            WHERE a.conversation_id = ? AND a.id < ? ORDER BY a.id DESC LIMIT 50
            """, (rs,n) -> new Audit(rs.getLong("id"),rs.getString("actor_name"),rs.getString("action"),rs.getString("detail"),instant(rs,"created_at")), id, before > 0 ? before : Long.MAX_VALUE);
    }
    private Conversation conversation(ResultSet r, int n) throws SQLException {
        return new Conversation(r.getLong("id"),r.getLong("company_id"),r.getString("company_name"),r.getString("kind"),r.getString("subject"),
            r.getString("topic"),r.getString("module_name"),r.getString("language"),r.getString("status"),r.getString("priority"),r.getLong("created_by_membership_id"),
            r.getObject("distributor_company_id",Long.class),r.getObject("assigned_user_id",Long.class),r.getString("assignee_name"),r.getString("requester_name"),
            r.getLong("version"),r.getObject("last_message_id",Long.class),instant(r,"first_response_at"),instant(r,"resolved_at"),instant(r,"awaiting_since"),
            instant(r,"created_at"),instant(r,"updated_at"),r.getLong("unread_count"));
    }
    private Message message(ResultSet r, int n) throws SQLException {
        return new Message(r.getLong("id"),r.getLong("conversation_id"),r.getLong("sender_user_id"),r.getString("sender_name"),r.getString("sender_scope"),
            r.getString("visibility"),r.getString("request_key"),r.getString("body"),instant(r,"created_at"));
    }
    static Instant instant(ResultSet r, String name) throws SQLException { var value=r.getTimestamp(name); return value == null ? null : value.toInstant(); }
    static <T> Page<T> page(List<T> rows, int limit) { return new Page<>(List.copyOf(rows.subList(0,Math.min(limit,rows.size()))),rows.size()>limit); }
    private static long number(Map<String,Object> m,String key) { return ((Number)m.get(key)).longValue(); }
    private static Long nullableNumber(Map<String,Object> m,String key) { return m.get(key)==null ? null : number(m,key); }
}
