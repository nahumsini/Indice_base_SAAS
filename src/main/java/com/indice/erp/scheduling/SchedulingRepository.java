package com.indice.erp.scheduling;

import static com.indice.erp.scheduling.SchedulingDtos.*;
import java.sql.*;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class SchedulingRepository {
    private final JdbcTemplate db;
    public SchedulingRepository(JdbcTemplate db) { this.db = db; }
    public JdbcTemplate jdbc() { return db; }
    private static String currentRead() {
        return org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()
            &&!org.springframework.transaction.support.TransactionSynchronizationManager.isCurrentTransactionReadOnly()?" FOR UPDATE":"";
    }
    public void lockCompany(long company) {
        db.queryForObject("SELECT id FROM companies WHERE id = ? FOR UPDATE", Long.class, company);
    }
    public long insert(String sql, Object... args) {
        var key = new GeneratedKeyHolder();
        db.update(connection -> {
            var statement = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            for (int i=0;i<args.length;i++) statement.setObject(i+1,args[i]);
            return statement;
        }, key);
        return Objects.requireNonNull(key.getKey()).longValue();
    }
    public List<ServiceItem> services(long company) {
        return db.query("SELECT * FROM scheduling_services WHERE company_id=? ORDER BY name,id"+currentRead(),
            (r,n)->new ServiceItem(r.getLong("id"),r.getString("name"),r.getString("description"),
                r.getInt("duration_minutes"),r.getInt("buffer_minutes"),r.getInt("notice_hours"),
                r.getBoolean("active"),r.getLong("version")), company);
    }
    public List<StaffItem> staff(long company) {
        return db.query("SELECT * FROM scheduling_staff WHERE company_id=? ORDER BY public_name,id"+currentRead(),
            (r,n)->new StaffItem(r.getLong("id"),r.getLong("user_id"),r.getString("public_name"),
                r.getString("timezone"),r.getBoolean("active"),r.getLong("version"),
                days(company,r.getLong("id"))),company);
    }
    public List<AvailabilityDay> days(long company,long staff) {
        return db.query("SELECT * FROM scheduling_availability WHERE company_id=? AND staff_id=? ORDER BY day_of_week"+currentRead(),
            (r,n)->new AvailabilityDay(r.getInt("day_of_week"),r.getTime("start_time").toLocalTime(),
                r.getTime("end_time").toLocalTime()),company,staff);
    }
    public List<StaffItem> activeStaff(long company) {
        var memberIds=db.query("SELECT user_id FROM user_companies WHERE company_id=?"
            +" AND LOWER(COALESCE(status,'active')) IN ('active','activo')",(r,n)->r.getLong(1),company);
        return staff(company).stream().filter(s->s.active()&&memberIds.contains(s.userId())).toList();
    }
    public List<MemberItem> members(long company) {
        return db.query("""
            SELECT DISTINCT u.id,COALESCE(NULLIF(u.full_name,''),u.email) AS name
            FROM users u JOIN user_companies m ON m.user_id=u.id
            WHERE m.company_id=? AND LOWER(COALESCE(m.status,'active')) IN ('active','activo')
            ORDER BY name,u.id LIMIT 500
            """,(r,n)->new MemberItem(r.getLong("id"),r.getString("name")),company);
    }
    public String memberEmail(long company,long user) {
        var values=db.query("""
            SELECT u.email FROM users u JOIN user_companies m ON m.user_id=u.id
            WHERE m.company_id=? AND u.id=? AND LOWER(COALESCE(m.status,'active')) IN ('active','activo')
            LIMIT 1
            """+currentRead(),(r,n)->r.getString(1),company,user);
        if(values.isEmpty()) throw new NoSuchElementException("Active member unavailable.");
        return values.getFirst();
    }
    public String staffIdentityEmail(long company,long staff) {
        return db.queryForObject("SELECT u.email FROM scheduling_staff s JOIN users u ON u.id=s.user_id"
            +" WHERE s.company_id=? AND s.id=?"+currentRead(),String.class,company,staff);
    }
    public Optional<PageItem> page(long company) {
        return db.query("SELECT * FROM scheduling_pages WHERE company_id=?"+currentRead(),(r,n)->pageRow(r),company)
            .stream().findFirst();
    }
    private PageItem pageRow(ResultSet r) throws SQLException {
        return new PageItem(r.getLong("id"),r.getString("alias"),r.getString("title"),
            r.getString("description"),r.getBoolean("published"),r.getLong("version"),
            "/book/"+r.getString("alias"),new PageAppearance(r.getString("brand_name"),r.getString("accent_color"),
                r.getString("surface_color"),r.getString("button_label"),r.getString("display_layout")));
    }
    public record PublishedPage(long companyId,long id,String protectedToken) { }
    public Optional<PublishedPage> publishedPage(String alias) {
        return db.query("SELECT company_id,id,protected_token FROM scheduling_pages WHERE alias=? AND published=1",
            (r,n)->new PublishedPage(r.getLong(1),r.getLong(2),r.getString(3)),alias).stream().findFirst();
    }
    public String protectedToken(long company) {
        return db.queryForObject("SELECT protected_token FROM scheduling_pages WHERE company_id=?",String.class,company);
    }
    public List<EventItem> events(long company) {
        return db.query(EVENT_SELECT+" WHERE e.company_id=? ORDER BY (e.start_at < UTC_TIMESTAMP()),e.start_at,e.id LIMIT 500",
            this::eventRow,company);
    }
    public record CalendarEvents(List<EventItem> items,long total) { }
    public CalendarEvents calendarEvents(long company,Long user,Instant from,Instant to,Long staff) {
        String scope=" WHERE e.company_id=? AND e.start_at>=? AND e.start_at<?"
            +(user==null?"":" AND EXISTS (SELECT 1 FROM scheduling_staff s WHERE s.company_id=e.company_id AND s.id=e.staff_id AND s.user_id=?)")
            +(staff==null?"":" AND e.staff_id=?");
        var args=new ArrayList<Object>(List.of(company,Timestamp.from(from),Timestamp.from(to)));
        if(user!=null)args.add(user);if(staff!=null)args.add(staff);
        long total=db.queryForObject("SELECT COUNT(*) FROM scheduling_events e"+scope,Long.class,args.toArray());
        return new CalendarEvents(db.query(EVENT_SELECT+scope+" ORDER BY e.start_at,e.id LIMIT 2000",this::eventRow,args.toArray()),total);
    }
    public List<EventItem> publicEvents(long company,Instant now) {
        return db.query(EVENT_SELECT+" WHERE e.company_id=? AND e.status='ACTIVE' AND e.published=1 AND e.start_at>?"
            +" ORDER BY e.start_at,e.id LIMIT 500",this::eventRow,company,Timestamp.from(now));
    }
    public EventItem event(long company,long id) {
        return db.query(EVENT_SELECT+" WHERE e.company_id=? AND e.id=?"+currentRead(),this::eventRow,company,id)
            .stream().findFirst().orElseThrow();
    }
    private static final String EVENT_SELECT="""
            SELECT e.*,(SELECT COUNT(*) FROM scheduling_reservations r
              WHERE r.company_id=e.company_id AND r.event_id=e.id AND r.status='CONFIRMED') AS confirmed_count
            FROM scheduling_events e
            """;
    private EventItem eventRow(ResultSet r,int n)throws SQLException {
        return new EventItem(r.getLong("id"),r.getLong("staff_id"),r.getString("title"),
                r.getString("description"),r.getTimestamp("start_at").toInstant(),r.getInt("duration_minutes"),
                r.getInt("capacity"),r.getLong("confirmed_count"),r.getBoolean("published"),
                r.getString("status"),r.getLong("version"));
    }
    private static final String RESERVATION_SELECT="""
        SELECT r.*,COALESCE(s.name,e.title) AS service_name,t.public_name AS staff_name
        FROM scheduling_reservations r
        JOIN scheduling_staff t ON t.company_id=r.company_id AND t.id=r.staff_id
        LEFT JOIN scheduling_services s ON s.company_id=r.company_id AND s.id=r.service_id
        LEFT JOIN scheduling_events e ON e.company_id=r.company_id AND e.id=r.event_id
        """;
    public ReservationPage reservations(long company,Long user,Instant from,Instant to,int page,int size) {
        return reservations(company,user,from,to,page,size,null);
    }
    public ReservationPage reservations(long company,Long user,Instant from,Instant to,int page,int size,String status) {
        return reservations(company,user,from,to,page,size,status,null,false);
    }
    public ReservationPage reservations(long company,Long user,Instant from,Instant to,int page,int size,String status,Long staffId,boolean includeArchived) {
        String scope=" WHERE r.company_id=? AND r.start_at>=? AND r.start_at<?"+(user==null?"":" AND t.user_id=?")
            +(status==null?"":" AND r.status=?")+(staffId==null?"":" AND r.staff_id=?")
            +(includeArchived?"":" AND r.archived_at IS NULL");
        var args=new ArrayList<Object>(List.of(company,Timestamp.from(from),Timestamp.from(to)));
        if(user!=null)args.add(user);
        if(status!=null)args.add(status);
        if(staffId!=null)args.add(staffId);
        Long total=db.queryForObject("SELECT COUNT(*) FROM scheduling_reservations r JOIN scheduling_staff t"
            +" ON t.company_id=r.company_id AND t.id=r.staff_id"+scope,Long.class,args.toArray());
        args.add(size);args.add((page-1)*size);
        var rows=db.query(RESERVATION_SELECT+scope+" ORDER BY r.start_at,r.id LIMIT ? OFFSET ?",
            this::reservationRow,args.toArray());
        return new ReservationPage(rows,total==null?0:total,page,size);
    }
    public ReservationItem reservation(long company,long id) {
        var rows=db.query(RESERVATION_SELECT+" WHERE r.company_id=? AND r.id=?"+currentRead(),this::reservationRow,company,id);
        if(rows.isEmpty())throw new NoSuchElementException("Reservation unavailable.");
        return rows.getFirst();
    }
    private ReservationItem reservationRow(ResultSet r,int n)throws SQLException {
        return new ReservationItem(r.getLong("id"),r.getString("reference"),r.getLong("staff_id"),
            r.getObject("service_id",Long.class),r.getObject("event_id",Long.class),r.getString("service_name"),
            r.getString("staff_name"),r.getString("attendee_name"),r.getString("attendee_email"),
            r.getString("attendee_company"),r.getTimestamp("start_at").toInstant(),r.getInt("duration_minutes"),
            r.getString("status"),r.getLong("version"),r.getString("paused_from_status"),
            r.getTimestamp("archived_at")==null?null:r.getTimestamp("archived_at").toInstant());
    }
    public void audit(long company,Long actor,String entity,long id,String action) {
        db.update("INSERT INTO scheduling_audit(company_id,actor_user_id,entity_type,entity_id,action) VALUES(?,?,?,?,?)",
            company,actor,entity,id,action);
    }
    public Metrics metrics(long company,Long user,Instant from,Instant to) {
        String scope=" WHERE r.company_id=? AND r.start_at>=? AND r.start_at<?"+(user==null?"":" AND s.user_id=?");
        var args=new ArrayList<Object>(List.of(company,Timestamp.from(from),Timestamp.from(to)));
        if(user!=null)args.add(user);
        var counts=new HashMap<String,Long>();
        db.query("SELECT r.status,COUNT(*) AS total FROM scheduling_reservations r JOIN scheduling_staff s"
            +" ON s.company_id=r.company_id AND s.id=r.staff_id"+scope+" GROUP BY r.status",
            (org.springframework.jdbc.core.RowCallbackHandler) r->counts.put(r.getString("status"),r.getLong("total")),args.toArray());
        long completed=counts.getOrDefault("COMPLETED",0L),missed=counts.getOrDefault("NO_SHOW",0L);
        return new Metrics(counts.getOrDefault("REQUESTED",0L),counts.getOrDefault("CONFIRMED",0L),completed,missed,
            counts.getOrDefault("CANCELLED",0L),completed+missed==0?null:100.0*completed/(completed+missed));
    }
}
