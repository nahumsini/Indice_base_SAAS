package com.indice.erp.sales;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Statement;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
class OpportunityFlowRepository {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    OpportunityFlowRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    long ensureFactoryFlow(long companyId) {
        jdbcTemplate.update(
                """
                INSERT INTO sales_opportunity_flows
                  (company_id, flow_key, name, is_factory, is_default, is_active)
                VALUES (?, 'factory', 'Factory flow', 1, 1, 1)
                ON DUPLICATE KEY UPDATE is_factory = 1, is_active = 1
                """,
                companyId);
        return jdbcTemplate.queryForObject(
                "SELECT id FROM sales_opportunity_flows WHERE company_id = ? AND flow_key = 'factory'",
                Long.class,
                companyId);
    }

    void ensureFactoryStages(long companyId, long flowId, List<StageRow> stages) {
        for (var stage : stages) {
            upsertStage(companyId, flowId, null, stage);
        }
    }

    List<FlowRow> listFlows(long companyId) {
        return jdbcTemplate.query(
                """
                SELECT id, flow_key, name, is_factory, is_default
                FROM sales_opportunity_flows
                WHERE company_id = ?
                  AND is_active = 1
                ORDER BY is_default DESC, is_factory DESC, created_at ASC, id ASC
                """,
                (rs, rowNum) -> new FlowRow(
                        rs.getLong("id"),
                        rs.getString("flow_key"),
                        rs.getString("name"),
                        rs.getBoolean("is_factory"),
                        rs.getBoolean("is_default")),
                companyId);
    }

    Optional<FlowRow> findFlow(long companyId, long flowId) {
        return jdbcTemplate.query(
                """
                SELECT id, flow_key, name, is_factory, is_default
                FROM sales_opportunity_flows
                WHERE company_id = ?
                  AND id = ?
                  AND is_active = 1
                """,
                (rs, rowNum) -> new FlowRow(
                        rs.getLong("id"),
                        rs.getString("flow_key"),
                        rs.getString("name"),
                        rs.getBoolean("is_factory"),
                        rs.getBoolean("is_default")),
                companyId,
                flowId).stream().findFirst();
    }

    FlowRow requireFlow(long companyId, long flowId) {
        return findFlow(companyId, flowId)
                .orElseThrow(() -> new NoSuchElementException("Opportunity flow not found."));
    }

