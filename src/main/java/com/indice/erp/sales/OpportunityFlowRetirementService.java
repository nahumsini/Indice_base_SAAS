package com.indice.erp.sales;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Retires a catalogue head; opportunity records, revisions and scripts remain intact. */
@Service
class OpportunityFlowRetirementService {
    private final OpportunityFlowService flows;
    private final OpportunityFlowRepository repository;
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    OpportunityFlowRetirementService(OpportunityFlowService flows, OpportunityFlowRepository repository,
                                    JdbcTemplate jdbc, ObjectMapper json) {
        this.flows=flows; this.repository=repository; this.jdbc=jdbc; this.json=json;
    }

    record Preview(long flowId, long targetFlowId, String signature, int opportunityCount,
                   List<OpportunityFlowDtos.StageResponse> stages) {}
    record Command(String commandId, String signature, long targetFlowId, Map<String,String> stageMapping) {}
    record Result(long flowId, long targetFlowId, int movedCount) {}
    record Saved(String commandId, String requestHash, Result result) {}
    record Assigned(long id, String stageKey, String lifecycle, String updatedAt) {}
    static class Changed extends RuntimeException {}

    @Transactional
    Preview preview(long company, long sourceId, long targetId) {
        var snapshot=snapshot(company,sourceId,targetId);
        return new Preview(sourceId,targetId,hash(snapshot),snapshot.assigned().size(),
            snapshot.source().stages());
    }

    @Transactional
    Result retire(long company, long actor, long sourceId, Command command) {
        if(command==null || command.signature()==null || command.signature().length()!=64
            || command.stageMapping()==null || command.stageMapping().size()>12) throw new IllegalArgumentException();
        try { if(!UUID.fromString(command.commandId()).toString().equals(command.commandId())) throw new IllegalArgumentException(); }
        catch(RuntimeException ex) { throw new IllegalArgumentException(); }
        // Existing flow writes acquire the factory head through ensureFactory(), before
        // changing stages or assignments. Acquire that same serialization point first.
        flows.catalog(company,true);
        String requestHash=hash(command);
        var replay=jdbc.query("""
            SELECT snapshot_json FROM sales_opportunity_flow_revisions
            WHERE company_id=? AND flow_id=?
              AND created_by_user_id=? AND JSON_UNQUOTE(JSON_EXTRACT(snapshot_json,'$.retirement.commandId'))=?
            ORDER BY id DESC LIMIT 1
            """,(rs,n)->rs.getString(1),company,sourceId,actor,command.commandId());
        if(!replay.isEmpty()) {
            try {
                var saved=json.treeToValue(json.readTree(replay.getFirst()).get("retirement"),Saved.class);
                if(!saved.requestHash().equals(requestHash)) throw new Changed();
                return saved.result();
            } catch(Changed ex) { throw ex; }
            catch(Exception ex) { throw new IllegalStateException("Invalid flow retirement receipt.",ex); }
        }
        var snapshot=snapshot(company,sourceId,command.targetFlowId());
        if(!hash(snapshot).equals(command.signature())) throw new Changed();
        var records=assigned(company,sourceId);
        // Bound one transaction. Large catalogues are moved through ordinary opportunity
        // maintenance before retiring their empty head.
        if(records.size()>5000) throw new IllegalArgumentException("flow_retirement_limit");
        var targets=repository.listActiveStages(company,command.targetFlowId());
        var sources=repository.listActiveStages(company,sourceId);
        for(var record:records) {
            String destination=record.lifecycle().equals("OPEN") ? command.stageMapping().get(record.stageKey())
                : targets.stream().filter(s->s.type().equals(record.lifecycle())).findFirst().orElseThrow().key();
            var target=targets.stream().filter(s->s.key().equals(destination)).findFirst().orElseThrow(IllegalArgumentException::new);
            if(!target.type().equals(record.lifecycle())) throw new IllegalArgumentException();
            // Keep OPEN/WON/LOST unchanged; only the assignment and its projection change.
            repository.lockOpportunity(company,record.id());
            repository.assignFlow(company,record.id(),command.targetFlowId(),actor);
            Long from=sources.stream().filter(s->s.key().equals(record.stageKey())).findFirst().map(OpportunityFlowRepository.StageRow::id).orElse(null);
            repository.recordPositionHistory(company,record.id(),sourceId,command.targetFlowId(),from,target.id(),"FLOW_RETIRED",actor);
            repository.upsertPosition(company,record.id(),command.targetFlowId(),target,actor);
            jdbc.update("""
                UPDATE sales_opportunities SET stage=?, probability_percent=?, updated_by_user_id=?,updated_at=CURRENT_TIMESTAMP
                WHERE company_id=? AND id=? AND assigned_flow_id=? AND deleted_at IS NULL
                """,target.key(),target.defaultProbabilityPercent(),actor,company,record.id(),command.targetFlowId());
        }
        int changed=jdbc.update("""
            UPDATE sales_opportunity_flows SET is_active=0,is_default=0,updated_by_user_id=?,updated_at=CURRENT_TIMESTAMP
            WHERE company_id=? AND id=? AND is_factory=0 AND is_active=1
            """,actor,company,sourceId);
        if(changed!=1) throw new Changed();
        if(snapshot.source().defaultFlow()) jdbc.update("""
            UPDATE sales_opportunity_flows SET is_default=(id=?),updated_by_user_id=?
            WHERE company_id=? AND is_active=1
            """,command.targetFlowId(),actor,company);
        var result=new Result(sourceId,command.targetFlowId(),records.size());
        jdbc.update("""
            INSERT INTO sales_opportunity_flow_revisions(company_id,flow_id,snapshot_json,created_by_user_id)
            VALUES (?,?,?,?)
            """,company,sourceId,serialize(Map.of("stages",sources,"retirement",new Saved(command.commandId(),requestHash,result))),actor);
        return result;
    }

