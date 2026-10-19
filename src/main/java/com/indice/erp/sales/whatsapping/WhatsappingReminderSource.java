package com.indice.erp.sales.whatsapping;

import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.notifications.NotificationSignalSource;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * The notification worker reminds the campaign owner; it never opens or sends a WhatsApp message.
 */
@Service
public class WhatsappingReminderSource implements NotificationSignalSource {
  private final JdbcTemplate db;
  private final ModuleAccessService modules;
  private final TabPermissionAccessService tabs;

  public WhatsappingReminderSource(
      JdbcTemplate db, ModuleAccessService modules, TabPermissionAccessService tabs) {
    this.db = db;
    this.modules = modules;
    this.tabs = tabs;
  }

  public String module() {
    return "sales";
  }

  public boolean supports(String type) {
    return "whatsapping_follow_up".equals(type);
  }

  public boolean canConfigure(AuthSessionUser a, String event) {
    return event.equals("sales_whatsapping_reminder")
        && modules.canAccess(a, "crm")
        && tabs.canAccess(a, TabPermissionRequirement.one("crm.contacts"));
  }

  private static final String QUERY =
      """
SELECT r.id,c.id AS campaign_id,c.name,r.step_index,r.next_action_at
FROM sales_whatsapp_recipients r JOIN sales_whatsapp_campaigns c ON c.company_id=r.company_id AND c.id=r.campaign_id
JOIN sales_contacts s ON s.company_id=r.company_id AND s.id=r.contact_id
WHERE r.company_id=? AND c.owner_user_id=? AND c.status='ACTIVE' AND r.state='WAITING'
AND r.next_action_at<=CURRENT_TIMESTAMP(6) AND s.deleted_at IS NULL AND s.status='active'
""";

  public List<Signal> current(AuthSessionUser a) {
    if (!canConfigure(a, "sales_whatsapping_reminder")) return List.of();
    return db.query(
        QUERY + " ORDER BY r.next_action_at,r.id LIMIT 200",
        (r, n) ->
            new Signal(
                "whatsapping_follow_up",
                r.getLong("id"),
                "sales_whatsapping_reminder",
                "whatsapping:"
                    + r.getLong("id")
                    + ":"
                    + r.getInt("step_index")
                    + ":"
                    + r.getTimestamp("next_action_at").toInstant(),
                "WhatsApp follow-up",
                r.getString("name"),
                "/sales/whatsapping?campaign=" + r.getString("campaign_id")),
        a.companyId(),
        a.userId());
  }

  public boolean visible(AuthSessionUser a, String type, long id, String event) {
    return supports(type)
        && canConfigure(a, event)
        && !db.query(
                QUERY + " AND r.id=?", (r, n) -> r.getLong("id"), a.companyId(), a.userId(), id)
            .isEmpty();
  }
}
