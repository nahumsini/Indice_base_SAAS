package com.indice.erp.sales.whatsapping;

import static com.indice.erp.sales.whatsapping.WhatsappingContracts.*;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import java.sql.*;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class WhatsappingRepository {
  private final JdbcTemplate db;
  private final ObjectMapper json;

  public WhatsappingRepository(JdbcTemplate db, ObjectMapper json) {
    this.db = db;
    this.json = json;
  }

  void lock(long company) {
    db.queryForObject("SELECT id FROM companies WHERE id=? FOR UPDATE", Long.class, company);
  }

  Optional<AuthSessionUser> member(AuthSessionUser a) {
    return db
        .query(
            "SELECT uc.id,uc.role,u.full_name FROM user_companies uc JOIN users u ON"
                + " u.id=uc.user_id JOIN companies c ON c.id=uc.company_id AND"
                + " c.platform_status='ACTIVE' WHERE uc.company_id=? AND uc.user_id=? AND"
                + " LOWER(COALESCE(uc.status,'active')) IN ('active','activo') ORDER BY uc.id LIMIT"
                + " 1",
            (r, n) ->
                new AuthSessionUser(
                    a.userId(), a.companyId(), r.getLong(1), r.getString(3), r.getString(2)),
            a.companyId(),
            a.userId())
        .stream()
        .findFirst();
  }

  String companyName(long company) {
    return db.queryForObject("SELECT name FROM companies WHERE id=?", String.class, company);
  }

  private String encode(Object value) {
    try {
      return json.writeValueAsString(value);
    } catch (Exception e) {
      throw new IllegalStateException("Invalid Whatsapping serialization", e);
    }
  }

  private <T> T decode(String value, TypeReference<T> type) {
    try {
      return json.readValue(value, type);
    } catch (Exception e) {
      throw new IllegalStateException("Invalid Whatsapping persistence", e);
    }
  }

  private static Instant instant(ResultSet r, String field) throws SQLException {
    Timestamp t = r.getTimestamp(field);
    return t == null ? null : t.toInstant();
  }

  private static String text(ResultSet r, String field) throws SQLException {
    return Objects.toString(r.getString(field), "");
  }

  private static final String CAMPAIGN =
      """
SELECT c.*,u.full_name AS owner_name,
(SELECT COUNT(*) FROM sales_whatsapp_recipients r WHERE r.company_id=c.company_id AND r.campaign_id=c.id) AS recipient_total,
(SELECT COUNT(*) FROM sales_whatsapp_recipients r WHERE r.company_id=c.company_id AND r.campaign_id=c.id AND r.state IN ('DONE','SKIPPED','REPLIED','BLOCKED')) AS recipient_done,
(SELECT COUNT(*) FROM sales_whatsapp_recipients r WHERE r.company_id=c.company_id AND r.campaign_id=c.id AND r.state='WAITING' AND r.next_action_at<=CURRENT_TIMESTAMP(6)) AS recipient_due
FROM sales_whatsapp_campaigns c JOIN users u ON u.id=c.owner_user_id
""";

  private Campaign campaign(ResultSet r, int n) throws SQLException {
    int total = r.getInt("recipient_total"), done = r.getInt("recipient_done");
    return new Campaign(
        r.getString("id"),
        r.getString("name"),
        r.getString("objective"),
        r.getString("offer"),
        r.getString("default_region"),
        r.getString("resource_url"),
        decode(r.getString("steps_json"), new TypeReference<List<Step>>() {}),
        r.getString("status"),
        r.getLong("owner_user_id"),
        text(r, "owner_name"),
        r.getLong("version"),
        instant(r, "updated_at"),
        total,
        done,
        total - done,
        r.getInt("recipient_due"),
        false);
  }

  Optional<Campaign> find(long company, String id) {
    return db
        .query(CAMPAIGN + " WHERE c.company_id=? AND c.id=?", this::campaign, company, id)
        .stream()
        .findFirst();
  }

  Page list(
      long company,
      String search,
      String status,
      Long owner,
      int page,
      int size,
      String sort,
      String direction) {
    String where =
        " WHERE c.company_id=? AND (?='ALL' OR c.status=?) AND (? IS NULL OR c.owner_user_id=?) AND"
            + " c.name LIKE ? ESCAPE '!'";
    Object[] args = {company, status, status, owner, owner, WhatsappingRules.term(search)};
    long total =
        db.queryForObject(
            "SELECT COUNT(*) FROM sales_whatsapp_campaigns c" + where, Long.class, args);
    var query = new ArrayList<>(Arrays.asList(args));
    query.add(size);
    query.add((page - 1) * size);
    var items =
        db.query(
            CAMPAIGN + where + " ORDER BY c." + sort + " " + direction + ",c.id LIMIT ? OFFSET ?",
            this::campaign,
            query.toArray());
    var owners =
        db.query(
            "SELECT DISTINCT u.id,u.full_name FROM sales_whatsapp_campaigns c JOIN users u ON"
                + " u.id=c.owner_user_id WHERE c.company_id=? ORDER BY u.full_name",
            (r, n) -> new Owner(r.getLong(1), r.getString(2)),
            company);
    return new Page(items, total, page, size, owners);
  }

  void save(AuthSessionUser a, String id, CampaignInput in) {
    if (in.version() == 0)
      db.update(
          "INSERT INTO"
              + " sales_whatsapp_campaigns(company_id,id,name,objective,offer,default_region,resource_url,steps_json,owner_user_id)"
              + " VALUES(?,?,?,?,?,?,?,?,?)",
          a.companyId(),
          id,
          in.name().trim(),
          in.objective(),
          in.offer().trim(),
          in.defaultRegion(),
          in.resourceUrl().trim(),
          encode(in.steps()),
          a.userId());
    else
      db.update(
          "UPDATE sales_whatsapp_campaigns SET"
              + " name=?,objective=?,offer=?,default_region=?,resource_url=?,steps_json=?,version=version+1,updated_at=CURRENT_TIMESTAMP(6)"
              + " WHERE company_id=? AND id=?",
          in.name().trim(),
          in.objective(),
          in.offer().trim(),
          in.defaultRegion(),
          in.resourceUrl().trim(),
          encode(in.steps()),
          a.companyId(),
          id);
    // Draft membership only: no delivery or history exists before activation.
    db.update(
        "DELETE FROM sales_whatsapp_recipients WHERE company_id=? AND campaign_id=?",
        a.companyId(),
        id);
    for (long contact : new LinkedHashSet<>(in.contactIds()))
      db.update(
          "INSERT INTO sales_whatsapp_recipients(company_id,campaign_id,contact_id) VALUES(?,?,?)",
          a.companyId(),
          id,
          contact);
    event(a, id, null, "SAVED", null);
  }

  void state(AuthSessionUser a, String id, String status) {
    db.update(
        "UPDATE sales_whatsapp_campaigns SET"
            + " status=?,version=version+1,updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND"
            + " id=?",
        status,
        a.companyId(),
        id);
    event(a, id, null, status, null);
  }

  private static final String CONTACT =
      "SELECT"
          + " s.id,s.company_name,s.contact_person,s.phone,s.owner_name,s.source,s.status,s.deleted_at"
          + " FROM sales_contacts s ";

  private Contact contact(ResultSet r, int n) throws SQLException {
    return new Contact(
        r.getLong("id"),
        text(r, "contact_person").isBlank() ? text(r, "company_name") : text(r, "contact_person"),
        text(r, "company_name"),
        text(r, "phone"),
        text(r, "owner_name"),
        text(r, "source"),
        r.getTimestamp("deleted_at") == null && "active".equals(r.getString("status"))
            ? "READY"
            : "INACTIVE");
  }

  ContactPage contacts(long company, String search, int page, int size) {
    String where =
        "WHERE s.company_id=? AND s.deleted_at IS NULL AND s.status='active' AND (s.company_name"
            + " LIKE ? ESCAPE '!' OR s.contact_person LIKE ? ESCAPE '!' OR s.phone LIKE ? ESCAPE"
            + " '!')";
    String term = WhatsappingRules.term(search);
    long total =
        db.queryForObject(
            "SELECT COUNT(*) FROM sales_contacts s " + where,
            Long.class,
            company,
            term,
            term,
            term);
    return new ContactPage(
        db.query(
            CONTACT
                + where
                + " ORDER BY COALESCE(NULLIF(s.contact_person,''),s.company_name),s.id LIMIT ?"
                + " OFFSET ?",
            this::contact,
            company,
            term,
            term,
            term,
            size,
            (page - 1) * size),
        total,
        page,
        size);
  }

  List<Contact> resolve(long company, List<Long> ids) {
    if (ids.isEmpty()) return List.of();
    var args = new ArrayList<Object>();
    args.add(company);
    args.addAll(new TreeSet<>(ids));
    return db.query(
        CONTACT
            + "WHERE s.company_id=? AND s.id IN ("
            + String.join(",", Collections.nCopies(args.size() - 1, "?"))
            + ") ORDER BY s.id",
        this::contact,
        args.toArray());
  }

  record StoredRecipient(
      Contact contact,
      int stepIndex,
      String state,
      Instant nextActionAt,
      String notes,
      long version,
      String preparedPhone,
      String preparedText,
      Long preparedBy) {}

  List<StoredRecipient> recipients(long company, String campaign) {
    return db.query(
        "SELECT"
            + " s.id,s.company_name,s.contact_person,s.phone,s.owner_name,s.source,s.status,s.deleted_at,r.*"
            + " FROM sales_whatsapp_recipients r JOIN sales_contacts s ON s.company_id=r.company_id"
            + " AND s.id=r.contact_id WHERE r.company_id=? AND r.campaign_id=? ORDER BY"
            + " r.contact_id",
        (r, n) ->
            new StoredRecipient(
                contact(r, n),
                r.getInt("step_index"),
                r.getString("state"),
                instant(r, "next_action_at"),
                r.getString("notes"),
                r.getLong("version"),
                r.getString("prepared_phone"),
                r.getString("prepared_text"),
                (Long) r.getObject("prepared_by")),
        company,
        campaign);
  }

  Set<String> suppressed(long company) {
    return new HashSet<>(
        db.queryForList(
            "SELECT phone FROM sales_whatsapp_suppressions WHERE company_id=?",
            String.class,
            company));
  }

  void suppress(AuthSessionUser a, String phone) {
    db.update(
        "INSERT INTO sales_whatsapp_suppressions(company_id,phone,actor_user_id) VALUES(?,?,?) ON"
            + " DUPLICATE KEY UPDATE actor_user_id=VALUES(actor_user_id)",
        a.companyId(),
        phone,
        a.userId());
  }

  void updateRecipient(
      AuthSessionUser a,
      String campaign,
      long contact,
      int step,
      String state,
      Instant due,
      String notes,
      String phone,
      String message) {
    db.update(
        "UPDATE sales_whatsapp_recipients SET"
            + " step_index=?,state=?,next_action_at=?,notes=?,prepared_phone=?,prepared_text=?,prepared_by=?,version=version+1,updated_at=CURRENT_TIMESTAMP(6)"
            + " WHERE company_id=? AND campaign_id=? AND contact_id=?",
        step,
        state,
        due == null ? null : Timestamp.from(due),
        notes,
        phone,
        message,
        phone == null ? null : a.userId(),
        a.companyId(),
        campaign,
        contact);
    db.update(
        "UPDATE sales_whatsapp_campaigns SET updated_at=CURRENT_TIMESTAMP(6),version=version+1"
            + " WHERE company_id=? AND id=?",
        a.companyId(),
        campaign);
  }

  void event(AuthSessionUser a, String campaign, Long contact, String action, Integer step) {
    db.update(
        "INSERT INTO"
            + " sales_whatsapp_events(company_id,campaign_id,contact_id,actor_user_id,action,step_index)"
            + " VALUES(?,?,?,?,?,?)",
        a.companyId(),
        campaign,
        contact,
        a.userId(),
        action,
        step);
  }

  List<Event> events(long company, String campaign) {
    return db.query(
        "SELECT e.*,u.full_name AS actor_name FROM sales_whatsapp_events e JOIN users u ON"
            + " u.id=e.actor_user_id WHERE e.company_id=? AND e.campaign_id=? ORDER BY e.id DESC"
            + " LIMIT 100",
        (r, n) ->
            new Event(
                r.getLong("id"),
                (Long) r.getObject("contact_id"),
                text(r, "actor_name"),
                r.getString("action"),
                (Integer) r.getObject("step_index"),
                instant(r, "occurred_at")),
        company,
        campaign);
  }

  List<Template> templates(long company) {
    return db.query(
        "SELECT * FROM sales_whatsapp_templates WHERE company_id=? ORDER BY status,name,id",
        (r, n) ->
            new Template(
                r.getString("id"),
                r.getString("name"),
                r.getString("body_text"),
                r.getString("status"),
                r.getLong("version")),
        company);
  }

  void template(AuthSessionUser a, String id, TemplateInput in) {
    if (in.version() == 0)
      db.update(
          "INSERT INTO sales_whatsapp_templates(company_id,id,name,body_text,status,updated_by)"
              + " VALUES(?,?,?,?,?,?)",
          a.companyId(),
          id,
          in.name().trim(),
          in.body(),
          in.status(),
          a.userId());
    else
      db.update(
          "UPDATE sales_whatsapp_templates SET"
              + " name=?,body_text=?,status=?,version=version+1,updated_by=?,updated_at=CURRENT_TIMESTAMP(6)"
              + " WHERE company_id=? AND id=?",
          in.name().trim(),
          in.body(),
          in.status(),
          a.userId(),
          a.companyId(),
          id);
  }

  List<SavedList> lists(long company) {
    return db.query(
        "SELECT * FROM sales_whatsapp_lists WHERE company_id=? ORDER BY name,id",
        (r, n) ->
            new SavedList(
                r.getString("id"),
                r.getString("name"),
                decode(r.getString("contact_ids_json"), new TypeReference<List<Long>>() {}),
                r.getLong("version")),
        company);
  }

  void list(AuthSessionUser a, String id, ListInput in) {
    if (in.version() == 0)
      db.update(
          "INSERT INTO sales_whatsapp_lists(company_id,id,name,contact_ids_json,updated_by)"
              + " VALUES(?,?,?,?,?)",
          a.companyId(),
          id,
          in.name().trim(),
          encode(new LinkedHashSet<>(in.contactIds())),
          a.userId());
    else
      db.update(
          "UPDATE sales_whatsapp_lists SET"
              + " name=?,contact_ids_json=?,version=version+1,updated_by=?,updated_at=CURRENT_TIMESTAMP(6)"
              + " WHERE company_id=? AND id=?",
          in.name().trim(),
          encode(new LinkedHashSet<>(in.contactIds())),
          a.userId(),
          a.companyId(),
          id);
  }
}