    record Snapshot(OpportunityFlowDtos.FlowResponse source, OpportunityFlowDtos.FlowResponse target, List<Assigned> assigned) {}
    private Snapshot snapshot(long company,long sourceId,long targetId) {
        var catalog=flows.catalog(company,true);
        var source=catalog.flows().stream().filter(f->f.id()==sourceId).findFirst().orElseThrow(java.util.NoSuchElementException::new);
        if(source.factory() || sourceId==targetId) throw new IllegalArgumentException();
        var target=catalog.flows().stream().filter(f->f.id()==targetId).findFirst().orElseThrow(java.util.NoSuchElementException::new);
        return new Snapshot(source,target,assigned(company,sourceId));
    }
    private List<Assigned> assigned(long company,long flow) {
        return jdbc.query("""
            SELECT opportunity.id, COALESCE(stage.stage_key,LOWER(opportunity.stage)) AS stage_key,
                   opportunity.lifecycle_status,CAST(opportunity.updated_at AS CHAR) AS updated_at
            FROM sales_opportunities opportunity
            LEFT JOIN sales_opportunity_flow_positions position ON position.company_id=opportunity.company_id
              AND position.opportunity_id=opportunity.id AND position.flow_id=opportunity.assigned_flow_id
            LEFT JOIN sales_opportunity_flow_stages stage ON stage.company_id=opportunity.company_id AND stage.id=position.stage_id
            WHERE opportunity.company_id=? AND opportunity.assigned_flow_id=? AND opportunity.deleted_at IS NULL
            ORDER BY opportunity.id LIMIT 5001
            """,(rs,n)->new Assigned(rs.getLong("id"),rs.getString("stage_key"),rs.getString("lifecycle_status"),rs.getString("updated_at")),company,flow);
    }
    private String serialize(Object value) {
        try { return json.writeValueAsString(value); }
        catch(Exception ex) { throw new IllegalStateException("Unable to serialize flow retirement.",ex); }
    }
    private String hash(Object value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(serialize(value).getBytes(StandardCharsets.UTF_8))); }
        catch(java.security.NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
}
