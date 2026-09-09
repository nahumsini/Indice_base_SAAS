package com.indice.erp.platformadmin;

import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class PlatformCatalogPublicationService {
    private final JdbcTemplate jdbc;
    private final PlatformCatalogStripeSynchronizationService synchronization;
    private final PlatformCatalogManagementService management;
    private final PlatformCatalogPublicationSnapshot snapshots;
    private final PlatformCatalogPublicationLock publicationLock;
    private final PlatformCatalogStripeVerificationService verification;

    public PlatformCatalogPublicationService(
        JdbcTemplate jdbc,
        PlatformCatalogStripeSynchronizationService synchronization,
        PlatformCatalogManagementService management,
        PlatformCatalogPublicationSnapshot snapshots,
        PlatformCatalogPublicationLock publicationLock,
        PlatformCatalogStripeVerificationService verification
    ) {
        this.jdbc = jdbc;
        this.synchronization = synchronization;
        this.management = management;
        this.snapshots = snapshots;
        this.publicationLock = publicationLock;
        this.verification = verification;
    }

    public PublicationResponse synchronizeAndPublish(long actorUserId, long versionId, PublicationRequest request) {
        if (request == null || request.target_mode() == null || request.target_mode().isBlank()) {
            throw new IllegalArgumentException("Confirma el modo de Stripe antes de publicar.");
        }
        var mode = synchronization.requirePublicationSynchronization(actorUserId, request.target_mode(), request.confirmation());
        return publicationLock.execute(() -> publish(actorUserId, versionId, request, mode));
    }

    private PublicationResponse publish(long actorUserId, long versionId, PublicationRequest request, String mode) {
        var versions = jdbc.query("SELECT version_code, status FROM billing_catalog_versions WHERE id = ?",
            (rs, rowNum) -> new Version(rs.getString(1), rs.getString(2)), versionId);
        if (versions.isEmpty()) throw new NoSuchElementException("Versión comercial no encontrada.");
        var version = versions.getFirst();
        // A response can be lost after commit. Retrying the same version does not create Stripe objects again.
        if ("ACTIVE".equals(version.status())) {
            if (!verification.verify(actorUserId, versionId).blockers().isEmpty()) {
                throw new IllegalStateException("La versión vigente no está verificada en la cuenta y modo de Stripe configurados.");
            }
            return response(versionId, version.code(), mode, 0);
        }
        if (!"DRAFT".equals(version.status())) {
            throw new IllegalStateException("Sólo se puede publicar la versión de trabajo vigente.");
        }
        var expected = snapshots.capture(versionId);
        var products = recurringProducts(versionId);
        if (products.isEmpty()) throw new IllegalStateException("La oferta no tiene productos disponibles para publicar.");
        // Validate every stored amount before the first remote write. No browser-supplied prices enter this flow.
        products.forEach(ProductPrices::requireValid);
        var synchronizedProducts = 0;
        for (var product : products) {
            snapshots.requireUnchanged(versionId, expected);
            synchronization.synchronize(actorUserId, product.id(),
                new PlatformCatalogStripeSynchronizationService.SynchronizeRequest(
                    product.monthly(), product.annual(), request.target_mode(), request.confirmation()));
            synchronizedProducts++;
        }
        snapshots.requireUnchanged(versionId, expected);
        // Remote verification happens before the short final transaction. The guard runs again with all
        // commercial mutation/version locks held, closing the edit-versus-publication race.
        management.publishUnchangedDraft(actorUserId, versionId, () -> snapshots.requireUnchanged(versionId, expected));
        return response(versionId, version.code(), mode, synchronizedProducts);
    }

    private List<ProductPrices> recurringProducts(long versionId) {
        return jdbc.query("""
            SELECT product.id,
                   MAX(CASE WHEN price.billing_interval = 'MONTH' THEN price.unit_amount_cents END),
                   MAX(CASE WHEN price.billing_interval = 'YEAR' THEN price.unit_amount_cents END),
                   COUNT(price.id)
            FROM billing_catalog_products product
            LEFT JOIN billing_catalog_prices price ON price.catalog_product_id = product.id
              AND price.currency = 'USD' AND price.billing_interval IN ('MONTH', 'YEAR')
            WHERE product.catalog_version_id = ? AND product.active = 1
              AND product.commercial_kind IN ('MODULE', 'PACKAGE', 'SEAT', 'VOLUME', 'STORAGE')
            GROUP BY product.id ORDER BY product.id
            """, (rs, rowNum) -> new ProductPrices(rs.getLong(1), rs.getObject(2, Long.class),
                rs.getObject(3, Long.class), rs.getInt(4)), versionId);
    }

    private PublicationResponse response(long versionId, String code, String mode, int count) {
        return new PublicationResponse(versionId, code, "ACTIVE", true, mode, count);
    }

    public record PublicationRequest(String target_mode, String confirmation) {
    }

    public record PublicationResponse(long catalog_version_id, String version_code, String status,
                                      boolean published, String stripe_mode, int synchronized_products) {
    }

    record Version(String code, String status) {
    }

    record ProductPrices(long id, Long monthly, Long annual, int priceCount) {
        void requireValid() {
            if (priceCount != 2 || monthly == null || annual == null || monthly <= 0 || annual <= 0
                || monthly > 100_000_000L || annual > 100_000_000L) {
                throw new IllegalStateException("Completa las tarifas mensual y anual en USD antes de publicar la oferta.");
            }
        }
    }
}
