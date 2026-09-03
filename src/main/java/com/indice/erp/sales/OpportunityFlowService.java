package com.indice.erp.sales;

import com.indice.erp.sales.OpportunityFlowDtos.CatalogResponse;
import com.indice.erp.sales.OpportunityFlowDtos.FlowResponse;
import com.indice.erp.sales.OpportunityFlowDtos.PositionResponse;
import com.indice.erp.sales.OpportunityFlowDtos.PositionsResponse;
import com.indice.erp.sales.OpportunityFlowDtos.SaveFlowRequest;
import com.indice.erp.sales.OpportunityFlowDtos.StageRequest;
import com.indice.erp.sales.OpportunityFlowDtos.StageResponse;
import com.indice.erp.sales.OpportunityFlowRepository.FlowRow;
import com.indice.erp.sales.OpportunityFlowRepository.StageRow;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class OpportunityFlowService {

    private static final int MAX_FLOWS = 10;
    private static final int MAX_STAGES = 12;
    private static final Set<String> REQUIRED_KEYS = Set.of("won", "lost");
    private static final Set<String> TERMINAL_KEYS = Set.of("won", "lost");
    private static final Set<String> COLOR_TOKENS = Set.of(
            "BLUE", "AQUA", "GREEN", "YELLOW", "CORAL", "VIOLET", "SLATE");
    private static final Pattern NON_KEY_CHARACTER = Pattern.compile("[^a-z0-9]+");
    private static final List<StageRow> DEFAULT_STAGES = List.of(
            new StageRow("new", "New", "OPEN", "BLUE", 10, 0),
            new StageRow("contacted", "Contacted", "OPEN", "AQUA", 25, 1),
            new StageRow("qualified", "Qualified", "OPEN", "GREEN", 50, 2),
            new StageRow("proposal", "Proposal", "OPEN", "YELLOW", 75, 3),
            new StageRow("negotiation", "Negotiation", "OPEN", "CORAL", 90, 4),
            new StageRow("won", "Won", "WON", "GREEN", 100, 5),
            new StageRow("lost", "Lost", "LOST", "CORAL", 0, 6));

    private final OpportunityFlowRepository repository;

    OpportunityFlowService(OpportunityFlowRepository repository) {
        this.repository = repository;
    }

    @Transactional
    CatalogResponse catalog(long companyId, boolean canManage) {
        ensureFactory(companyId);
        var flows = repository.listFlows(companyId);
        var defaultFlowId = defaultFlowId(flows);
        return new CatalogResponse(
                flows.stream().map(flow -> response(companyId, flow)).toList(),
                defaultFlowId,
                canManage);
    }

    @Transactional
    FlowResponse create(long companyId, long userId, SaveFlowRequest request) {
        ensureFactory(companyId);
        var flows = repository.listFlows(companyId);
        if (flows.size() >= MAX_FLOWS) {
            throw new IllegalArgumentException("A company can have at most 10 active opportunity flows.");
        }
        var name = cleanName(request == null ? null : request.name());
        var stages = normalize(request == null ? null : request.stages());
        var flowId = repository.createFlow(companyId, userId, uniqueFlowKey(name, flows), name);
        repository.replaceStages(companyId, flowId, userId, stages);
        repository.recordRevision(companyId, flowId, userId, stages);

        // A new flow deliberately starts every open opportunity at its first open
        // stage. Global Won/Lost lifecycle is mirrored to its terminal stages.
        repository.ensurePositionsForFlow(companyId, flowId, userId);
        return response(companyId, repository.requireFlow(companyId, flowId));
    }

    @Transactional
    FlowResponse update(long companyId, long flowId, long userId, SaveFlowRequest request) {
        ensureFactory(companyId);
        var flow = repository.requireFlow(companyId, flowId);
        if (flow.factory()) {
            throw new IllegalArgumentException("The factory opportunity flow is read-only.");
        }
        var name = cleanName(request == null ? null : request.name());
        var stages = normalize(request == null ? null : request.stages());
        var nextKeys = stages.stream().map(StageRow::key).collect(java.util.stream.Collectors.toSet());
        repository.positionCounts(companyId, flowId).entrySet().stream()
                .filter(entry -> entry.getValue() > 0 && !nextKeys.contains(entry.getKey()))
                .findFirst()
                .ifPresent(entry -> {
                    throw new IllegalArgumentException(
                            "Stage '" + entry.getKey()
                                    + "' still has opportunities in this flow. Move them before removing the stage.");
                });

        repository.updateFlowName(companyId, flowId, userId, name);
        repository.replaceStages(companyId, flowId, userId, stages);
        repository.recordRevision(companyId, flowId, userId, stages);
        repository.ensurePositionsForFlow(companyId, flowId, userId);
        return response(companyId, repository.requireFlow(companyId, flowId));
    }

    @Transactional
    PositionsResponse positions(long companyId, long flowId) {
        ensureFactory(companyId);
        repository.requireFlow(companyId, flowId);
        repository.ensurePositionsForFlow(companyId, flowId, null);
        var positions = repository.listPositions(companyId, flowId).stream()
                .map(position -> new PositionResponse(
                        position.opportunityId(), position.stageKey(), position.probabilityPercent()))
                .toList();
        return new PositionsResponse(flowId, positions);
    }

    @Transactional
    MoveResult initializeOpportunity(
            long companyId,
            long userId,
            long opportunityId,
            Long selectedFlowId,
            String rawStage) {
        ensureFactory(companyId);
        var flows = repository.listFlows(companyId);
        var activeFlowId = selectedFlowId == null ? defaultFlowId(flows) : selectedFlowId;
        repository.requireFlow(companyId, activeFlowId);
        var requestedKey = normalizeExistingKey(rawStage);
        var lifecycle = lifecycleForKey(requestedKey);
        repository.updateLifecycle(companyId, opportunityId, lifecycle, userId);

        MoveResult selectedPosition = null;
        for (var flow : flows) {
            var stages = repository.listActiveStages(companyId, flow.id());
            var target = terminalStage(stages, lifecycle)
                    .orElseGet(() -> flow.id() == activeFlowId && !requestedKey.isBlank()
                            ? requireStage(stages, requestedKey, "stage is not active in the selected opportunity flow.")
                            : firstOpenStage(stages));
            repository.recordPositionHistory(
                    companyId, opportunityId, flow.id(), null, target.id(), "INITIALIZED", userId);
            repository.upsertPosition(companyId, opportunityId, flow.id(), target, userId);
            if (flow.id() == activeFlowId) {
                selectedPosition = new MoveResult(
                        target.key(), lifecycle, target.defaultProbabilityPercent());
            }
        }
        if (selectedPosition == null) {
            throw new IllegalStateException("The selected opportunity flow is not active.");
        }
        return selectedPosition;
    }

    @Transactional
    MoveResult moveOpportunity(
            long companyId,
            long userId,
            long opportunityId,
            Long selectedFlowId,
            String rawStage) {
        ensureFactory(companyId);
        var flows = repository.listFlows(companyId);
        var activeFlowId = selectedFlowId == null ? defaultFlowId(flows) : selectedFlowId;
        repository.requireFlow(companyId, activeFlowId);
        repository.ensurePositionsForFlow(companyId, activeFlowId, userId);
        var requested = requireStage(
                repository.listActiveStages(companyId, activeFlowId),
                normalizeExistingKey(rawStage),
                "stage is not active in the selected opportunity flow.");
        var lifecycle = repository.opportunityLifecycle(companyId, opportunityId);

        if (!"OPEN".equals(lifecycle)) {
            if (!lifecycle.equals(requested.type())) {
                throw new IllegalArgumentException(
                        "Won or lost opportunities cannot be reopened by changing their flow.");
            }
            return new MoveResult(requested.key(), lifecycle, requested.defaultProbabilityPercent());
        }

        if ("OPEN".equals(requested.type())) {
            movePosition(companyId, opportunityId, activeFlowId, requested, userId, "MOVED");
            return new MoveResult(requested.key(), "OPEN", requested.defaultProbabilityPercent());
        }

        // Closing in any flow is global. Synchronizing every terminal position
        // prevents a later flow selection from making the opportunity look open.
        repository.updateLifecycle(companyId, opportunityId, requested.type(), userId);
        for (var flow : flows) {
            var terminal = terminalStage(repository.listActiveStages(companyId, flow.id()), requested.type())
                    .orElseThrow(() -> new IllegalStateException("Every opportunity flow must contain Won and Lost."));
            movePosition(companyId, opportunityId, flow.id(), terminal, userId, "TERMINAL_SYNC");
        }
        return new MoveResult(requested.key(), requested.type(), requested.defaultProbabilityPercent());
    }

    @Transactional
    MoveResult closeOpportunityAsWon(long companyId, long userId, long opportunityId) {
        ensureFactory(companyId);
        var flows = repository.listFlows(companyId);
        var activeFlowId = defaultFlowId(flows);
        repository.ensurePositionsForFlow(companyId, activeFlowId, userId);
        var activeWonStage = terminalStage(repository.listActiveStages(companyId, activeFlowId), "WON")
                .orElseThrow(() -> new IllegalStateException("The active opportunity flow does not contain a won stage."));
        return moveOpportunity(companyId, userId, opportunityId, activeFlowId, activeWonStage.key());
    }

    @Transactional
    String requireActiveStage(long companyId, long flowId, String rawStage) {
        ensureFactory(companyId);
        repository.requireFlow(companyId, flowId);
        return requireStage(
                repository.listActiveStages(companyId, flowId),
                normalizeExistingKey(rawStage),
                "stage is not active in the selected opportunity flow.").key();
    }

    String requireActiveStage(long companyId, String rawStage) {
        var flowId = defaultFlowId(companyId);
        return requireActiveStage(companyId, flowId, rawStage);
    }

    @Transactional
    String initialStage(long companyId, long flowId) {
        ensureFactory(companyId);
        repository.requireFlow(companyId, flowId);
        return firstOpenStage(repository.listActiveStages(companyId, flowId)).key();
    }

    String initialStage(long companyId) {
        return initialStage(companyId, defaultFlowId(companyId));
    }

    @Transactional
    long defaultFlowId(long companyId) {
        ensureFactory(companyId);
        return defaultFlowId(repository.listFlows(companyId));
    }

    @Transactional
    List<String> activeStageKeys(long companyId) {
        var flowId = defaultFlowId(companyId);
        return repository.listActiveStages(companyId, flowId).stream().map(StageRow::key).toList();
    }

    private void movePosition(
            long companyId,
            long opportunityId,
            long flowId,
            StageRow target,
            long userId,
            String reason) {
        var currentStageId = repository.findPosition(companyId, opportunityId, flowId)
                .map(OpportunityFlowRepository.PositionRow::stageId)
                .orElse(null);
        repository.recordPositionHistory(
                companyId, opportunityId, flowId, currentStageId, target.id(), reason, userId);
        repository.upsertPosition(companyId, opportunityId, flowId, target, userId);
    }

    private long ensureFactory(long companyId) {
        var factoryFlowId = repository.ensureFactoryFlow(companyId);
        repository.ensureFactoryStages(companyId, factoryFlowId, DEFAULT_STAGES);
        return factoryFlowId;
    }

    private long defaultFlowId(List<FlowRow> flows) {
        return flows.stream()
                .filter(FlowRow::defaultFlow)
                .map(FlowRow::id)
                .findFirst()
                .orElseGet(() -> flows.stream().findFirst().map(FlowRow::id)
                        .orElseThrow(() -> new IllegalStateException("The company does not have an opportunity flow.")));
    }

    private FlowResponse response(long companyId, FlowRow flow) {
        var counts = repository.positionCounts(companyId, flow.id());
        var stages = repository.listActiveStages(companyId, flow.id()).stream()
                .map(stage -> new StageResponse(
                        stage.key(),
                        stage.label(),
                        stage.type(),
                        stage.colorToken(),
                        stage.defaultProbabilityPercent(),
                        stage.sortOrder(),
                        REQUIRED_KEYS.contains(stage.key()),
                        counts.getOrDefault(stage.key(), 0)))
                .toList();
        return new FlowResponse(
                flow.id(), flow.key(), flow.name(), flow.factory(), flow.defaultFlow(), stages);
    }

    private List<StageRow> normalize(List<StageRequest> requests) {
        if (requests == null || requests.size() < 3 || requests.size() > MAX_STAGES) {
            throw new IllegalArgumentException("The opportunity flow must contain between 3 and 12 stages.");
        }
        var stagesByKey = new LinkedHashMap<String, StageRow>();
        var reservedKeys = new HashSet<String>();
        var normalizedLabels = new HashSet<String>();
        requests.stream()
                .filter(java.util.Objects::nonNull)
                .map(StageRequest::key)
                .filter(key -> key != null && !key.isBlank())
                .map(this::normalizeExistingKey)
                .forEach(reservedKeys::add);

        for (var index = 0; index < requests.size(); index++) {
            var request = requests.get(index);
            if (request == null) {
                throw new IllegalArgumentException("Each stage must be an object.");
            }
            var label = cleanLabel(request.label());
            var key = request.key() == null || request.key().isBlank()
                    ? uniqueKey(label, reservedKeys)
                    : normalizeExistingKey(request.key());
            if (key.isBlank() || key.length() > 64) {
                throw new IllegalArgumentException("Each stage must have a valid key of at most 64 characters.");
            }
            if (stagesByKey.containsKey(key)) {
                throw new IllegalArgumentException("Stage keys must be unique.");
            }
            if (!normalizedLabels.add(label.toLowerCase(Locale.ROOT))) {
                throw new IllegalArgumentException("Stage labels must be unique.");
            }
            reservedKeys.add(key);
            var type = "won".equals(key) ? "WON" : "lost".equals(key) ? "LOST" : "OPEN";
            var probability = request.defaultProbabilityPercent() == null
                    ? defaultProbability(key)
                    : request.defaultProbabilityPercent();
            if ("WON".equals(type)) {
                probability = 100;
            } else if ("LOST".equals(type)) {
                probability = 0;
            } else if (probability < 0 || probability > 100) {
                throw new IllegalArgumentException("Stage probability must be between 0 and 100.");
            }
            stagesByKey.put(key, new StageRow(
                    key, label, type, normalizeColor(request.colorToken()), probability, index));
        }

        if (!stagesByKey.keySet().containsAll(REQUIRED_KEYS)) {
            throw new IllegalArgumentException("The protected stages Won and Lost are required.");
        }
        if (stagesByKey.values().stream().noneMatch(stage -> "OPEN".equals(stage.type()))) {
            throw new IllegalArgumentException("The opportunity flow must contain at least one open stage.");
        }

        var ordered = new ArrayList<StageRow>();
        stagesByKey.values().stream().filter(stage -> !TERMINAL_KEYS.contains(stage.key())).forEach(ordered::add);
        ordered.add(stagesByKey.get("won"));
        ordered.add(stagesByKey.get("lost"));
        var result = new ArrayList<StageRow>();
        for (var index = 0; index < ordered.size(); index++) {
            var stage = ordered.get(index);
            result.add(new StageRow(
                    stage.key(), stage.label(), stage.type(), stage.colorToken(),
                    stage.defaultProbabilityPercent(), index));
        }
        return List.copyOf(result);
    }

    private StageRow requireStage(List<StageRow> stages, String key, String message) {
        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException("stage is required.");
        }
        return stages.stream().filter(stage -> stage.key().equals(key)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException(message));
    }

    private StageRow firstOpenStage(List<StageRow> stages) {
        return stages.stream().filter(stage -> "OPEN".equals(stage.type())).findFirst()
                .orElseThrow(() -> new IllegalStateException("The opportunity flow does not contain an open stage."));
    }

    private java.util.Optional<StageRow> terminalStage(List<StageRow> stages, String lifecycle) {
        if ("OPEN".equals(lifecycle)) {
            return java.util.Optional.empty();
        }
        return stages.stream().filter(stage -> lifecycle.equals(stage.type())).findFirst();
    }

    private String lifecycleForKey(String key) {
        return "won".equals(key) ? "WON" : "lost".equals(key) ? "LOST" : "OPEN";
    }

    private String cleanName(String value) {
        var name = value == null ? "" : value.trim().replaceAll("\\s+", " ");
        if (name.length() < 2 || name.length() > 100) {
            throw new IllegalArgumentException("Flow names must contain between 2 and 100 characters.");
        }
        return name;
    }

    private String cleanLabel(String value) {
        var label = value == null ? "" : value.trim().replaceAll("\\s+", " ");
        if (label.length() < 2 || label.length() > 80) {
            throw new IllegalArgumentException("Stage labels must contain between 2 and 80 characters.");
        }
        return label;
    }

    private String uniqueFlowKey(String name, List<FlowRow> flows) {
        var reserved = flows.stream().map(FlowRow::key).collect(java.util.stream.Collectors.toSet());
        var base = normalizeExistingKey(name);
        if (base.isBlank()) {
            base = "flow";
        }
        base = base.substring(0, Math.min(base.length(), 56));
        var candidate = base;
        var suffix = 2;
        while (reserved.contains(candidate)) {
            candidate = base + "_" + suffix++;
        }
        return candidate;
    }

    private String uniqueKey(String label, Set<String> reservedKeys) {
        var base = normalizeExistingKey(label);
        if (base.isBlank()) {
            base = "stage";
        }
        base = base.substring(0, Math.min(base.length(), 56));
        var candidate = base;
        var suffix = 2;
        while (reservedKeys.contains(candidate)) {
            candidate = base + "_" + suffix++;
        }
        return candidate;
    }

    private String normalizeExistingKey(String value) {
        var decomposed = Normalizer.normalize(value == null ? "" : value.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT);
        return NON_KEY_CHARACTER.matcher(decomposed).replaceAll("_").replaceAll("^_+|_+$", "");
    }

    private String normalizeColor(String value) {
        var color = value == null ? "SLATE" : value.trim().toUpperCase(Locale.ROOT);
        if (!COLOR_TOKENS.contains(color)) {
            throw new IllegalArgumentException("Unsupported stage color.");
        }
        return color;
    }

    private int defaultProbability(String key) {
        return DEFAULT_STAGES.stream()
                .filter(stage -> stage.key().equals(key))
                .map(StageRow::defaultProbabilityPercent)
                .findFirst()
                .orElse(50);
    }

    record MoveResult(String stageKey, String lifecycleStatus, int probabilityPercent) {
    }
}
