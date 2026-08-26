package com.indice.erp.pos.restaurant;

import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.cashregister.CashRegisterService;
import com.indice.erp.pos.kiosk.PointOfSaleKioskCapabilities;
import com.indice.erp.pos.restaurant.RestaurantOrderDtos.AddItemRequest;
import com.indice.erp.pos.restaurant.RestaurantOrderDtos.CreateKioskRequest;
import com.indice.erp.pos.restaurant.RestaurantOrderDtos.ItemStatusRequest;
import com.indice.erp.pos.restaurant.RestaurantOrderDtos.OpenOrderRequest;
import com.indice.erp.pos.restaurant.RestaurantOrderDtos.RestaurantCheckoutOrder;
import com.indice.erp.pos.restaurant.RestaurantOrderDtos.TableLayoutRequest;
import com.indice.erp.pos.restaurant.RestaurantOrderDtos.UpdateKioskRequest;
import com.indice.erp.pos.restaurant.RestaurantOrderDtos.UpdateFloorPlanRequest;
import com.indice.erp.pos.shift.ShiftRecord;
import com.indice.erp.pos.shift.ShiftRepository;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RestaurantOrderService {

    private static final Set<String> TYPES = Set.of("waiter_station", "table_order_center", "kitchen_display");
    private static final Set<String> KITCHEN_TRANSITIONS = Set.of("ACKNOWLEDGED", "PREPARING", "READY", "SERVED");
    private static final Set<String> CROSS_SCOPE_ROLES = Set.of("root", "superadmin", "admin", "owner");
    private static final Set<String> FLOOR_PLAN_EDITOR_ROLES = Set.of(
        "root", "superadmin", "admin", "owner", "manager", "supervisor");
    private static final Set<String> FLOOR_PLAN_EDITOR_KIOSK_TYPES = Set.of(
        "waiter_station", "table_order_center");
    private final RestaurantOrderRepository repository;
    private final CashRegisterService cashRegisters;
    private final KioskRegistryService registry;
    private final BCryptPasswordEncoder passwordEncoder;
    private final ShiftRepository shifts;
    private final SecureRandom random = new SecureRandom();

    public RestaurantOrderService(
            RestaurantOrderRepository repository,
            CashRegisterService cashRegisters,
            KioskRegistryService registry,
            BCryptPasswordEncoder passwordEncoder,
            ShiftRepository shifts) {
        this.repository = repository;
        this.cashRegisters = cashRegisters;
        this.registry = registry;
        this.passwordEncoder = passwordEncoder;
        this.shifts = shifts;
    }

    public List<Map<String, Object>> listAdmin(PosContext context) {
        return repository.listAdmin(context.companyId());
    }

    public List<Map<String, Object>> listEcosystems(PosContext context) {
        return repository.listEcosystems(context.companyId());
    }

    public Map<String, Object> detail(PosContext context, KioskResolvedDefinition definition) {
        requireRestaurantDefinition(context.companyId(), definition);
        return repository.listAdmin(context.companyId()).stream()
            .filter(item -> ((Number) item.get("id")).longValue() == definition.id())
            .findFirst().orElseThrow(() -> new NoSuchElementException("Restaurant kiosk not found."));
    }

    @Transactional
    public Map<String, Object> createKiosk(PosContext context, String kioskType, CreateKioskRequest request) {
        requireType(kioskType);
        if (request.name() == null || request.name().trim().length() < 3) {
            throw new IllegalArgumentException("name must contain at least 3 characters.");
        }
        long ecosystemId;
        Long defaultAreaId = request.areaId();
        if (request.ecosystemId() == null) {
            if (request.cashRegisterId() == null) {
                throw new IllegalArgumentException("cashRegisterId is required for a new ecosystem.");
            }
            var register = cashRegisters.requireOperationalRegister(context, request.cashRegisterId());
            if (register.unitId() == null || register.businessId() == null) {
                throw PosApiException.conflict("Restaurant settlement register requires unit and business scope.");
            }
            var ecosystemCode = uniqueCode("REST", request.ecosystemName() == null ? request.name() : request.ecosystemName());
            ecosystemId = repository.insertEcosystem(
                context.companyId(), register.unitId(), register.businessId(), register.warehouseId(), register.id(),
                ecosystemCode, text(request.ecosystemName(), "Operación de restaurante"), "MXN", context.userId());
            defaultAreaId = repository.insertArea(
                context.companyId(), ecosystemId, "MAIN", text(request.areaName(), "Salón principal"));
            repository.insertTables(
                context.companyId(), ecosystemId, defaultAreaId,
                request.tableCount() == null ? 12 : request.tableCount());
        } else {
            ecosystemId = request.ecosystemId();
            repository.ecosystem(context.companyId(), ecosystemId)
                .orElseThrow(() -> new NoSuchElementException("Restaurant ecosystem not found."));
        }
        var ecosystem = repository.ecosystem(context.companyId(), ecosystemId).orElseThrow();
        var code = uniqueCode(typePrefix(kioskType), request.name());
        var token = token();
        var legacyId = repository.insertKiosk(
            context.companyId(), ecosystemId, kioskType, code, request.name().trim(),
            defaultAreaId, kitchenCode(request.kitchenStationCode()), hint(token), request.expiresAt(), context.userId());
        var definition = registry.registerLegacyDefinitionWithLocation(
            context.companyId(), PointOfSaleKioskCapabilities.OWNER_MODULE, kioskType, legacyId,
            code, request.name().trim(), "active",
            number(ecosystem.get("unitId")), number(ecosystem.get("businessId")),
            number(ecosystem.get("warehouseId")), request.expiresAt(), token, false,
            KioskAccessLevel.CONTROLLED, "pos-restaurant", "es-MX", context.userId());
        repository.event(context.companyId(), ecosystemId, null, null, definition.id(), null,
            context.userId(), "RESTAURANT_KIOSK_CREATED", null, "ACTIVE", null);
        return detail(context, definition);
    }

    @Transactional
    public Map<String, Object> update(
            PosContext context, KioskResolvedDefinition definition, UpdateKioskRequest request) {
        requireRestaurantDefinition(context.companyId(), definition);
        if (!repository.updateKiosk(
                context.companyId(), definition.legacyReferenceId(), request.name().trim(),
                request.expiresAt(), request.version(), context.userId())) {
            throw PosApiException.conflict("Restaurant kiosk changed; reload before saving again.");
        }
        var kiosk = kiosk(definition);
        var token = registry.recoverPublicToken(
            context.companyId(), PointOfSaleKioskCapabilities.OWNER_MODULE,
            definition.kioskType(), definition.legacyReferenceId());
        registry.registerLegacyDefinitionWithLocation(
            context.companyId(), PointOfSaleKioskCapabilities.OWNER_MODULE, definition.kioskType(),
            definition.legacyReferenceId(), String.valueOf(kiosk.get("code")), request.name().trim(),
            String.valueOf(kiosk.get("status")), number(kiosk.get("unitId")), number(kiosk.get("businessId")),
            number(kiosk.get("warehouseId")), request.expiresAt(), token, false,
            KioskAccessLevel.CONTROLLED, "pos-restaurant", "es-MX", context.userId());
        return detail(context, registry.requireById(context.companyId(), definition.id()));
    }

    @Transactional
    public Map<String, Object> transition(
            PosContext context, KioskResolvedDefinition definition, String status, String reason) {
        requireRestaurantDefinition(context.companyId(), definition);
        var normalized = status.toUpperCase(Locale.ROOT);
        if (!Set.of("ACTIVE", "DISABLED", "REVOKED").contains(normalized)) {
            throw new IllegalArgumentException("Unsupported restaurant kiosk status.");
        }
        var kiosk = kiosk(definition);
        if (!repository.transitionKiosk(
                context.companyId(), definition.legacyReferenceId(), normalized, context.userId())) {
            throw new NoSuchElementException("Restaurant kiosk not found.");
        }
        var token = registry.recoverPublicToken(
            context.companyId(), PointOfSaleKioskCapabilities.OWNER_MODULE,
            definition.kioskType(), definition.legacyReferenceId());
        registry.registerLegacyDefinitionWithLocation(
            context.companyId(), PointOfSaleKioskCapabilities.OWNER_MODULE, definition.kioskType(),
            definition.legacyReferenceId(), String.valueOf(kiosk.get("code")), String.valueOf(kiosk.get("name")),
            normalized, number(kiosk.get("unitId")), number(kiosk.get("businessId")),
            number(kiosk.get("warehouseId")), parseInstant(kiosk.get("expiresAt")), token, false,
            KioskAccessLevel.CONTROLLED, "pos-restaurant", "es-MX", context.userId());
        repository.event(context.companyId(), number(kiosk.get("ecosystemId")), null, null,
            definition.id(), null, context.userId(), "RESTAURANT_KIOSK_" + normalized,
            definition.status().name(), normalized, reason);
        return detail(context, registry.requireById(context.companyId(), definition.id()));
    }

    @Transactional
    public Map<String, Object> rotate(PosContext context, KioskResolvedDefinition definition) {
        requireRestaurantDefinition(context.companyId(), definition);
        var token = token();
        registry.replacePublicToken(
            context.companyId(), PointOfSaleKioskCapabilities.OWNER_MODULE,
            definition.kioskType(), definition.legacyReferenceId(), token, context.userId());
        repository.updateTokenHint(
            context.companyId(), definition.legacyReferenceId(), hint(token), context.userId());
        return access(context, definition);
    }

    public Map<String, Object> access(PosContext context, KioskResolvedDefinition definition) {
        requireRestaurantDefinition(context.companyId(), definition);
        var kiosk = kiosk(definition);
        var token = registry.recoverPublicToken(
            context.companyId(), PointOfSaleKioskCapabilities.OWNER_MODULE,
            definition.kioskType(), definition.legacyReferenceId());
        return Map.of(
            "kioskId", definition.id(), "name", kiosk.get("name"),
            "displayUrl", publicPath(definition.kioskType(), token), "publicTokenHint", hint(token));
    }

    public Map<String, Object> publicBootstrap(KioskResolvedDefinition definition) {
        var kiosk = kiosk(definition);
        return map(
            "kioskId", definition.id(), "kioskType", definition.kioskType(),
            "name", kiosk.get("name"), "ecosystemName", kiosk.get("ecosystemName"),
            "areaName", kiosk.get("areaName"), "status", definition.effectiveStatus(Instant.now()).name(),
            "authMethods", List.of("pin"), "sessionTimeoutSeconds", 28_800,
            "sourceRegisterOpen", shifts.hasOpenShift(
                definition.companyId(), number(kiosk.get("cashRegisterId"))));
    }

    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public Map<String, Object> identify(KioskResolvedDefinition definition, String pin) {
        if (pin == null || pin.isBlank()) throw new IllegalArgumentException("Credential validation failed.");
        var kiosk = kiosk(definition);
        for (var candidate : repository.pinCandidates(definition.companyId())) {
            var hash = String.valueOf(candidate.getOrDefault("secretHash", ""));
            if (!hash.isBlank() && passwordEncoder.matches(pin, hash) && canAccessScope(candidate, kiosk)) {
                var expires = Instant.now().plusSeconds(28_800);
                return map(
                    "engine_identity", Map.of("type", "EMPLOYEE", "id", candidate.get("userCompanyId")),
                    "user", map("id", candidate.get("userCompanyId"), "userId", candidate.get("userId"),
                        "name", candidate.get("fullName"), "code", candidate.get("userCode")),
                    "identification_token", token(), "expires_at", expires.toString());
            }
        }
        throw new IllegalArgumentException("Credential validation failed.");
    }

    public boolean canUseSession(KioskResolvedDefinition definition, long userCompanyId) {
        if (userCompanyId <= 0) return false;
        try {
            var kiosk = kiosk(definition);
            return repository.employeeScope(definition.companyId(), userCompanyId)
                .filter(scope -> canAccessScope(scope, kiosk))
                .isPresent();
        } catch (RuntimeException failure) {
            return false;
        }
    }

    public boolean canEditFloorPlan(KioskResolvedDefinition definition, long userCompanyId) {
        if (userCompanyId <= 0 || !FLOOR_PLAN_EDITOR_KIOSK_TYPES.contains(definition.kioskType())) return false;
        try {
            var kiosk = kiosk(definition);
            return repository.employeeScope(definition.companyId(), userCompanyId)
                .filter(scope -> canAccessScope(scope, kiosk))
                .map(scope -> String.valueOf(scope.getOrDefault("role", "")).trim().toLowerCase(Locale.ROOT))
                .filter(FLOOR_PLAN_EDITOR_ROLES::contains)
                .isPresent();
        } catch (RuntimeException failure) {
            return false;
        }
    }

    public Map<String, Object> workspace(KioskResolvedDefinition definition, long userCompanyId) {
        var kiosk = kiosk(definition);
        var companyId = definition.companyId();
        var ecosystemId = number(kiosk.get("ecosystemId"));
        var shiftId = shifts.findOperationalShiftId(
            companyId, number(kiosk.get("cashRegisterId"))).orElse(null);
        var result = new LinkedHashMap<String, Object>();
        result.putAll(publicBootstrap(definition));
        result.put("userCompanyId", userCompanyId);
        result.put("canEditFloorPlan", canEditFloorPlan(definition, userCompanyId));
        result.put("tables", repository.tables(
            companyId, ecosystemId, numberOrNull(kiosk.get("areaId")), shiftId));
        result.put("orders", shiftId == null ? List.of() : enrichedOrders(companyId, ecosystemId, shiftId));
        if ("waiter_station".equals(definition.kioskType())) {
            result.put("catalog", shiftId == null ? List.of() : repository.catalog(
                companyId, number(kiosk.get("warehouseId")), shiftId,
                String.valueOf(kiosk.get("currencyCode"))));
        }
        if ("kitchen_display".equals(definition.kioskType())) {
            result.put("kitchenItems", shiftId == null ? List.of() : repository.kitchenItems(
                companyId, ecosystemId, shiftId,
                String.valueOf(kiosk.getOrDefault("kitchenStationCode", "ALL"))));
        }
        return result;
    }

    @Transactional
    public Map<String, Object> updateFloorPlan(
            KioskResolvedDefinition definition, long userCompanyId, UpdateFloorPlanRequest request) {
        requireType(definition.kioskType(), "waiter_station", "table_order_center");
        if (!canEditFloorPlan(definition, userCompanyId)) {
            throw new SecurityException("Restaurant floor-plan editing is not allowed.");
        }
        if (request == null || request.tables() == null || request.tables().isEmpty()
                || request.tables().size() > 100) {
            throw new IllegalArgumentException("tables must contain between 1 and 100 entries.");
        }

        var kiosk = kiosk(definition);
        var companyId = definition.companyId();
        var ecosystemId = number(kiosk.get("ecosystemId"));
        var shiftId = shifts.findOperationalShiftId(
            companyId, number(kiosk.get("cashRegisterId"))).orElse(null);
        var currentTables = repository.tables(
            companyId, ecosystemId, numberOrNull(kiosk.get("areaId")), shiftId);
        if (currentTables.size() != request.tables().size()) {
            throw PosApiException.conflict("Restaurant tables changed; reload the floor plan.");
        }

        var currentById = new LinkedHashMap<Long, Map<String, Object>>();
        currentTables.forEach(table -> currentById.put(number(table.get("id")), table));
        var seenIds = new HashSet<Long>();
        var namesByArea = new LinkedHashMap<Long, Set<String>>();
        var placements = new java.util.ArrayList<FloorPlacement>();

        for (var table : request.tables()) {
            validateLayoutFields(table);
            if (!seenIds.add(table.tableId())) {
                throw new IllegalArgumentException("Each table may appear only once.");
            }
            var current = currentById.get(table.tableId());
            if (current == null) {
                throw new SecurityException("Restaurant table is outside this kiosk scope.");
            }
            if (table.version() == null || table.version() <= 0) {
                throw new IllegalArgumentException("version is required for every table.");
            }
            var areaId = number(current.get("areaId"));
            var normalizedName = table.name().trim().toLowerCase(Locale.ROOT);
            if (!namesByArea.computeIfAbsent(areaId, ignored -> new HashSet<>()).add(normalizedName)) {
                throw new IllegalArgumentException("Table names must be unique inside each area.");
            }
            var guestCount = numberOrNull(current.get("guestCount"));
            if (current.get("orderId") != null && guestCount != null && table.capacity() < guestCount) {
                throw new IllegalArgumentException("Capacity cannot be lower than the active guest count.");
            }
            placements.add(new FloorPlacement(
                table.tableId(), areaId, table.x(), table.y(), table.width(), table.height()));
        }
        if (!seenIds.equals(currentById.keySet())) {
            throw PosApiException.conflict("Restaurant tables changed; reload the floor plan.");
        }
        validateNoOverlap(placements);

        for (var table : request.tables()) {
            if (!repository.updateTableLayout(
                    companyId, ecosystemId, table.tableId(), table.name().trim(), table.capacity(),
                    table.shape().trim().toUpperCase(Locale.ROOT), table.x(), table.y(), table.width(),
                    table.height(), table.rotation(), table.version())) {
                throw PosApiException.conflict("Restaurant floor plan changed; reload before saving again.");
            }
        }
        repository.event(companyId, ecosystemId, null, null, definition.id(), userCompanyId, null,
            "RESTAURANT_FLOOR_PLAN_UPDATED", null, null,
            "Updated layout for " + request.tables().size() + " tables");
        return workspace(definition, userCompanyId);
    }

    @Transactional
    public Map<String, Object> openOrder(
            KioskResolvedDefinition definition, long userCompanyId, OpenOrderRequest request) {
        requireType(definition.kioskType(), "waiter_station", "table_order_center");
        if (request == null || request.tableId() == null) {
            throw new IllegalArgumentException("tableId is required.");
        }
        var kiosk = kiosk(definition);
        var shiftId = requireOpenSourceShift(definition.companyId(), kiosk);
        var guests = request.guestCount() == null ? 1 : request.guestCount();
        if (guests < 1 || guests > 1000) {
            throw new IllegalArgumentException("guestCount must be between 1 and 1000.");
        }
        var orderId = repository.openOrder(
            definition.companyId(), number(kiosk.get("ecosystemId")), request.tableId(), userCompanyId,
            "waiter_station".equals(definition.kioskType()) ? userCompanyId : null,
            definition.legacyReferenceId(), number(kiosk.get("cashRegisterId")),
            shiftId,
            "ORD-" + Instant.now().toEpochMilli() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase(Locale.ROOT),
            guests, String.valueOf(kiosk.get("currencyCode")), request.notes());
        repository.event(definition.companyId(), number(kiosk.get("ecosystemId")), orderId, null,
            definition.id(), userCompanyId, null, "RESTAURANT_ORDER_OPENED", null, "OPEN", null);
        return workspace(definition, userCompanyId);
    }

    @Transactional
    public Map<String, Object> addItem(
            KioskResolvedDefinition definition, long userCompanyId, AddItemRequest request) {
        requireType(definition.kioskType(), "waiter_station");
        if (request == null || request.orderId() == null || request.productId() == null) {
            throw new IllegalArgumentException("orderId and productId are required.");
        }
        if (request.quantity() == null || request.quantity().signum() <= 0
                || request.quantity().compareTo(java.math.BigDecimal.valueOf(1000)) > 0) {
            throw new IllegalArgumentException("quantity must be greater than zero.");
        }
        var guestNumber = request.guestNumber() == null ? 1 : request.guestNumber();
        if (guestNumber < 1 || guestNumber > 1000) {
            throw new IllegalArgumentException("guestNumber must be between 1 and 1000.");
        }
        var kiosk = kiosk(definition);
        var shiftId = requireOpenSourceShift(definition.companyId(), kiosk);
        attributeWaiter(definition, kiosk, shiftId, request.orderId(), userCompanyId);
        var itemId = repository.addItem(
            definition.companyId(), number(kiosk.get("ecosystemId")), number(kiosk.get("warehouseId")),
            String.valueOf(kiosk.get("currencyCode")), request.orderId(), shiftId,
            request.productId(), request.quantity(),
            guestNumber, request.notes(), request.modifierSummary(), request.kitchenStationCode());
        repository.event(definition.companyId(), number(kiosk.get("ecosystemId")), request.orderId(), itemId,
            definition.id(), userCompanyId, null, "RESTAURANT_ITEM_ADDED", null, "DRAFT", null);
        return workspace(definition, userCompanyId);
    }

    @Transactional
    public Map<String, Object> sendRound(
            KioskResolvedDefinition definition, long userCompanyId, long orderId) {
        requireType(definition.kioskType(), "waiter_station");
        var kiosk = kiosk(definition);
        var shiftId = requireOpenSourceShift(definition.companyId(), kiosk);
        attributeWaiter(definition, kiosk, shiftId, orderId, userCompanyId);
        var round = repository.sendRound(
            definition.companyId(), number(kiosk.get("ecosystemId")), orderId,
            shiftId, userCompanyId, definition.legacyReferenceId());
        repository.event(definition.companyId(), number(kiosk.get("ecosystemId")), orderId, null,
            definition.id(), userCompanyId, null, "RESTAURANT_ROUND_SENT", "DRAFT", "SENT", "Round " + round);
        return workspace(definition, userCompanyId);
    }

    @Transactional
    public Map<String, Object> updateItemStatus(
            KioskResolvedDefinition definition, long userCompanyId, ItemStatusRequest request) {
        if (request == null || request.status() == null || request.status().isBlank()) {
            throw new IllegalArgumentException("itemId or itemIds and status are required.");
        }
        var itemIds = statusItemIds(request);
        var to = request.status().trim().toUpperCase(Locale.ROOT);
        if (!KITCHEN_TRANSITIONS.contains(to)) throw new IllegalArgumentException("Unsupported item status.");
        requireItemTransitionAuthority(definition.kioskType(), to);
        var allowedFrom = switch (to) {
            case "ACKNOWLEDGED" -> "SENT";
            case "PREPARING" -> "SENT,ACKNOWLEDGED";
            case "READY" -> "ACKNOWLEDGED,PREPARING";
            case "SERVED" -> "READY";
            default -> "";
        };
        var kiosk = kiosk(definition);
        var ecosystemId = number(kiosk.get("ecosystemId"));
        var shiftId = requireOpenSourceShift(definition.companyId(), kiosk);
        for (var itemId : itemIds) {
            var orderId = repository.itemOrderId(definition.companyId(), ecosystemId, itemId);
            if ("waiter_station".equals(definition.kioskType())) {
                attributeWaiter(definition, kiosk, shiftId, orderId, userCompanyId);
            }
            if (!repository.updateItemStatus(
                    definition.companyId(), ecosystemId, shiftId, itemId, allowedFrom, to)) {
                throw PosApiException.conflict("Restaurant item status changed; refresh the workspace.");
            }
            repository.event(definition.companyId(), ecosystemId, orderId, itemId,
                definition.id(), userCompanyId, null, "RESTAURANT_ITEM_" + to, null, to, request.reason());
        }
        return workspace(definition, userCompanyId);
    }

    private void requireItemTransitionAuthority(String kioskType, String targetStatus) {
        var allowed = ("kitchen_display".equals(kioskType)
                && List.of("PREPARING", "READY").contains(targetStatus))
            || ("waiter_station".equals(kioskType) && "SERVED".equals(targetStatus));
        if (!allowed) throw new SecurityException("Item status transition is not available for this kiosk type.");
    }

    private List<Long> statusItemIds(ItemStatusRequest request) {
        var ids = new java.util.LinkedHashSet<Long>();
        if (request.itemId() != null) ids.add(request.itemId());
        if (request.itemIds() != null) ids.addAll(request.itemIds());
        if (ids.isEmpty() || ids.size() > 100 || ids.stream().anyMatch(id -> id == null || id <= 0)) {
            throw new IllegalArgumentException("itemId or itemIds must contain between 1 and 100 valid entries.");
        }
        return List.copyOf(ids);
    }

    @Transactional
    public Map<String, Object> requestCheck(
            KioskResolvedDefinition definition, long userCompanyId, long orderId) {
        requireType(definition.kioskType(), "waiter_station", "table_order_center");
        var kiosk = kiosk(definition);
        var shiftId = requireOpenSourceShift(definition.companyId(), kiosk);
        if ("waiter_station".equals(definition.kioskType())) {
            attributeWaiter(definition, kiosk, shiftId, orderId, userCompanyId);
        }
        if (!repository.requestCheck(
                definition.companyId(), number(kiosk.get("ecosystemId")), shiftId, orderId)) {
            throw PosApiException.conflict("Send every draft item before requesting the check.");
        }
        repository.event(definition.companyId(), number(kiosk.get("ecosystemId")), orderId, null,
            definition.id(), userCompanyId, null, "RESTAURANT_CHECK_REQUESTED",
            "IN_SERVICE", "READY_FOR_CHECKOUT", null);
        return workspace(definition, userCompanyId);
    }

    private void attributeWaiter(
            KioskResolvedDefinition definition, Map<String, Object> kiosk, long shiftId,
            long orderId, long userCompanyId) {
        if (!repository.attributeWaiter(
                definition.companyId(), number(kiosk.get("ecosystemId")), shiftId,
                orderId, userCompanyId)) {
            throw PosApiException.conflict("Restaurant order is no longer available for this waiter.");
        }
    }

    public Map<String, Object> ecosystemTrace(PosContext context, long ecosystemId) {
        var ecosystem = repository.ecosystem(context.companyId(), ecosystemId)
            .orElseThrow(() -> new NoSuchElementException("Restaurant ecosystem not found."));
        return Map.of(
            "ecosystem", ecosystem,
            "kiosks", repository.listAdmin(context.companyId()).stream()
                .filter(item -> number(((Map<?, ?>) item.get("assignment")).get("ecosystemId")) == ecosystemId).toList(),
            "orders", enrichedOrders(context.companyId(), ecosystemId),
            "events", repository.trace(context.companyId(), ecosystemId));
    }

    public List<Map<String, Object>> pendingCheckout(PosContext context, long registerId) {
        cashRegisters.requireOperationalRegister(context, registerId);
        var shift = requireOpenCheckoutShift(context, registerId);
        return repository.pendingCheckout(context.companyId(), registerId, shift.id(), context.userId());
    }

    @Transactional
    public Map<String, Object> claim(PosContext context, long orderId, long registerId) {
        cashRegisters.requireOperationalRegister(context, registerId);
        var shift = requireOpenCheckoutShift(context, registerId);
        if (!repository.claim(context.companyId(), orderId, registerId, shift.id(), context.userId())) {
            throw PosApiException.conflict("Restaurant order is no longer available for checkout.");
        }
        var claimed = requireClaimedForCheckout(context, orderId, registerId);
        repository.event(context.companyId(), repository.orderEcosystem(context.companyId(), orderId),
            orderId, null, null, null, context.userId(), "RESTAURANT_ORDER_CLAIMED",
            "READY_FOR_CHECKOUT", "CLAIMED_FOR_CHECKOUT", "Register " + registerId);
        return checkoutMap(claimed);
    }

    @Transactional
    public Map<String, Object> release(PosContext context, long orderId, long registerId) {
        cashRegisters.requireOperationalRegister(context, registerId);
        var shift = requireOpenCheckoutShift(context, registerId);
        if (!repository.release(context.companyId(), orderId, registerId, shift.id(), context.userId())) {
            throw PosApiException.conflict("Restaurant order is not claimed by this cashier and register.");
        }
        repository.event(context.companyId(), repository.orderEcosystem(context.companyId(), orderId),
            orderId, null, null, null, context.userId(), "RESTAURANT_ORDER_RELEASED",
            "CLAIMED_FOR_CHECKOUT", "READY_FOR_CHECKOUT", "Register " + registerId);
        return Map.of("released", true);
    }

    public RestaurantCheckoutOrder requireClaimedForCheckout(
            PosContext context, long orderId, long registerId) {
        var shift = requireOpenCheckoutShift(context, registerId);
        return repository.lockClaimed(
                context.companyId(), orderId, registerId, shift.id(), context.userId())
            .orElseThrow(() -> PosApiException.conflict(
                "Restaurant order is not claimed by this cashier and register."));
    }

    public void completeCheckout(PosContext context, long orderId, long registerId, long ticketId) {
        var shift = requireOpenCheckoutShift(context, registerId);
        var order = requireClaimedForCheckout(context, orderId, registerId);
        if (!repository.completeCheckout(
                context.companyId(), orderId, registerId, shift.id(), context.userId(), ticketId)) {
            throw PosApiException.conflict("Restaurant order could not be completed.");
        }
        var ecosystemId = repository.orderEcosystem(context.companyId(), orderId);
        repository.event(context.companyId(), ecosystemId, orderId, null, null, null,
            context.userId(), "RESTAURANT_ORDER_CHECKED_OUT", "CLAIMED_FOR_CHECKOUT", "CLOSED",
            "Ticket " + ticketId + " · " + order.orderNumber());
    }

    public boolean supports(String type) {
        return TYPES.contains(type);
    }

    private void validateLayoutFields(TableLayoutRequest table) {
        if (table == null || table.tableId() == null || table.name() == null
                || table.capacity() == null || table.shape() == null || table.x() == null
                || table.y() == null || table.width() == null || table.height() == null
                || table.rotation() == null) {
            throw new IllegalArgumentException("Every table requires identity, name, capacity, shape and layout.");
        }
        var name = table.name().trim();
        if (name.isEmpty() || name.length() > 160) {
            throw new IllegalArgumentException("Table name must contain between 1 and 160 characters.");
        }
        if (table.capacity() < 1 || table.capacity() > 100) {
            throw new IllegalArgumentException("Table capacity must be between 1 and 100.");
        }
        var shape = table.shape().trim().toUpperCase(Locale.ROOT);
        if (!Set.of("ROUND", "SQUARE", "RECTANGLE").contains(shape)) {
            throw new IllegalArgumentException("Unsupported restaurant table shape.");
        }
        var validDimensions = switch (shape) {
            case "ROUND", "SQUARE" -> table.width() == 3 && table.height() == 3 && table.rotation() == 0;
            case "RECTANGLE" -> (table.width() == 4 && table.height() == 2 && table.rotation() == 0)
                || (table.width() == 2 && table.height() == 4 && table.rotation() == 90);
            default -> false;
        };
        if (!validDimensions) {
            throw new IllegalArgumentException("Table dimensions do not match the selected shape.");
        }
        if (table.x() < 0 || table.y() < 0 || table.x() + table.width() > 12
                || table.y() + table.height() > 1000) {
            throw new IllegalArgumentException("Table position is outside the floor-plan grid.");
        }
    }

    private void validateNoOverlap(List<FloorPlacement> placements) {
        for (var index = 0; index < placements.size(); index++) {
            var left = placements.get(index);
            for (var candidate = index + 1; candidate < placements.size(); candidate++) {
                var right = placements.get(candidate);
                if (left.areaId() != right.areaId()) continue;
                var overlaps = left.x() < right.x() + right.width()
                    && left.x() + left.width() > right.x()
                    && left.y() < right.y() + right.height()
                    && left.y() + left.height() > right.y();
                if (overlaps) {
                    throw new IllegalArgumentException("Restaurant tables cannot overlap.");
                }
            }
        }
    }

    private boolean canAccessScope(Map<String, Object> employee, Map<String, Object> kiosk) {
        var role = String.valueOf(employee.getOrDefault("role", "")).trim().toLowerCase(Locale.ROOT);
        if (CROSS_SCOPE_ROLES.contains(role)) return true;
        var employeeUnitId = numberOrNull(employee.get("unitId"));
        var employeeBusinessId = numberOrNull(employee.get("businessId"));
        var kioskUnitId = numberOrNull(kiosk.get("unitId"));
        var kioskBusinessId = numberOrNull(kiosk.get("businessId"));
        if (employeeBusinessId != null) return employeeBusinessId.equals(kioskBusinessId);
        if (employeeUnitId != null) return employeeUnitId.equals(kioskUnitId);
        return true;
    }

    private long requireOpenSourceShift(long companyId, Map<String, Object> kiosk) {
        return shifts.findOperationalShiftId(companyId, number(kiosk.get("cashRegisterId")))
            .orElseThrow(() -> PosApiException.conflict("The restaurant settlement register is closed."));
    }

    private ShiftRecord requireOpenCheckoutShift(PosContext context, long registerId) {
        return shifts.findOpenByUserAndRegister(context, registerId)
            .orElseThrow(() -> PosApiException.conflict(
                "An open cashier shift is required for restaurant checkout."));
    }

    private List<Map<String, Object>> enrichedOrders(long companyId, long ecosystemId) {
        return enrichOrders(companyId, repository.orders(companyId, ecosystemId));
    }

    private List<Map<String, Object>> enrichedOrders(long companyId, long ecosystemId, long shiftId) {
        return enrichOrders(companyId, repository.ordersForShift(companyId, ecosystemId, shiftId));
    }

    private List<Map<String, Object>> enrichOrders(
            long companyId, List<Map<String, Object>> orders) {
        return orders.stream().map(order -> {
            var result = new LinkedHashMap<>(order);
            result.put("items", repository.items(companyId, number(order.get("id"))));
            return Map.copyOf(result);
        }).toList();
    }

    private Map<String, Object> checkoutMap(RestaurantCheckoutOrder order) {
        return map(
            "id", order.id(), "orderNumber", order.orderNumber(), "currencyCode", order.currencyCode(),
            "cashRegisterId", order.cashRegisterId(), "items", order.items().stream().map(item -> map(
                "productId", item.productId(), "sku", item.sku(), "name", item.name(),
                "quantity", item.quantity(), "unitPrice", item.unitPrice(), "lineTotal", item.lineTotal())).toList());
    }

    private record FloorPlacement(long tableId, long areaId, int x, int y, int width, int height) {
    }

    private Map<String, Object> kiosk(KioskResolvedDefinition definition) {
        requireRestaurantDefinition(definition.companyId(), definition);
        return repository.kiosk(definition.companyId(), definition.legacyReferenceId())
            .orElseThrow(() -> new NoSuchElementException("Restaurant kiosk not found."));
    }

    private void requireRestaurantDefinition(long companyId, KioskResolvedDefinition definition) {
        if (definition == null || definition.companyId() != companyId
                || !PointOfSaleKioskCapabilities.OWNER_MODULE.equals(definition.ownerModule())
                || definition.legacyReferenceId() == null || !supports(definition.kioskType())) {
            throw new NoSuchElementException("Restaurant kiosk not found.");
        }
    }

    private void requireType(String actual, String... allowed) {
        if (!List.of(allowed).contains(actual)) throw new SecurityException("Action is not available for this kiosk type.");
    }

    private void requireType(String type) {
        if (!supports(type)) throw new IllegalArgumentException("Unsupported restaurant kiosk type.");
    }

    private String publicPath(String type, String token) {
        return switch (type) {
            case "waiter_station" -> "/pos-restaurant/waiter/" + token;
            case "table_order_center" -> "/pos-restaurant/orders/" + token;
            case "kitchen_display" -> "/pos-restaurant/kitchen/" + token;
            default -> throw new IllegalArgumentException("Unsupported restaurant kiosk type.");
        };
    }

    private String uniqueCode(String prefix, String name) {
        var slug = name == null ? "KIOSK" : name.replaceAll("[^A-Za-z0-9]", "").toUpperCase(Locale.ROOT);
        if (slug.isBlank()) slug = "KIOSK";
        return prefix + "-" + slug.substring(0, Math.min(20, slug.length())) + "-" + Long.toString(System.nanoTime(), 36).toUpperCase(Locale.ROOT);
    }

    private String typePrefix(String type) {
        return switch (type) {
            case "waiter_station" -> "WTR";
            case "table_order_center" -> "CTR";
            case "kitchen_display" -> "KDS";
            default -> "RST";
        };
    }

    private String kitchenCode(String value) {
        return value == null || value.isBlank() ? "ALL" : value.trim().toUpperCase(Locale.ROOT);
    }

    private String token() {
        var bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hint(String token) {
        return token.substring(Math.max(0, token.length() - 8));
    }

    private String text(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private long number(Object value) {
        return value instanceof Number number ? number.longValue() : Long.parseLong(String.valueOf(value));
    }

    private Long numberOrNull(Object value) {
        return value == null ? null : number(value);
    }

    private Instant parseInstant(Object value) {
        return value == null ? null : Instant.parse(String.valueOf(value));
    }

    private Map<String, Object> map(Object... entries) {
        var result = new LinkedHashMap<String, Object>();
        for (var index = 0; index < entries.length; index += 2) {
            if (entries[index + 1] != null) result.put(String.valueOf(entries[index]), entries[index + 1]);
        }
        return result;
    }
}
