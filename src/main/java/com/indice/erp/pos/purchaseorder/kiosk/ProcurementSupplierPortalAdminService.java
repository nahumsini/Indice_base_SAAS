package com.indice.erp.pos.purchaseorder.kiosk;

import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskGrantService;
import com.indice.erp.kiosk.engine.KioskEngineFeatureFlags;
import com.indice.erp.kiosk.engine.KioskIdentityCredentialService;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalAccessListResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalAccessConfigurationRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalAccessPinRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalAccessRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalAccessResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalAccessStatusRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderRepository;
import com.indice.erp.pos.purchaseorder.PurchaseOrderService;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Optional;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProcurementSupplierPortalAdminService {

    private final PurchaseOrderService purchaseOrders;
    private final PurchaseOrderRepository repository;
    private final ProcurementSupplierPortalAdapter adapter;
    private final KioskRegistryService registry;
    private final KioskIdentityCredentialService credentials;
    private final KioskGrantService grants;
    private final ProcurementKioskModuleAuditService moduleAudit;
    private final BCryptPasswordEncoder passwordEncoder;
    private final KioskEngineFeatureFlags flags;

    public ProcurementSupplierPortalAdminService(
            PurchaseOrderService purchaseOrders,
            PurchaseOrderRepository repository,
            ProcurementSupplierPortalAdapter adapter,
            KioskRegistryService registry,
            KioskIdentityCredentialService credentials,
            KioskGrantService grants,
            ProcurementKioskModuleAuditService moduleAudit,
            BCryptPasswordEncoder passwordEncoder,
            KioskEngineFeatureFlags flags) {
        this.purchaseOrders = purchaseOrders;
        this.repository = repository;
        this.adapter = adapter;
        this.registry = registry;
        this.credentials = credentials;
        this.grants = grants;
        this.moduleAudit = moduleAudit;
        this.passwordEncoder = passwordEncoder;
        this.flags = flags;
    }

    public SupplierPortalAccessListResponse list(PosContext context) {
        return purchaseOrders.listSupplierPortalAccess(context);
    }

    @Transactional
    public SupplierPortalAccessResponse create(
            PosContext context,
            SupplierPortalAccessRequest request) {
        var legacyMode = !engineEnabled();
        var created = legacyMode
            ? purchaseOrders.createSupplierPortalAccessLegacy(context, request)
            : purchaseOrders.createSupplierPortalAccess(context, request);
        var access = access(created.portalCode());
        var unitId = access.unitId() != null ? access.unitId() : request.unitId();
        var businessId = access.businessId() != null ? access.businessId() : request.businessId();
        if (unitId == null || businessId == null) {
            throw new IllegalStateException(
                "Supplier portal requires both Business Unit and Business scope.");
        }
        var definition = registry.registerLegacyDefinition(
            access.companyId(),
            ProcurementSupplierPortalCapabilities.OWNER_MODULE,
            ProcurementSupplierPortalCapabilities.KIOSK_TYPE,
            access.id(),
            "SUPPLIER-PORTAL-" + access.id(),
            "Portal de " + access.providerName(),
            access.status(),
            unitId,
            businessId,
            access.expiresAt(),
            access.portalCode(),
            true,
            KioskAccessLevel.CONTROLLED,
            "procurement",
            "es-MX",
            context.userId()
        );
        registry.synchronizeCapabilities(definition, adapter.capabilities());
        var existingCredential = credentials.pinCredential(
            access.companyId(), "PROVIDER", access.providerId()).orElse(null);
        var reusePersonalPin = existingCredential != null
            && "ACTIVE".equalsIgnoreCase(existingCredential.status())
            && !"LEGACY_MIGRATION".equalsIgnoreCase(existingCredential.origin());
        String authoritativePinHash;
        if (!reusePersonalPin) {
            authoritativePinHash = passwordEncoder.encode(request.pin().trim());
            credentials.rotatePersonalPin(
                access.companyId(), "PROVIDER", access.providerId(),
                authoritativePinHash);
            moduleAudit.adminSuccess(
                access.companyId(), access.id(), context.userId(),
                "SUPPLIER_PERSONAL_PIN_CREATED",
                java.util.Map.of("provider_id", access.providerId(), "sessions_revoked", true));
        } else {
            authoritativePinHash = existingCredential.secretHash();
        }
        // Legacy public endpoints still compare the per-link BCrypt value while the
        // rollback flag is off. Keep every link aligned with the personal factor so
        // toggling the adapter cannot revive a stale candidate PIN.
        repository.updateSupplierPortalPinsForProvider(
            access.companyId(), access.providerId(), authoritativePinHash, context.userId());
        if (!definition.status().terminal()
                && definition.effectiveStatus(java.time.Instant.now()) != KioskDefinitionStatus.EXPIRED) {
            grants.grant(definition, "PROVIDER", access.providerId(), "*", context.userId());
        }
        if (reusePersonalPin) {
            moduleAudit.adminSuccess(
                access.companyId(), access.id(), context.userId(),
                "SUPPLIER_PERSONAL_PIN_REUSED",
                java.util.Map.of("provider_id", access.providerId()));
        }
        return new SupplierPortalAccessResponse(
            created.id(), created.providerId(), created.providerName(), created.providerEmail(),
            created.portalCode(), created.portalUrl(), created.status(), created.expiresAt(),
            created.createdAt(), created.updatedAt(), !reusePersonalPin);
    }

    @Transactional
    public SupplierPortalAccessResponse transition(
            PosContext context,
            long accessId,
            SupplierPortalAccessStatusRequest request,
            String reason) {
        var definition = definition(context, accessId);
        var target = target(request.status());
        var access = transitionDefinition(
            definition, context, context.userId(), accessId, target, reason);
        if (access.isEmpty()) {
            return orphanResponse(definition, accessId, target);
        }
        return purchaseOrders.listSupplierPortalAccess(context).items().stream()
            .filter(item -> Objects.equals(item.id(), accessId))
            .findFirst()
            .orElseGet(() -> response(access.orElseThrow(), target));
    }

    @Transactional
    public void transitionFromCenter(
            long companyId,
            long actorId,
            long accessId,
            KioskDefinitionStatus target,
            String reason) {
        transitionDefinition(
            definition(companyId, accessId), null, actorId, accessId, target, reason);
    }

    @Transactional
    public SupplierPortalAccessResponse rotatePin(
            PosContext context,
            long accessId,
            SupplierPortalAccessPinRequest request) {
        var definition = definition(context, accessId);
        if (definition.status().terminal()
                || definition.effectiveStatus(java.time.Instant.now()) == KioskDefinitionStatus.EXPIRED) {
            throw new IllegalStateException("A revoked or expired supplier portal cannot rotate its PIN.");
        }
        var response = purchaseOrders.changeSupplierPortalAccessPin(context, accessId, request);
        var authoritativePinHash = passwordEncoder.encode(request.pin().trim());
        credentials.rotatePersonalPin(
            context.companyId(), "PROVIDER", response.providerId(),
            authoritativePinHash);
        repository.updateSupplierPortalPinsForProvider(
            context.companyId(), response.providerId(), authoritativePinHash, context.userId());
        grants.revokeIdentity(definition, "PROVIDER", response.providerId(), context.userId());
        grants.grant(definition, "PROVIDER", response.providerId(), "*", context.userId());
        moduleAudit.adminSuccess(
            context.companyId(), accessId, context.userId(), "SUPPLIER_PERSONAL_PIN_ROTATED",
            java.util.Map.of("provider_id", response.providerId(), "sessions_revoked", true));
        return response;
    }

    @Transactional
    public SupplierPortalAccessResponse resetLink(PosContext context, long accessId) {
        var definition = definition(context, accessId);
        if (definition.status().terminal()) {
            throw new IllegalStateException("A revoked supplier portal cannot reset its link.");
        }
        var response = purchaseOrders.resetSupplierPortalAccessLink(context, accessId);
        registry.replacePublicToken(
            context.companyId(), ProcurementSupplierPortalCapabilities.OWNER_MODULE,
            accessId, response.portalCode(), context.userId());
        moduleAudit.adminSuccess(
            context.companyId(), accessId, context.userId(), "SUPPLIER_PORTAL_LINK_RESET",
            java.util.Map.of("sessions_revoked", true));
        return response;
    }

    @Transactional
    public KioskResolvedDefinition updateConfiguration(
            PosContext context,
            long accessId,
            SupplierPortalAccessConfigurationRequest request) {
        if (!engineEnabled()) {
            throw new IllegalStateException("Supplier portal Engine configuration is disabled.");
        }
        var current = definition(context, accessId);
        if (request.expiresAt() != null && !request.expiresAt().isAfter(java.time.Instant.now())) {
            throw new IllegalArgumentException("Supplier portal expiration must be in the future.");
        }
        if (current.status().terminal()
                || current.effectiveStatus(java.time.Instant.now()) == KioskDefinitionStatus.EXPIRED) {
            throw new IllegalStateException("A revoked or expired supplier portal cannot be edited.");
        }
        if (!repository.updateSupplierPortalAccessExpiration(
                context, accessId, request.expiresAt())) {
            throw new NoSuchElementException("Supplier portal access not found.");
        }
        var updated = registry.updateConfiguration(
            context.companyId(), ProcurementSupplierPortalCapabilities.OWNER_MODULE,
            accessId, request.name(), request.expiresAt(), context.userId());
        moduleAudit.adminSuccess(
            context.companyId(), accessId, context.userId(),
            "SUPPLIER_PORTAL_CONFIGURATION_UPDATED",
            java.util.Map.of(
                "name", updated.name(),
                "expires_at", updated.expiresAt() == null ? "" : updated.expiresAt().toString()));
        return updated;
    }

    @Transactional
    public void delete(PosContext context, long accessId, String reason) {
        var definition = definition(context, accessId);
        var access = repository.findSupplierPortalAccessForAdministration(
            context.companyId(), accessId);
        access.ifPresent(item -> requireScope(context, item.unitId(), item.businessId()));
        var effectiveStatus = definition.effectiveStatus(java.time.Instant.now());
        if (effectiveStatus != KioskDefinitionStatus.REVOKED
                && effectiveStatus != KioskDefinitionStatus.EXPIRED) {
            throw new IllegalStateException(
                "Only a revoked or expired supplier portal can be permanently deleted.");
        }
        var providerId = access.map(PurchaseOrderRepository.SupplierPortalAccessRecord::providerId)
            .orElseGet(() -> grantedProviderId(definition).orElse(null));
        var evidence = new java.util.LinkedHashMap<String, Object>();
        evidence.put("terminal_status", effectiveStatus.name());
        evidence.put("reason", reason == null ? "" : reason.trim());
        evidence.put("provider_id", providerId == null ? "" : providerId);
        evidence.put("kiosk_definition_id", definition.id());
        moduleAudit.adminSuccess(
            context.companyId(), accessId, context.userId(), "SUPPLIER_PORTAL_DELETED", evidence);
        access.ifPresent(item -> repository.snapshotSupplierPortalSubmissions(
            context.companyId(), accessId, item.providerId(), item.unitId(), item.businessId()));
        registry.deleteDefinition(
            context.companyId(), ProcurementSupplierPortalCapabilities.OWNER_MODULE,
            accessId, context.userId(), reason);
        if (access.isPresent()) {
            purchaseOrders.deleteSupplierPortalAccess(context, accessId);
        }
        if (providerId != null) {
            credentials.revokeIfUnreferenced(
                context.companyId(), "PROVIDER", providerId,
                grants.hasActiveIdentityGrant(context.companyId(), "PROVIDER", providerId));
        }
    }

    public KioskResolvedDefinition definition(long companyId, long accessId) {
        return registry.requireByLegacyReference(
            companyId, ProcurementSupplierPortalCapabilities.OWNER_MODULE, accessId);
    }

    /**
     * Resolves an administrative supplier portal inside the caller's immutable
     * Engine scope snapshot. Deliberately returns the same not-found result for a
     * missing portal and for a portal outside the caller's Unit/Business scope so
     * contextual v1/v2 routes cannot disclose cross-business metadata or secrets.
     *
     * <p>The company-only overload above is reserved for trusted system/Center
     * lifecycle orchestration, which has no interactive organizational scope.</p>
     */
    public KioskResolvedDefinition definition(PosContext context, long accessId) {
        if (context == null || context.companyId() == null || context.scope() == null
                || context.scope().type() == null) {
            throw supplierPortalNotFound();
        }
        KioskResolvedDefinition definition;
        try {
            definition = definition(context.companyId(), accessId);
        } catch (NoSuchElementException unavailable) {
            throw supplierPortalNotFound();
        }
        if (!Objects.equals(context.companyId(), definition.companyId())
                || !ProcurementSupplierPortalCapabilities.KIOSK_TYPE.equals(definition.kioskType())
                || !scopeAllows(context, definition.unitId(), definition.businessId())) {
            throw supplierPortalNotFound();
        }
        return definition;
    }

    @Transactional
    public java.util.Map<String, Object> grant(
            PosContext context,
            long accessId,
            String identityType,
            long identityId,
            String capabilityKey) {
        if (!engineEnabled()) {
            throw new IllegalStateException("Supplier portal Engine grants are disabled.");
        }
        var definition = definition(context, accessId);
        var access = repository.findSupplierPortalAccessByLegacyReference(
            context.companyId(), accessId)
            .orElseThrow(() -> new NoSuchElementException("Supplier portal access not found."));
        requireScope(context, access.unitId(), access.businessId());
        if (!"PROVIDER".equalsIgnoreCase(identityType) || identityId != access.providerId()) {
            throw new IllegalArgumentException(
                "A supplier portal can only grant its configured provider identity.");
        }
        return grants.grant(definition, "PROVIDER", identityId, capabilityKey, context.userId());
    }

    @Transactional
    public void revokeGrant(PosContext context, long accessId, long grantId) {
        if (!engineEnabled()) {
            throw new IllegalStateException("Supplier portal Engine grants are disabled.");
        }
        grants.revoke(definition(context, accessId), grantId, context.userId());
    }

    private PurchaseOrderRepository.SupplierPortalAccessRecord access(String portalCode) {
        return repository.findSupplierPortalAccessByCode(portalCode)
            .orElseThrow(() -> new NoSuchElementException("Supplier portal access not found."));
    }

    private Optional<PurchaseOrderRepository.SupplierPortalAccessRecord> transitionDefinition(
            KioskResolvedDefinition initialDefinition,
            PosContext context,
            long actorId,
            long accessId,
            KioskDefinitionStatus target,
            String reason) {
        var definition = initialDefinition;
        var companyId = definition.companyId();
        var access = (target == KioskDefinitionStatus.ACTIVE
            ? repository.findSupplierPortalAccessByLegacyReference(companyId, accessId)
            : repository.findSupplierPortalAccessForAdministration(companyId, accessId))
            .orElse(null);
        if (context != null && access != null) {
            requireScope(context, access.unitId(), access.businessId());
        }
        if (target == KioskDefinitionStatus.ACTIVE) {
            if (access == null) {
                throw new IllegalStateException(
                    "A supplier portal without an active provider cannot be enabled.");
            }
            var unitId = access.unitId() != null ? access.unitId() : definition.unitId();
            var businessId = access.businessId() != null ? access.businessId() : definition.businessId();
            if (unitId == null || businessId == null) {
                throw new IllegalStateException(
                    "Supplier portal requires both Business Unit and Business scope.");
            }
            registry.synchronizeScopeSnapshot(definition, unitId, businessId);
            definition = definition(companyId, accessId);
        }
        var effective = definition.effectiveStatus(java.time.Instant.now());
        if (effective == KioskDefinitionStatus.EXPIRED && target == KioskDefinitionStatus.ACTIVE) {
            throw new IllegalStateException("An expired supplier portal cannot be enabled.");
        }
        if (access != null && !repository.updateSupplierPortalAccessStatusFromEngine(
                companyId, accessId, legacyStatus(target), actorId)) {
            throw new NoSuchElementException("Supplier portal access not found.");
        }
        KioskResolvedDefinition transitioned = definition;
        if (effective != target) {
            transitioned = registry.transition(
                companyId, ProcurementSupplierPortalCapabilities.OWNER_MODULE,
                accessId, target, actorId, reason);
        }
        if (target == KioskDefinitionStatus.ACTIVE) {
            grants.grant(transitioned, "PROVIDER", access.providerId(), "*", actorId);
        } else if (target == KioskDefinitionStatus.REVOKED) {
            if (access != null) {
                grants.revokeIdentity(transitioned, "PROVIDER", access.providerId(), actorId);
            } else {
                revokeActiveGrants(transitioned, actorId);
            }
        }
        return Optional.ofNullable(access);
    }

    private void revokeActiveGrants(KioskResolvedDefinition definition, long actorId) {
        grants.list(definition).stream()
            .filter(item -> "ACTIVE".equalsIgnoreCase(String.valueOf(item.get("status"))))
            .map(item -> item.get("id"))
            .filter(Number.class::isInstance)
            .map(Number.class::cast)
            .mapToLong(Number::longValue)
            .forEach(grantId -> grants.revoke(definition, grantId, actorId));
    }

    private Optional<Long> grantedProviderId(KioskResolvedDefinition definition) {
        return grants.list(definition).stream()
            .filter(item -> "PROVIDER".equalsIgnoreCase(String.valueOf(item.get("identity_type"))))
            .map(item -> item.get("identity_id"))
            .filter(Number.class::isInstance)
            .map(Number.class::cast)
            .map(Number::longValue)
            .findFirst();
    }

    private SupplierPortalAccessResponse response(
            PurchaseOrderRepository.SupplierPortalAccessRecord access,
            KioskDefinitionStatus status) {
        return new SupplierPortalAccessResponse(
            access.id(), access.providerId(), access.providerName(), access.providerEmail(),
            access.portalCode(), "/supplier-portal/" + access.portalCode(), legacyStatus(status),
            access.expiresAt(), null, null, false);
    }

    private SupplierPortalAccessResponse orphanResponse(
            KioskResolvedDefinition definition,
            long accessId,
            KioskDefinitionStatus status) {
        return new SupplierPortalAccessResponse(
            accessId, grantedProviderId(definition).orElse(null), null, null,
            null, null, legacyStatus(status), definition.expiresAt(), null, null, false);
    }

    private KioskDefinitionStatus target(String value) {
        var normalized = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "ACTIVE" -> KioskDefinitionStatus.ACTIVE;
            case "DISABLED", "PAUSED" -> KioskDefinitionStatus.DISABLED;
            case "REVOKED" -> KioskDefinitionStatus.REVOKED;
            default -> throw new IllegalArgumentException("Supplier portal lifecycle status is invalid.");
        };
    }

    private String legacyStatus(KioskDefinitionStatus status) {
        return status == KioskDefinitionStatus.DISABLED ? "PAUSED" : status.name();
    }

    private boolean scopeAllows(PosContext context, Long unitId, Long businessId) {
        return switch (context.scope().type()) {
            case CORPORATE_OFFICE -> true;
            case UNIT_HEADQUARTERS -> Objects.equals(context.scope().unitId(), unitId);
            case BUSINESS_OFFICE -> Objects.equals(context.scope().unitId(), unitId)
                && Objects.equals(context.scope().businessId(), businessId);
        };
    }

    private void requireScope(PosContext context, Long unitId, Long businessId) {
        if (!scopeAllows(context, unitId, businessId)) {
            throw supplierPortalNotFound();
        }
    }

    private NoSuchElementException supplierPortalNotFound() {
        return new NoSuchElementException("Supplier portal kiosk not found.");
    }

    private boolean engineEnabled() {
        return flags.registryEnabled() && flags.sessionsEnabled() && flags.auditEnabled()
            && flags.adapterEnabled(ProcurementSupplierPortalCapabilities.OWNER_MODULE);
    }
}
