package com.indice.erp.hr.attendance.kiosk;

import com.indice.erp.hr.attendance.models.LocationRow;
import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import java.security.SecureRandom;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static com.indice.erp.hr.shared.HrPayloadUtils.isBlank;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseLong;
import static com.indice.erp.hr.shared.HrPayloadUtils.stringValue;


@Service
public class AttendanceKioskDeviceService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final AttendanceKioskDeviceRepository kioskDeviceRepository;
    private final AttendanceKioskDeviceWriter kioskDeviceWriter;
    private final AttendanceKioskPinThrottleService pinThrottleService;
    private final AttendanceKioskDeviceMapper kioskDeviceMapper;
    private final AttendanceKioskDeviceValidator validator;
    private final KioskRegistryService kioskRegistry;

    public AttendanceKioskDeviceService(
        AttendanceKioskDeviceRepository kioskDeviceRepository,
        AttendanceKioskDeviceWriter kioskDeviceWriter,
        AttendanceKioskPinThrottleService pinThrottleService,
        AttendanceKioskDeviceMapper kioskDeviceMapper,
        AttendanceKioskDeviceValidator validator,
        KioskRegistryService kioskRegistry
    ) {
        this.kioskDeviceRepository = kioskDeviceRepository;
        this.kioskDeviceWriter = kioskDeviceWriter;
        this.pinThrottleService = pinThrottleService;
        this.kioskDeviceMapper = kioskDeviceMapper;
        this.validator = validator;
        this.kioskRegistry = kioskRegistry;
    }

    public Map<String, Object> listDevices(long companyId) {
        return Map.of("items", kioskDeviceRepository.list(companyId).stream().map(this::toEngineMap).toList());
    }

    public Map<String, Object> listDevices(long companyId, HrOperationalScope scope) {
        return Map.of("items", kioskDeviceRepository.list(companyId, scope).stream()
            .map(this::toEngineMap).toList());
    }

    @Transactional
    public void deleteDevice(long companyId, long kioskDeviceId) {
        deleteDevice(companyId, 0L, kioskDeviceId);
    }

    @Transactional
    public void deleteDevice(long companyId, long actorId, long kioskDeviceId) {
        var device = kioskDeviceRepository.get(companyId, kioskDeviceId);
        try {
            kioskRegistry.requireByLegacyReference(
                companyId, AttendanceKioskCapabilities.OWNER_MODULE, kioskDeviceId);
        } catch (NoSuchElementException ignored) {
            synchronizeDefinition(device, actorId);
        }
        kioskRegistry.deleteDefinition(
            companyId, AttendanceKioskCapabilities.OWNER_MODULE, kioskDeviceId,
            actorId, "Attendance kiosk deleted from HR Control"
        );
        kioskDeviceWriter.delete(companyId, kioskDeviceId);
    }

    @Transactional
    public Map<String, Object> saveDevice(long companyId, long userId, Long kioskDeviceId, Map<String, Object> payload) {
        payload = payload == null ? Map.of() : payload;
        var code = stringValue(payload, "code");
        var name = stringValue(payload, "name", "nombre");
        if (code.isBlank() || name.isBlank()) {
            throw new IllegalArgumentException("code and name are required.");
        }

        var status = normalizeManagedStatus(stringValue(payload, "status"));
        var unitId = normalizeOptionalForeignKey(parseLong(payload, "unit_id"));
        var businessId = normalizeOptionalForeignKey(parseLong(payload, "business_id"));
        var locationId = normalizeOptionalForeignKey(parseLong(payload, "location_id"));
        var kioskLocation = locationId == null ? null : validator.loadLocation(companyId, locationId);
        var metadata = new LinkedHashMap<String, Object>();
        metadata.putAll(kioskDeviceMapper.parseJsonMap(kioskDeviceMapper.toJson(payload.get("metadata"))));
        var kioskType = AttendanceKioskType.normalize(metadata.get(AttendanceKioskType.METADATA_KEY));
        if (kioskType == null) {
            kioskType = AttendanceKioskType.infer(kioskLocation);
        }
        metadata.put(AttendanceKioskType.METADATA_KEY, kioskType);

        var scope = resolveScope(companyId, kioskType, kioskLocation, unitId, businessId, locationId);
        validator.ensureUniqueKioskCode(companyId, kioskDeviceId, code);
        var metadataJson = kioskDeviceMapper.toJson(metadata);
        var publicAccessToken = generateUniquePublicAccessToken();
        if (kioskDeviceId != null && kioskDeviceId > 0) {
            var existingKioskDevice = kioskDeviceRepository.get(companyId, kioskDeviceId);
            publicAccessToken = existingKioskDevice.publicAccessToken();
            metadataJson = kioskDeviceMapper.mergeInternalMetadata(metadataJson, existingKioskDevice.metadataJson());
        }

        var savedId = kioskDeviceId == null || kioskDeviceId <= 0
            ? kioskDeviceWriter.insert(companyId, userId, code, name, status, scope, publicAccessToken, metadataJson)
            : kioskDeviceWriter.update(companyId, kioskDeviceId, code, name, status, scope, publicAccessToken, metadataJson);
        var saved = kioskDeviceRepository.get(companyId, savedId);
        synchronizeDefinition(saved, userId);
        return Map.of("kiosk_device", toEngineMap(saved));
    }

    @Transactional
    public Map<String, Object> rotatePublicAccessToken(long companyId, long kioskDeviceId) {
        return rotatePublicAccessToken(companyId, 0L, kioskDeviceId);
    }

    @Transactional
    public Map<String, Object> rotatePublicAccessToken(long companyId, long actorId, long kioskDeviceId) {
        var existingKioskDevice = kioskDeviceRepository.get(companyId, kioskDeviceId);
        pinThrottleService.clearFailures(existingKioskDevice);
        var nextToken = generateUniquePublicAccessToken();
        kioskDeviceWriter.rotatePublicAccessToken(companyId, kioskDeviceId, nextToken);
        var kioskDevice = kioskDeviceRepository.get(companyId, kioskDeviceId);
        synchronizeDefinition(kioskDevice, actorId);
        kioskRegistry.replacePublicToken(
            companyId, AttendanceKioskCapabilities.OWNER_MODULE, kioskDeviceId, nextToken, actorId
        );
        return Map.of("kiosk_device", toEngineMap(kioskDeviceRepository.get(companyId, kioskDeviceId)));
    }

    @Transactional
    public Map<String, Object> transitionDevice(
            long companyId,
            long actorId,
            long kioskDeviceId,
            KioskDefinitionStatus target,
            String reason) {
        var device = kioskDeviceRepository.get(companyId, kioskDeviceId);
        synchronizeDefinition(device, actorId);
        var definition = kioskRegistry.transition(
            companyId, AttendanceKioskCapabilities.OWNER_MODULE, kioskDeviceId,
            target, actorId, reason
        );
        kioskDeviceWriter.updateStatus(
            companyId, kioskDeviceId,
            target == KioskDefinitionStatus.ACTIVE ? "active" : "inactive"
        );
        return Map.of("kiosk_device", toEngineMap(
            kioskDeviceRepository.get(companyId, kioskDeviceId), definition));
    }

    private KioskResolvedDefinition synchronizeDefinition(KioskDeviceRow device, long actorId) {
        var kioskType = AttendanceKioskType.normalize(
            kioskDeviceMapper.parseJsonMap(device.metadataJson()).get(AttendanceKioskType.METADATA_KEY));
        if (kioskType == null) {
            kioskType = AttendanceKioskType.infer(
                device.locationId() == null ? null : validator.loadLocation(device.companyId(), device.locationId()));
        }
        var definition = kioskRegistry.registerLegacyDefinitionWithLocation(
            device.companyId(), AttendanceKioskCapabilities.OWNER_MODULE, kioskType,
            device.id(), device.code(), device.name(), device.status(),
            device.unitId(), device.businessId(), device.locationId(), null,
            device.publicAccessToken(), true, KioskAccessLevel.CONTROLLED,
            "human-resources", "es-MX", actorId
        );
        kioskRegistry.synchronizeCapabilities(definition, AttendanceKioskCapabilities.descriptors());
        return definition;
    }

    private Map<String, Object> toEngineMap(KioskDeviceRow device) {
        try {
            return toEngineMap(device, kioskRegistry.requireByLegacyReference(
                device.companyId(), AttendanceKioskCapabilities.OWNER_MODULE, device.id()));
        } catch (java.util.NoSuchElementException ignored) {
            return kioskDeviceMapper.toMap(device);
        }
    }

    private Map<String, Object> toEngineMap(KioskDeviceRow device, KioskResolvedDefinition definition) {
        var item = new LinkedHashMap<>(kioskDeviceMapper.toMap(device));
        item.put("kiosk_definition_id", definition.id());
        item.put("engine_status", definition.status().name());
        item.put("configuration_version", definition.configurationVersion());
        item.put("public_token_hint", definition.publicTokenHint());
        return item;
    }

    private KioskDeviceScope resolveScope(
        long companyId,
        String kioskType,
        LocationRow kioskLocation,
        Long unitId,
        Long businessId,
        Long locationId
    ) {
        if (AttendanceKioskType.OPEN_ATTENDANCE.equals(kioskType)) {
            return new KioskDeviceScope(null, null, null);
        }

        if (AttendanceKioskType.BUSINESS_UNIT.equals(kioskType)) {
            if (kioskLocation != null) {
                AttendanceKioskType.validateLocationPurpose(kioskType, kioskLocation);
                unitId = kioskLocation.unitId();
                businessId = kioskLocation.businessId();
            }
            validator.validateOperationalScope(companyId, unitId, businessId, null);
            validator.ensureBusinessUnitKioskScopeHasLocations(companyId, unitId, businessId);
            return new KioskDeviceScope(unitId, businessId, null);
        }
        AttendanceKioskType.validateLocationPurpose(kioskType, kioskLocation);
        validator.validateOperationalScope(companyId, kioskLocation.unitId(), kioskLocation.businessId(), locationId);
        return new KioskDeviceScope(kioskLocation.unitId(), kioskLocation.businessId(), locationId);
    }

    private String generateUniquePublicAccessToken() {
        while (true) {
            var nextToken = UUID.randomUUID().toString().replace("-", "")
                + Long.toHexString(Math.abs(SECURE_RANDOM.nextLong()));
            if (!kioskDeviceWriter.publicAccessTokenExists(nextToken)) {
                return nextToken;
            }
        }
    }

    private Long normalizeOptionalForeignKey(Long value) {
        return value == null || value <= 0 ? null : value;
    }

    private String normalizeManagedStatus(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "", "active", "activo" -> "active";
            case "inactive", "inactivo", "disabled" -> "inactive";
            default -> throw new IllegalArgumentException("Unsupported status.");
        };
    }

}
