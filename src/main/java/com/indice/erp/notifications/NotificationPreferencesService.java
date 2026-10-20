package com.indice.erp.notifications;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.hr.announcements.HrAnnouncementActor;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
class NotificationPreferencesService {
    record Item(String module, String eventType, Boolean enabled) { }
    record Change(Long version, Boolean quietMode, List<Item> items) { }
    record Response(long version, boolean quietMode, List<Item> items) { }
    record Saved(long version, boolean quietMode, Map<String,Boolean> settings) {
        boolean shows(String module,String event) {
            String key=NotificationPreferenceCatalog.module(module,event)+"."+event;
            return settings.getOrDefault(key,true) && !(quietMode && NotificationPreferenceCatalog.lowPriority(event));
        }
    }
    private final JdbcTemplate db;
    private final ObjectMapper json;
    private final NotificationAccessService access;
    NotificationPreferencesService(JdbcTemplate db,ObjectMapper json,NotificationAccessService access) { this.db=db;this.json=json;this.access=access; }

    Saved saved(HrAnnouncementActor actor) { return read(actor,false); }
    Response get(HrAnnouncementActor actor) { return response(read(actor,false),access.scope(actor)); }
    private Saved read(HrAnnouncementActor actor,boolean lock) {
        var rows=db.query("SELECT version,quiet_mode,event_settings FROM notification_preferences WHERE company_id=? AND user_id=?"+(lock?" FOR UPDATE":""),
            (rs,n)->new Saved(rs.getLong(1),rs.getBoolean(2),decode(rs.getString(3))),actor.companyId(),actor.userId());
        return rows.isEmpty()?new Saved(0,false,Map.of()):rows.getFirst();
    }
    private Response response(Saved saved,NotificationAccessService.Scope scope) {
        return new Response(saved.version(),saved.quietMode(),NotificationPreferenceCatalog.TYPES.stream()
            .filter(type->scope.allowed(type.module(),type.eventType()))
            .map(type->new Item(type.module(),type.eventType(),saved.settings().getOrDefault(type.key(),true))).toList());
    }
    @Transactional
    public Response save(HrAnnouncementActor actor,Change change) {
        if(change==null || change.version()==null || change.version()<0 || (change.quietMode()==null && (change.items()==null || change.items().isEmpty()))) throw invalid();
        var items=change.items()==null?List.<Item>of():change.items();
        if(items.size()>NotificationPreferenceCatalog.TYPES.size()) throw invalid();
        var keys=new HashSet<String>();
        for(var item:items) {
            if(item==null || item.module()==null || item.eventType()==null || item.enabled()==null) throw invalid();
            var type=new NotificationPreferenceCatalog.Type(item.module(),item.eventType());
            if(!NotificationPreferenceCatalog.TYPES.contains(type) || !keys.add(type.key())) throw invalid();
        }
        // Serialize first saves and retries on the existing authenticated membership, not a client id.
        var locked=db.query("SELECT id FROM user_companies WHERE id=? AND company_id=? AND user_id=? AND LOWER(COALESCE(status,'active')) IN ('active','activo') FOR UPDATE",
            (rs,n)->rs.getLong(1),actor.userCompanyId(),actor.companyId(),actor.userId());
        if(locked.isEmpty()) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"notification_preference_access_denied");
        var scope=access.scope(actor);
        for(var item:items) {
            if(!scope.allowed(item.module(),item.eventType())) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"notification_preference_access_denied");
        }
        var current=read(actor,true);
        boolean identical=(change.quietMode()==null || change.quietMode()==current.quietMode())
            && items.stream().allMatch(item->item.enabled().equals(current.settings().getOrDefault(item.module()+"."+item.eventType(),true)));
        if(change.version()!=current.version()) {
            if(identical) return response(current,scope); // Recover a lost acknowledgement without overwriting another tab.
            throw new ResponseStatusException(HttpStatus.CONFLICT,"notification_preferences_changed");
        }
        var settings=new HashMap<>(current.settings());
        items.forEach(item->settings.put(item.module()+"."+item.eventType(),item.enabled()));
        boolean quiet=change.quietMode()==null?current.quietMode():change.quietMode();
        long version=current.version()+1;
        if(current.version()==0) db.update("INSERT INTO notification_preferences(company_id,user_id,user_company_id,quiet_mode,event_settings,version) VALUES (?,?,?,?,?,?)",
            actor.companyId(),actor.userId(),actor.userCompanyId(),quiet,encode(settings),version);
        else db.update("UPDATE notification_preferences SET user_company_id=?,quiet_mode=?,event_settings=?,version=? WHERE company_id=? AND user_id=?",
            actor.userCompanyId(),quiet,encode(settings),version,actor.companyId(),actor.userId());
        return response(new Saved(version,quiet,Map.copyOf(settings)),scope);
    }
    private Map<String,Boolean> decode(String value) {
        try { return json.readValue(value,new TypeReference<Map<String,Boolean>>(){}); }
        catch(Exception error) { throw new IllegalStateException("Invalid stored notification preferences",error); }
    }
    private String encode(Map<String,Boolean> value) {
        try { return json.writeValueAsString(value); }
        catch(Exception error) { throw new IllegalStateException("Cannot encode notification preferences",error); }
    }
    private IllegalArgumentException invalid() { return new IllegalArgumentException("Invalid notification preferences."); }
}
