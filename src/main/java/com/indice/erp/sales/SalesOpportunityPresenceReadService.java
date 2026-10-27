package com.indice.erp.sales;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.TabPermissionAccessService;
import com.indice.erp.access.tab.TabPermissionRequirement;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Sales-owned minimal presence projection for the Whatsapping campaign audience. */
@Service
public class SalesOpportunityPresenceReadService {
  private final JdbcTemplate db;
  private final ModuleAccessService modules;
  private final TabPermissionAccessService tabs;
  public SalesOpportunityPresenceReadService(JdbcTemplate db, ModuleAccessService modules, TabPermissionAccessService tabs) {
    this.db = db; this.modules = modules; this.tabs = tabs;
  }
  /** null means no opportunity access; zero is an authorized, empty result. */
  @Transactional(readOnly = true)
  public Map<String, Integer> campaigns(AuthSessionUser actor, List<String> campaignIds) {
    if (!modules.canAccess(actor, "crm") || !tabs.canAccess(actor, TabPermissionRequirement.one("crm.leads"))) return null;
    if (campaignIds.size() > 200) throw new IllegalArgumentException("Too many campaigns");
    Map<String, Integer> counts = new HashMap<>();
    if (campaignIds.isEmpty()) return counts;
    var params = new ArrayList<Object>(); params.add(actor.companyId()); params.addAll(campaignIds);
    String placeholders = String.join(",", Collections.nCopies(campaignIds.size(), "?"));
    db.query("SELECT r.campaign_id, COUNT(DISTINCT r.contact_id) AS contact_count FROM sales_whatsapp_recipients r JOIN sales_opportunities o ON o.company_id=r.company_id AND o.contact_id=r.contact_id AND o.deleted_at IS NULL WHERE r.company_id=? AND r.campaign_id IN (" + placeholders + ") GROUP BY r.campaign_id",
        (org.springframework.jdbc.core.RowCallbackHandler) row -> counts.put(row.getString("campaign_id"), row.getInt("contact_count")), params.toArray());
    return counts;
  }
  public record StageReference(String key, String label, boolean usesDefaultLabel) {}
  public record OpportunityReference(long contactId, long id, Long flowId, String code, String name, StageReference stage) {}

  /** Authorized Sales references only; no monetary or private opportunity fields. */
  @Transactional(readOnly = true)
  public List<OpportunityReference> campaignOpportunities(AuthSessionUser actor, String campaignId) {
    if (!modules.canAccess(actor, "crm") || !tabs.canAccess(actor, TabPermissionRequirement.one("crm.leads"))) return null;
    return db.query("""
        SELECT r.contact_id, o.id, o.assigned_flow_id, o.opportunity_code, o.opportunity_name,
               COALESCE(stage.stage_key, legacy.stage_key) AS stage_key,
               COALESCE(stage.label, legacy.label) AS stage_label, flow.is_factory
        FROM sales_whatsapp_recipients r
        JOIN sales_opportunities o ON o.company_id=r.company_id AND o.contact_id=r.contact_id AND o.deleted_at IS NULL
        LEFT JOIN sales_opportunity_flows flow ON flow.company_id=o.company_id AND flow.id=o.assigned_flow_id
        LEFT JOIN sales_opportunity_flow_positions position ON position.company_id=o.company_id
          AND position.opportunity_id=o.id AND position.flow_id=o.assigned_flow_id
        LEFT JOIN sales_opportunity_flow_stages stage ON stage.company_id=position.company_id
          AND stage.id=position.stage_id AND stage.flow_id=position.flow_id
        LEFT JOIN sales_opportunity_flow_stages legacy ON position.opportunity_id IS NULL
          AND legacy.company_id=o.company_id AND legacy.flow_id=o.assigned_flow_id AND legacy.stage_key=LOWER(TRIM(o.stage)) COLLATE utf8mb4_unicode_ci
        WHERE r.company_id=? AND r.campaign_id=?
        ORDER BY r.contact_id, o.id DESC
        """, (row, n) -> {
          String key = row.getString("stage_key");
          var stage = key == null ? null : new StageReference(key, row.getString("stage_label"), row.getBoolean("is_factory"));
          return new OpportunityReference(row.getLong("contact_id"), row.getLong("id"), row.getObject("assigned_flow_id", Long.class), row.getString("opportunity_code"), row.getString("opportunity_name"), stage);
        }, actor.companyId(), campaignId);
  }

  /** Minimal audience IDs remain compatible with the result-count owner contract. */
  @Transactional(readOnly = true)
  public List<Long> campaignContacts(AuthSessionUser actor, String campaignId) {
    var opportunities = campaignOpportunities(actor, campaignId);
    return opportunities == null ? null : opportunities.stream().map(OpportunityReference::contactId).distinct().toList();
  }
}
