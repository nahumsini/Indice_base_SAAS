package com.indice.erp.pos.customerdisplay;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosJsonSupport;
import com.indice.erp.pos.cashregister.CashRegisterRecord;
import com.indice.erp.pos.cashregister.CashRegisterRepository;
import com.indice.erp.pos.customerdisplay.dto.CustomerDisplayPairRequest;
import com.indice.erp.pos.customerdisplay.dto.CustomerDisplayPairResponse;
import com.indice.erp.pos.customerdisplay.dto.CustomerDisplayPairingCodeRequest;
import com.indice.erp.pos.customerdisplay.dto.CustomerDisplayPairingCodeResponse;
import com.indice.erp.pos.customerdisplay.dto.CustomerDisplayItemPayload;
import com.indice.erp.pos.customerdisplay.dto.CustomerDisplayPaymentPayload;
import com.indice.erp.pos.customerdisplay.dto.CustomerDisplaySnapshotRequest;
import com.indice.erp.pos.customerdisplay.dto.CustomerDisplayStateResponse;
import com.indice.erp.pos.shift.ShiftRepository;
import com.indice.erp.pos.status.ShiftStatus;
import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.pos.kiosk.PointOfSaleKioskCapabilities;
import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerDisplayService {

    private static final String PAIRING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int PAIRING_CODE_LENGTH = 6;
    private static final Set<String> SNAPSHOT_STATUSES = Set.of("IDLE", "ACTIVE", "READY_TO_PAY", "PAID", "CLOSED");
    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final CustomerDisplayRepository repository;
    private final CashRegisterRepository cashRegisterRepository;
    private final ShiftRepository shiftRepository;
    private final KioskRegistryService kioskRegistry;
    private final CustomerDisplaySecretCodec secrets;
    private final SecureRandom secureRandom = new SecureRandom();
    private final Clock clock;

    @Autowired
    public CustomerDisplayService(
            CustomerDisplayRepository repository,
            CashRegisterRepository cashRegisterRepository,
            ShiftRepository shiftRepository,
            KioskRegistryService kioskRegistry,
            CustomerDisplaySecretCodec secrets) {
        this(repository, cashRegisterRepository, shiftRepository, kioskRegistry, secrets, Clock.systemUTC());
    }

    CustomerDisplayService(
            CustomerDisplayRepository repository,
            CashRegisterRepository cashRegisterRepository,
            ShiftRepository shiftRepository,
            KioskRegistryService kioskRegistry,
            CustomerDisplaySecretCodec secrets,
            Clock clock) {
        this.repository = repository;
        this.cashRegisterRepository = cashRegisterRepository;
        this.shiftRepository = shiftRepository;
        this.kioskRegistry = kioskRegistry;
        this.secrets = secrets;
        this.clock = clock;
    }

    @Transactional
    public CustomerDisplayPairingCodeResponse createPairingCode(PosContext context, CustomerDisplayPairingCodeRequest request) {
        var register = cashRegisterRepository.findById(context, request.cashRegisterId())
            .orElseThrow(() -> PosApiException.notFound("Cash register not found."));
        if (!register.active()) {
            throw PosApiException.conflict("Customer display requires an active cash register.");
        }
        if (register.unitId() == null || register.businessId() == null) {
            throw PosApiException.badRequest(
                "Assign a business unit and business to the cash register before creating a kiosk.");
        }
        var pairingCode = generateUniquePairingCode();
        var expiresAt = clock.instant().plus(15, ChronoUnit.MINUTES);
        var name = displayName(request.deviceName(), register);
        var existing = repository.findLatestDeviceForRegister(context.companyId(), register.id());
        if (existing.isPresent()) {
            var engineStatus = engineStatus(existing.get());
            if (engineStatus == KioskDefinitionStatus.DISABLED) {
                throw PosApiException.conflict(
                    "Customer display is disabled. Enable it from kiosk administration.");
            }
            if (engineStatus == KioskDefinitionStatus.EXPIRED
                    || engineStatus == KioskDefinitionStatus.REVOKED
                    || engineStatus == KioskDefinitionStatus.DELETED) {
                repository.updateStatus(
                    context.companyId(), existing.get().id(), "INACTIVE", context.userId());
                existing = java.util.Optional.empty();
            }
        }
        var rawToken = existing
            .map(current -> secrets.reveal(current.deviceToken()))
            .orElseGet(this::generateUniqueToken);
        var device = existing
            .map(current -> repository.updatePairingCode(
                context.companyId(), current.id(), secrets.protect(pairingCode), secrets.pairingHash(pairingCode),
                expiresAt, name, context.userId()))
            .orElseGet(() -> repository.insertDevice(
                context.companyId(),
                register.unitId(),
                register.businessId(),
                register.warehouseId(),
                register.id(),
                secrets.protect(rawToken),
                secrets.hash(rawToken),
                secrets.hint(rawToken),
                secrets.protect(pairingCode),
                secrets.pairingHash(pairingCode),
                expiresAt,
                name,
                context.userId()
            ));
        synchronizeDefinition(device, rawToken, context.userId());
        return toPairingCodeResponse(device);
    }

    @Transactional
    public CustomerDisplayPairResponse pair(CustomerDisplayPairRequest request) {
        var code = normalizePairingCode(request.pairingCode());
        var device = repository.findPairableDeviceByCodeHashes(
                secrets.pairingHash(code), secrets.hash(code))
            .orElseThrow(() -> PosApiException.notFound("Pairing code expired or not found."));
        var rawToken = secrets.reveal(device.deviceToken());
        var paired = repository.activatePairing(device, displayName(request.deviceName(), device));
        return new CustomerDisplayPairResponse(
            rawToken,
            displayUrl(rawToken),
            paired.cashRegisterId(),
            paired.cashRegisterCode(),
            paired.cashRegisterName()
        );
    }

    @Transactional
    public CustomerDisplayStateResponse publishSnapshot(PosContext context, CustomerDisplaySnapshotRequest request) {
        var register = cashRegisterRepository.findById(context, request.cashRegisterId())
            .orElseThrow(() -> PosApiException.notFound("Cash register not found."));
        var shift = shiftRepository.findById(context, request.shiftId())
            .orElseThrow(() -> PosApiException.notFound("Shift not found."));
        if (!shift.cashRegisterId().equals(register.id())) {
            throw PosApiException.badRequest("Shift does not belong to this cash register.");
        }
        if (shift.status() != ShiftStatus.OPEN && shift.status() != ShiftStatus.CLOSING) {
            throw PosApiException.badRequest("Customer display can only publish an open shift.");
        }
        var status = normalizeSnapshotStatus(request.status());
        List<CustomerDisplayItemPayload> items = request.items() == null ? List.of() : request.items();
        List<CustomerDisplayPaymentPayload> payments = request.payments() == null ? List.of() : request.payments();
        var snapshot = new CustomerDisplaySnapshotRecord(
            null,
            context.companyId(),
            shift.unitId(),
            shift.businessId(),
            shift.warehouseId(),
            register.id(),
            shift.id(),
            status,
            normalizeCurrency(request.currencyCode()),
            items.stream()
                .map(item -> positive(item.quantity()).intValue())
                .reduce(0, Integer::sum),
            positive(request.subtotalAmount()),
            positive(request.discountAmount()),
            positive(request.taxAmount()),
            positive(request.totalAmount()),
            positive(request.paidAmount()),
            positive(request.changeAmount()),
            positive(request.balanceAmount()),
            trimToNull(request.ticketNumber()),
            trimToNull(request.customerMessage()),
            PosJsonSupport.toJson(items),
            PosJsonSupport.toJson(payments),
            null,
            null
        );
        repository.upsertSnapshot(snapshot, context.userId());
        var latest = repository.findLatestSnapshot(context.companyId(), register.id()).orElse(snapshot);
        return toStateResponse(null, register.code(), register.name(), latest, true);
    }

    @Transactional
    public CustomerDisplayStateResponse publicState(String deviceToken) {
        var token = normalizeToken(deviceToken);
        var device = repository.findActiveDeviceByTokenHash(secrets.hash(token))
            .orElseThrow(() -> PosApiException.notFound("Customer display not found."));
        repository.touchDeviceIfStale(device.id());
        return repository.findLatestSnapshot(device.companyId(), device.cashRegisterId())
            .map(snapshot -> toStateResponse(device, snapshot, true))
            .orElseGet(() -> emptyState(device));
    }

    public CustomerDisplayDeviceRecord requirePairableDevice(String pairingCode) {
        var normalized = normalizePairingCode(pairingCode);
        return repository.findPairableDeviceByCodeHashes(
                secrets.pairingHash(normalized), secrets.hash(normalized))
            .orElseThrow(() -> PosApiException.notFound("Pairing code expired or not found."));
    }

    public String publicTokenForPairingCode(String pairingCode) {
        var normalized = normalizePairingCode(pairingCode);
        var device = repository.findDeviceByCurrentOrConsumedPairingCodeHashes(
                secrets.pairingHash(normalized), secrets.hash(normalized))
            .orElseThrow(() -> PosApiException.notFound("Pairing code expired or not found."));
        return secrets.reveal(device.deviceToken());
    }

    public boolean pairingCodeBelongsToDefinition(String pairingCode, Long legacyReferenceId) {
        if (legacyReferenceId == null) {
            return false;
        }
        try {
            var normalized = normalizePairingCode(pairingCode);
            return repository.findDeviceByCurrentOrConsumedPairingCodeHashes(
                    secrets.pairingHash(normalized), secrets.hash(normalized))
                .map(device -> legacyReferenceId.equals(device.id()))
                .orElse(false);
        } catch (RuntimeException ignored) {
            return false;
        }
    }

    public Map<String, Object> publicBootstrap(String deviceToken) {
        var token = normalizeToken(deviceToken);
        var device = repository.findActiveDeviceByTokenHash(secrets.hash(token))
            .orElseThrow(() -> PosApiException.notFound("Customer display not found."));
        var result = new LinkedHashMap<String, Object>();
        result.put("kioskType", PointOfSaleKioskCapabilities.CUSTOMER_DISPLAY_TYPE);
        result.put("name", device.name());
        result.put("cashRegisterId", device.cashRegisterId());
        result.put("cashRegisterCode", device.cashRegisterCode());
        result.put("cashRegisterName", device.cashRegisterName());
        result.put("pollIntervalMs", 1000);
        result.put("onlineOnly", true);
        return Map.copyOf(result);
    }

    public boolean claimConnectionAudit(long deviceId) {
        return repository.claimConnectionAudit(deviceId);
    }

    public CustomerDisplayDeviceRecord requireActiveDevice(String deviceToken) {
        return repository.findActiveDeviceByTokenHash(secrets.hash(normalizeToken(deviceToken)))
            .orElseThrow(() -> PosApiException.notFound("Customer display not found."));
    }

    public List<Map<String, Object>> listAdmin(PosContext context) {
        var scope = context.scope();
        var unitId = scope.isCorporateOffice() ? null : scope.unitId();
        var businessId = scope.type() == com.indice.erp.pos.PosScope.Type.BUSINESS_OFFICE
            ? scope.businessId() : null;
        return repository.listDevices(context.companyId(), unitId, businessId).stream()
            .map(device -> adminView(context.companyId(), device))
            .toList();
    }

    public Map<String, Object> adminDetail(PosContext context, long kioskDefinitionId) {
        var definition = requireAdminDefinition(context, kioskDefinitionId);
        var device = repository.findDeviceById(context.companyId(), definition.legacyReferenceId())
            .orElseThrow(() -> PosApiException.notFound("Customer display not found."));
        return adminView(definition, device);
    }

    @Transactional
    public Map<String, Object> rename(
            PosContext context,
            long kioskDefinitionId,
            String requestedName) {
        var definition = requireAdminDefinition(context, kioskDefinitionId);
        if (definition.status().terminal() || definition.status() == KioskDefinitionStatus.EXPIRED) {
            throw PosApiException.conflict("Customer display can no longer be edited.");
        }
        var device = repository.findDeviceById(context.companyId(), definition.legacyReferenceId())
            .orElseThrow(() -> PosApiException.notFound("Customer display not found."));
        var name = trimToNull(requestedName);
        if (name == null || name.length() > 160) {
            throw PosApiException.badRequest("Customer display name is required and must not exceed 160 characters.");
        }
        repository.updateName(context.companyId(), device.id(), name, context.userId());
        var updated = repository.findDeviceById(context.companyId(), device.id()).orElseThrow();
        synchronizeDefinition(updated, secrets.reveal(updated.deviceToken()), context.userId());
        return adminView(context.companyId(), updated);
    }

    @Transactional
    public Map<String, Object> transition(
            PosContext context,
            long kioskDefinitionId,
            KioskDefinitionStatus target,
            String reason) {
        var definition = requireAdminDefinition(context, kioskDefinitionId);
        var transitioned = kioskRegistry.transitionById(
            context.companyId(), definition.id(), target, context.userId(), trimToNull(reason));
        repository.updateStatus(
            context.companyId(), definition.legacyReferenceId(),
            target == KioskDefinitionStatus.ACTIVE ? "ACTIVE" : "INACTIVE", context.userId());
        var device = repository.findDeviceById(context.companyId(), definition.legacyReferenceId())
            .orElseThrow(() -> PosApiException.notFound("Customer display not found."));
        return adminView(transitioned, device);
    }

    @Transactional
    public void delete(PosContext context, long kioskDefinitionId, String reason) {
        var definition = requireAdminDefinition(context, kioskDefinitionId);
        var effectiveStatus = definition.effectiveStatus(clock.instant());
        if (effectiveStatus != KioskDefinitionStatus.REVOKED
                && effectiveStatus != KioskDefinitionStatus.EXPIRED) {
            throw PosApiException.conflict(
                "Revoke or let the customer display expire before deleting it.");
        }
        kioskRegistry.deleteDefinition(
            context.companyId(), PointOfSaleKioskCapabilities.OWNER_MODULE,
            definition.legacyReferenceId(), context.userId(), trimToNull(reason));
        repository.delete(context.companyId(), definition.legacyReferenceId());
    }

    private Map<String, Object> adminView(long companyId, CustomerDisplayDeviceRecord device) {
        KioskResolvedDefinition definition;
        try {
            definition = kioskRegistry.requireByLegacyReference(
                companyId, PointOfSaleKioskCapabilities.OWNER_MODULE, device.id());
        } catch (java.util.NoSuchElementException missing) {
            synchronizeDefinition(device, secrets.reveal(device.deviceToken()), device.updatedByUserId() == null
                ? device.createdByUserId() : device.updatedByUserId());
            definition = kioskRegistry.requireByLegacyReference(
                companyId, PointOfSaleKioskCapabilities.OWNER_MODULE, device.id());
        }
        return adminView(definition, device);
    }

    private Map<String, Object> adminView(
            KioskResolvedDefinition definition,
            CustomerDisplayDeviceRecord device) {
        var result = new LinkedHashMap<String, Object>();
        result.put("id", definition.id());
        result.put("deviceId", device.id());
        result.put("kioskType", definition.kioskType());
        result.put("name", definition.name());
        result.put("code", definition.code());
        result.put("status", definition.effectiveStatus(clock.instant()).name());
        result.put("accessLevel", definition.accessLevel().name());
        result.put("unitId", definition.unitId());
        result.put("businessId", definition.businessId());
        result.put("cashRegisterId", device.cashRegisterId());
        result.put("cashRegisterCode", device.cashRegisterCode());
        result.put("cashRegisterName", device.cashRegisterName());
        result.put("publicTokenHint", definition.publicTokenHint());
        result.put("pairedAt", instant(device.pairedAt()));
        result.put("lastSeenAt", instant(device.lastSeenAt()));
        result.put("connected", device.lastSeenAt() != null
            && device.lastSeenAt().isAfter(clock.instant().minus(90, ChronoUnit.SECONDS)));
        result.put("configurationVersion", definition.configurationVersion());
        return java.util.Collections.unmodifiableMap(result);
    }

    private KioskResolvedDefinition requireAdminDefinition(
            PosContext context,
            long kioskDefinitionId) {
        var definition = kioskRegistry.requireById(context.companyId(), kioskDefinitionId);
        if (!PointOfSaleKioskCapabilities.OWNER_MODULE.equals(definition.ownerModule())
                || !PointOfSaleKioskCapabilities.CUSTOMER_DISPLAY_TYPE.equals(definition.kioskType())
                || definition.legacyReferenceId() == null
                || !visibleInScope(context, definition)) {
            throw PosApiException.notFound("Customer display not found.");
        }
        return definition;
    }

    private boolean visibleInScope(PosContext context, KioskResolvedDefinition definition) {
        var scope = context.scope();
        if (scope.isCorporateOffice()) {
            return true;
        }
        if (scope.unitId() != null && !scope.unitId().equals(definition.unitId())) {
            return false;
        }
        return scope.businessId() == null || scope.businessId().equals(definition.businessId());
    }

    private void synchronizeDefinition(
            CustomerDisplayDeviceRecord device,
            String rawToken,
            long actorId) {
        var definition = kioskRegistry.registerLegacyDefinition(
            device.companyId(),
            PointOfSaleKioskCapabilities.OWNER_MODULE,
            PointOfSaleKioskCapabilities.CUSTOMER_DISPLAY_TYPE,
            device.id(),
            "POS-DISPLAY-" + String.format("%08d", device.id()),
            device.name(),
            "ACTIVE".equals(device.status()) ? "active" : "inactive",
            device.unitId(),
            device.businessId(),
            null,
            rawToken,
            true,
            KioskAccessLevel.PUBLIC,
            "point-of-sale",
            "es-MX",
            actorId
        );
        kioskRegistry.synchronizeCapabilities(
            definition, PointOfSaleKioskCapabilities.customerDisplayDescriptors());
    }

    private KioskDefinitionStatus engineStatus(CustomerDisplayDeviceRecord device) {
        try {
            return kioskRegistry.requireByLegacyReference(
                device.companyId(), PointOfSaleKioskCapabilities.OWNER_MODULE, device.id())
                .effectiveStatus(clock.instant());
        } catch (java.util.NoSuchElementException missing) {
            return KioskDefinitionStatus.ACTIVE;
        }
    }

    private String instant(Instant value) {
        return value == null ? null : value.toString();
    }

    private CustomerDisplayStateResponse emptyState(CustomerDisplayDeviceRecord device) {
        return new CustomerDisplayStateResponse(
            null,
            device == null ? "Pantalla de cliente" : device.name(),
            device == null ? null : device.companyName(),
            device == null ? null : device.unitName(),
            device == null ? null : device.businessName(),
            device == null ? null : device.warehouseName(),
            device.cashRegisterId(),
            device.cashRegisterCode(),
            device.cashRegisterName(),
            "IDLE",
            "MXN",
            0,
            ZERO,
            ZERO,
            ZERO,
            ZERO,
            ZERO,
            ZERO,
            ZERO,
            null,
            "Caja lista",
            PosJsonSupport.toJsonNode("[]"),
            PosJsonSupport.toJsonNode("[]"),
            device.lastSeenAt(),
            true
        );
    }

    private CustomerDisplayStateResponse toStateResponse(
            CustomerDisplayDeviceRecord device,
            CustomerDisplaySnapshotRecord snapshot,
            boolean connected) {
        return new CustomerDisplayStateResponse(
            null,
            device.name(),
            device.companyName(),
            device.unitName(),
            device.businessName(),
            device.warehouseName(),
            device.cashRegisterId(),
            device.cashRegisterCode(),
            device.cashRegisterName(),
            snapshot.status(),
            snapshot.currencyCode(),
            snapshot.itemCount(),
            snapshot.subtotalAmount(),
            snapshot.discountAmount(),
            snapshot.taxAmount(),
            snapshot.totalAmount(),
            snapshot.paidAmount(),
            snapshot.changeAmount(),
            snapshot.balanceAmount(),
            snapshot.ticketNumber(),
            snapshot.customerMessage(),
            PosJsonSupport.toJsonNode(snapshot.itemsJson()),
            PosJsonSupport.toJsonNode(snapshot.paymentsJson()),
            snapshot.updatedAt(),
            connected
        );
    }

    private CustomerDisplayStateResponse toStateResponse(
            CustomerDisplayDeviceRecord device,
            String cashRegisterCode,
            String cashRegisterName,
            CustomerDisplaySnapshotRecord snapshot,
            boolean connected) {
        return new CustomerDisplayStateResponse(
            null,
            device == null ? "Pantalla de cliente" : device.name(),
            device == null ? null : device.companyName(),
            device == null ? null : device.unitName(),
            device == null ? null : device.businessName(),
            device == null ? null : device.warehouseName(),
            snapshot.cashRegisterId(),
            cashRegisterCode,
            cashRegisterName,
            snapshot.status(),
            snapshot.currencyCode(),
            snapshot.itemCount(),
            snapshot.subtotalAmount(),
            snapshot.discountAmount(),
            snapshot.taxAmount(),
            snapshot.totalAmount(),
            snapshot.paidAmount(),
            snapshot.changeAmount(),
            snapshot.balanceAmount(),
            snapshot.ticketNumber(),
            snapshot.customerMessage(),
            PosJsonSupport.toJsonNode(snapshot.itemsJson()),
            PosJsonSupport.toJsonNode(snapshot.paymentsJson()),
            snapshot.updatedAt(),
            connected
        );
    }

    private CustomerDisplayPairingCodeResponse toPairingCodeResponse(CustomerDisplayDeviceRecord device) {
        var rawToken = secrets.reveal(device.deviceToken());
        var rawPairingCode = secrets.reveal(device.pairingCode());
        return new CustomerDisplayPairingCodeResponse(
            device.id(),
            device.cashRegisterId(),
            device.cashRegisterCode(),
            device.cashRegisterName(),
            rawPairingCode,
            device.pairingCodeExpiresAt(),
            rawToken,
            displayUrl(rawToken),
            "/pos-display/pair?code=" + rawPairingCode
        );
    }

    private String generateUniquePairingCode() {
        for (int attempt = 0; attempt < 20; attempt++) {
            var code = new StringBuilder(PAIRING_CODE_LENGTH);
            for (int index = 0; index < PAIRING_CODE_LENGTH; index++) {
                code.append(PAIRING_ALPHABET.charAt(secureRandom.nextInt(PAIRING_ALPHABET.length())));
            }
            var value = code.toString();
            if (!repository.existsActivePairingCodeHashes(
                    secrets.pairingHash(value), secrets.hash(value))) {
                return value;
            }
        }
        throw PosApiException.conflict("Could not generate a pairing code.");
    }

    private String generateUniqueToken() {
        for (int attempt = 0; attempt < 20; attempt++) {
            var token = "posd_" + UUID.randomUUID().toString().replace("-", "");
            if (!repository.existsDeviceTokenHash(secrets.hash(token))) {
                return token;
            }
        }
        throw PosApiException.conflict("Could not generate a display token.");
    }

    private String displayName(String requestedName, CashRegisterRecord register) {
        var value = trimToNull(requestedName);
        return value == null ? "Pantalla cliente - " + register.code() : value;
    }

    private String displayName(String requestedName, CustomerDisplayDeviceRecord device) {
        var value = trimToNull(requestedName);
        return value == null ? device.name() : value;
    }

    private String normalizePairingCode(String value) {
        var normalized = trimToNull(value);
        if (normalized == null) {
            throw PosApiException.badRequest("Pairing code is required.");
        }
        return normalized.toUpperCase(Locale.ROOT).replace("-", "").replace(" ", "");
    }

    private String normalizeSnapshotStatus(String value) {
        var normalized = trimToNull(value);
        if (normalized == null) {
            throw PosApiException.badRequest("Display status is required.");
        }
        normalized = normalized.toUpperCase(Locale.ROOT);
        if (!SNAPSHOT_STATUSES.contains(normalized)) {
            throw PosApiException.badRequest("Invalid display status.");
        }
        return normalized;
    }

    private String normalizeCurrency(String value) {
        var normalized = trimToNull(value);
        if (normalized == null || normalized.length() != 3) {
            throw PosApiException.badRequest("Currency code is required.");
        }
        return normalized.toUpperCase(Locale.ROOT);
    }

    private String normalizeToken(String value) {
        var normalized = trimToNull(value);
        if (normalized == null) {
            throw PosApiException.badRequest("Display token is required.");
        }
        return normalized;
    }

    private BigDecimal positive(BigDecimal value) {
        if (value == null || value.signum() < 0) {
            return ZERO;
        }
        return value;
    }

    private String displayUrl(String token) {
        return "/pos-display/" + token;
    }

    private String trimToNull(String value) {
        var trimmed = value == null ? null : value.trim();
        return trimmed == null || trimmed.isBlank() ? null : trimmed;
    }
}
