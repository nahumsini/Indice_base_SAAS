package com.indice.erp.pos.purchaseorder.kiosk;

import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.pos.purchaseorder.PurchaseOrderRepository;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Reconciles lifecycle and organizational scope when a provider is changed outside
 * the kiosk administration flow. The public JOIN intentionally fails closed; this
 * job also materializes that closure in the Engine so sessions and administration
 * state cannot remain deceptively ACTIVE.
 */
@Component
public class ProcurementSupplierPortalLifecycleReconciler {

    private static final Logger LOG = LoggerFactory.getLogger(
        ProcurementSupplierPortalLifecycleReconciler.class);
    private static final int BATCH_SIZE = 250;

    private final JdbcTemplate jdbcTemplate;
    private final PurchaseOrderRepository repository;
    private final KioskRegistryService registry;
    private final ProcurementSupplierPortalScopeReconciler reconciler;

    public ProcurementSupplierPortalLifecycleReconciler(
            JdbcTemplate jdbcTemplate,
            PurchaseOrderRepository repository,
            KioskRegistryService registry,
            ProcurementSupplierPortalScopeReconciler reconciler) {
        this.jdbcTemplate = jdbcTemplate;
        this.repository = repository;
        this.registry = registry;
        this.reconciler = reconciler;
    }

    @Scheduled(
        fixedDelayString = "${app.kiosk.procurement.supplier-lifecycle-reconcile-ms:60000}",
        initialDelayString = "${app.kiosk.procurement.supplier-lifecycle-initial-delay-ms:15000}")
    public void reconcile() {
        for (var candidate : candidates()) {
            try {
                reconcile(candidate);
            } catch (RuntimeException failure) {
                // Continue the bounded batch: one concurrently deleted definition
                // must not leave every other tenant waiting for the next interval.
                LOG.warn(
                    "Supplier portal lifecycle reconciliation failed for definition {}.",
                    candidate.definitionId(), failure);
            }
        }
    }

    private void reconcile(Candidate candidate) {
        var definition = registry.requireById(candidate.companyId(), candidate.definitionId());
        if (!candidate.accessPresent() || !candidate.providerOperational()) {
            var reason = candidate.accessPresent()
                ? "Supplier portal provider is inactive or deleted"
                : "Supplier portal access or provider no longer exists";
            reconciler.disableUnavailableProvider(
                definition, candidate.legacyReferenceId(), reason);
            return;
        }
        var access = repository.findSupplierPortalAccessByLegacyReference(
            candidate.companyId(), candidate.legacyReferenceId()).orElseThrow();
        if (access.unitId() == null || access.businessId() == null) {
            reconciler.disableIncomplete(definition, access);
            return;
        }
        if (!java.util.Objects.equals(definition.unitId(), access.unitId())
                || !java.util.Objects.equals(definition.businessId(), access.businessId())) {
            reconciler.synchronizeChangedScope(definition, access);
        }
    }

    private List<Candidate> candidates() {
        return jdbcTemplate.query("""
            SELECT definition.id AS definition_id,
                   definition.company_id,
                   definition.legacy_reference_id,
                   access.id IS NOT NULL AS access_present,
                   provider.id IS NOT NULL
                     AND provider.deleted_at IS NULL
                     AND UPPER(COALESCE(provider.status, 'INACTIVE')) = 'ACTIVE'
                     AS provider_operational
            FROM kiosk_definitions definition
            LEFT JOIN pos_supplier_portal_access access
              ON access.company_id = definition.company_id
             AND access.id = definition.legacy_reference_id
             AND access.deleted_at IS NULL
            LEFT JOIN finance_providers provider
              ON provider.company_id = access.company_id
             AND provider.id = access.provider_id
            WHERE definition.owner_module = 'PROCUREMENT'
              AND definition.kiosk_type = 'supplier_portal'
              AND definition.legacy_reference_id IS NOT NULL
              AND definition.status IN ('ACTIVE', 'DISABLED')
              AND (
                (
                  definition.status = 'ACTIVE'
                  AND (
                    access.id IS NULL
                    OR provider.id IS NULL
                    OR provider.deleted_at IS NOT NULL
                    OR UPPER(COALESCE(provider.status, 'INACTIVE')) <> 'ACTIVE'
                    OR provider.unit_id IS NULL
                    OR provider.business_id IS NULL
                  )
                )
                OR (
                  access.id IS NOT NULL
                  AND provider.id IS NOT NULL
                  AND provider.deleted_at IS NULL
                  AND UPPER(COALESCE(provider.status, 'INACTIVE')) = 'ACTIVE'
                  AND provider.unit_id IS NOT NULL
                  AND provider.business_id IS NOT NULL
                  AND (
                    NOT (definition.unit_id <=> provider.unit_id)
                    OR NOT (definition.business_id <=> provider.business_id)
                  )
                )
              )
            ORDER BY definition.id ASC
            LIMIT ?
            """, (rs, rowNum) -> new Candidate(
                rs.getLong("definition_id"),
                rs.getLong("company_id"),
                rs.getLong("legacy_reference_id"),
                rs.getBoolean("access_present"),
                rs.getBoolean("provider_operational")),
            BATCH_SIZE);
    }

    private record Candidate(
        long definitionId,
        long companyId,
        long legacyReferenceId,
        boolean accessPresent,
        boolean providerOperational
    ) {
    }
}