    long createFlow(long companyId, long userId, String key, String name) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                    """
                    INSERT INTO sales_opportunity_flows
                      (company_id, flow_key, name, is_factory, is_default, is_active,
                       created_by_user_id, updated_by_user_id)
                    VALUES (?, ?, ?, 0, 0, 1, ?, ?)
                    """,
                    Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, companyId);
            statement.setString(2, key);
            statement.setString(3, name);
            statement.setLong(4, userId);
            statement.setLong(5, userId);
            return statement;
        }, keyHolder);
        return keyHolder.getKey().longValue();
    }

    void updateFlowName(long companyId, long flowId, long userId, String name) {
        var updated = jdbcTemplate.update(
                """
                UPDATE sales_opportunity_flows
                SET name = ?, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
                WHERE company_id = ? AND id = ? AND is_active = 1 AND is_factory = 0
                """,
                name,
                userId,
                companyId,
                flowId);
        if (updated == 0) {
            throw new IllegalArgumentException("The factory flow cannot be edited.");
        }
    }

    List<StageRow> listActiveStages(long companyId, long flowId) {
        return jdbcTemplate.query(
                """
                SELECT id, flow_id, stage_key, label, stage_type, color_token,
                       default_probability_percent, sort_order
                FROM sales_opportunity_flow_stages
                WHERE company_id = ?
                  AND flow_id = ?
                  AND is_active = 1
                ORDER BY sort_order ASC, id ASC
                """,
                (rs, rowNum) -> new StageRow(
                        rs.getLong("id"),
                        rs.getLong("flow_id"),
                        rs.getString("stage_key"),
                        rs.getString("label"),
                        rs.getString("stage_type"),
                        rs.getString("color_token"),
                        rs.getInt("default_probability_percent"),
                        rs.getInt("sort_order")),
                companyId,
                flowId);
    }

    Map<String, Integer> positionCounts(long companyId, long flowId) {
        var counts = new LinkedHashMap<String, Integer>();
        var rows = jdbcTemplate.query(
                """
                SELECT stage.stage_key, COUNT(*) AS opportunity_count
                FROM sales_opportunity_flow_positions position
                JOIN sales_opportunity_flow_stages stage
                  ON stage.id = position.stage_id
                 AND stage.flow_id = position.flow_id
                JOIN sales_opportunities opportunity
                  ON opportunity.id = position.opportunity_id
                 AND opportunity.company_id = position.company_id
                 AND opportunity.deleted_at IS NULL
                WHERE position.company_id = ?
                  AND position.flow_id = ?
                GROUP BY stage.stage_key
                """,
                (rs, rowNum) -> Map.entry(
                        rs.getString("stage_key"), rs.getInt("opportunity_count")),
                companyId,
                flowId);
        rows.forEach(entry -> counts.put(entry.getKey(), entry.getValue()));
        return counts;
    }

    void replaceStages(long companyId, long flowId, long userId, List<StageRow> stages) {
        jdbcTemplate.update(
                """
                UPDATE sales_opportunity_flow_stages
                SET is_active = 0, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
                WHERE company_id = ? AND flow_id = ?
                """,
                userId,
                companyId,
                flowId);
        for (var stage : stages) {
            upsertStage(companyId, flowId, userId, stage);
        }
    }

    private void upsertStage(long companyId, long flowId, Long userId, StageRow stage) {
        jdbcTemplate.update(
                """
                INSERT INTO sales_opportunity_flow_stages
                  (company_id, flow_id, stage_key, label, stage_type, color_token,
                   default_probability_percent, sort_order, is_active,
                   created_by_user_id, updated_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                ON DUPLICATE KEY UPDATE
                  label = VALUES(label), stage_type = VALUES(stage_type),
                  color_token = VALUES(color_token),
                  default_probability_percent = VALUES(default_probability_percent),
                  sort_order = VALUES(sort_order), is_active = 1,
                  updated_by_user_id = VALUES(updated_by_user_id), updated_at = CURRENT_TIMESTAMP
                """,
                companyId,
                flowId,
                stage.key(),
                stage.label(),
                stage.type(),
                stage.colorToken(),
                stage.defaultProbabilityPercent(),
                stage.sortOrder(),
                userId,
                userId);
    }

    void ensurePositionsForFlow(long companyId, long flowId, Long userId) {
        jdbcTemplate.update(
                """
                INSERT INTO sales_opportunity_flow_positions
                  (company_id, opportunity_id, flow_id, stage_id, probability_percent,
                   created_by_user_id, updated_by_user_id)
                SELECT opportunity.company_id, opportunity.id, flow.id, stage.id,
                       stage.default_probability_percent, ?, ?
                FROM sales_opportunities opportunity
                JOIN sales_opportunity_flows flow
                  ON flow.company_id = opportunity.company_id
                 AND flow.id = ?
                 AND flow.is_active = 1
                JOIN sales_opportunity_flow_stages stage
                  ON stage.flow_id = flow.id
                 AND stage.is_active = 1
                 AND stage.stage_key = CASE
                   WHEN opportunity.lifecycle_status = 'WON' THEN 'won'
                   WHEN opportunity.lifecycle_status = 'LOST' THEN 'lost'
                   ELSE (
                     SELECT first_stage.stage_key
                     FROM sales_opportunity_flow_stages first_stage
                     WHERE first_stage.flow_id = flow.id
                       AND first_stage.is_active = 1
                       AND first_stage.stage_type = 'OPEN'
                     ORDER BY first_stage.sort_order, first_stage.id
                     LIMIT 1
                   )
                 END
                WHERE opportunity.company_id = ?
                  AND opportunity.deleted_at IS NULL
                ON DUPLICATE KEY UPDATE opportunity_id = VALUES(opportunity_id)
                """,
                userId,
                userId,
                flowId,
                companyId);
    }

    List<PositionRow> listPositions(long companyId, long flowId) {
        return jdbcTemplate.query(
                """
                SELECT position.opportunity_id, position.stage_id, stage.stage_key,
                       position.probability_percent
                FROM sales_opportunity_flow_positions position
                JOIN sales_opportunity_flow_stages stage
                  ON stage.id = position.stage_id
                 AND stage.flow_id = position.flow_id
                JOIN sales_opportunities opportunity
                  ON opportunity.id = position.opportunity_id
                 AND opportunity.company_id = position.company_id
                 AND opportunity.deleted_at IS NULL
                WHERE position.company_id = ? AND position.flow_id = ?
                ORDER BY position.opportunity_id
                """,
                (rs, rowNum) -> new PositionRow(
                        rs.getLong("opportunity_id"),
                        rs.getLong("stage_id"),
                        rs.getString("stage_key"),
                        rs.getInt("probability_percent")),
                companyId,
                flowId);
    }

    Optional<PositionRow> findPosition(long companyId, long opportunityId, long flowId) {
        return jdbcTemplate.query(
                """
                SELECT position.opportunity_id, position.stage_id, stage.stage_key,
                       position.probability_percent
                FROM sales_opportunity_flow_positions position
                JOIN sales_opportunity_flow_stages stage ON stage.id = position.stage_id
                WHERE position.company_id = ? AND position.opportunity_id = ? AND position.flow_id = ?
                """,
                (rs, rowNum) -> new PositionRow(
                        rs.getLong("opportunity_id"),
                        rs.getLong("stage_id"),
                        rs.getString("stage_key"),
                        rs.getInt("probability_percent")),
                companyId,
                opportunityId,
                flowId).stream().findFirst();
    }

    String opportunityLifecycle(long companyId, long opportunityId) {
        return jdbcTemplate.query(
                """
                SELECT lifecycle_status
                FROM sales_opportunities
                WHERE company_id = ? AND id = ? AND deleted_at IS NULL
                """,
                (rs, rowNum) -> rs.getString("lifecycle_status"),
                companyId,
                opportunityId).stream().findFirst()
                .orElseThrow(() -> new NoSuchElementException("Opportunity not found."));
    }

    void upsertPosition(
            long companyId,
            long opportunityId,
            long flowId,
            StageRow stage,
            long userId) {
        jdbcTemplate.update(
                """
                INSERT INTO sales_opportunity_flow_positions
                  (company_id, opportunity_id, flow_id, stage_id, probability_percent,
                   created_by_user_id, updated_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  stage_id = VALUES(stage_id), probability_percent = VALUES(probability_percent),
                  updated_by_user_id = VALUES(updated_by_user_id), updated_at = CURRENT_TIMESTAMP
                """,
                companyId,
                opportunityId,
                flowId,
                stage.id(),
                stage.defaultProbabilityPercent(),
                userId,
                userId);
    }

    void updateLifecycle(long companyId, long opportunityId, String lifecycle, long userId) {
        jdbcTemplate.update(
                """
                UPDATE sales_opportunities
                SET lifecycle_status = ?, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
                WHERE company_id = ? AND id = ? AND deleted_at IS NULL
                """,
                lifecycle,
                userId,
                companyId,
                opportunityId);
    }

    void recordPositionHistory(
            long companyId,
            long opportunityId,
            long flowId,
            Long fromStageId,
            long toStageId,
            String reason,
            long userId) {
        if (fromStageId != null && fromStageId == toStageId) {
            return;
        }
        jdbcTemplate.update(
                """
                INSERT INTO sales_opportunity_flow_position_history
                  (company_id, opportunity_id, flow_id, from_stage_id, to_stage_id,
                   reason_code, created_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                companyId,
                opportunityId,
                flowId,
                fromStageId,
                toStageId,
                reason,
                userId);
    }

    void recordRevision(long companyId, long flowId, long userId, List<StageRow> stages) {
        try {
            jdbcTemplate.update(
                    """
                    INSERT INTO sales_opportunity_flow_revisions
                      (company_id, flow_id, snapshot_json, created_by_user_id)
                    VALUES (?, ?, ?, ?)
                    """,
                    companyId,
                    flowId,
                    objectMapper.writeValueAsString(stages),
                    userId);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Unable to serialize the opportunity flow revision.", ex);
        }
    }

    record FlowRow(long id, String key, String name, boolean factory, boolean defaultFlow) {
    }

    record StageRow(
            long id,
            long flowId,
            String key,
            String label,
            String type,
            String colorToken,
            int defaultProbabilityPercent,
            int sortOrder) {

        StageRow(
                String key,
                String label,
                String type,
                String colorToken,
                int defaultProbabilityPercent,
                int sortOrder) {
            this(0L, 0L, key, label, type, colorToken, defaultProbabilityPercent, sortOrder);
        }
    }

    record PositionRow(long opportunityId, long stageId, String stageKey, int probabilityPercent) {
    }
}
