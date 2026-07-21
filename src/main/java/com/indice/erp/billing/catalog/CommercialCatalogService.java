package com.indice.erp.billing.catalog;

import com.indice.erp.auth.AuthSessionResponse;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class CommercialCatalogService {

    private static final String ACTIVE_VERSION_SQL = """
        SELECT id, version_code
        FROM billing_catalog_versions
        WHERE status = 'ACTIVE'
          AND (effective_from IS NULL OR effective_from <= CURRENT_TIMESTAMP)
          AND (effective_to IS NULL OR effective_to > CURRENT_TIMESTAMP)
        ORDER BY effective_from DESC, id DESC
        LIMIT 1
        """;

    private final JdbcTemplate jdbcTemplate;

    public CommercialCatalogService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public CommercialCatalogSnapshot activeCatalog(AuthSessionResponse session) {
        var versions = jdbcTemplate.query(
            ACTIVE_VERSION_SQL,
            (rs, rowNum) -> new CatalogVersion(rs.getLong("id"), rs.getString("version_code"))
        );
        if (versions.isEmpty()) {
            throw new IllegalStateException("No active commercial catalog is configured.");
        }

        var version = versions.getFirst();
        var productRows = jdbcTemplate.query(
            """
                SELECT p.product_code, p.display_name, p.product_type, c.capability_code
                FROM billing_catalog_products p
                LEFT JOIN billing_product_capabilities c ON c.product_id = p.id
                WHERE p.catalog_version_id = ?
                  AND p.active = 1
                ORDER BY p.sort_order ASC, p.id ASC, c.capability_code ASC
                """,
            (rs, rowNum) -> new ProductCapabilityRow(
                rs.getString("product_code"),
                rs.getString("display_name"),
                rs.getString("product_type"),
                rs.getString("capability_code")
            ),
            version.id()
        );
        var aliases = jdbcTemplate.query(
            """
                SELECT alias_code, canonical_code
                FROM billing_capability_aliases
                WHERE catalog_version_id = ?
                ORDER BY alias_code ASC
                """,
            (rs, rowNum) -> Map.entry(rs.getString("alias_code"), rs.getString("canonical_code")),
            version.id()
        );

        var grouped = new LinkedHashMap<String, MutableProduct>();
        for (var row : productRows) {
            var product = grouped.computeIfAbsent(
                row.productCode(),
                ignored -> new MutableProduct(row.productCode(), row.displayName(), row.productType())
            );
            if (row.capabilityCode() != null && !row.capabilityCode().isBlank()) {
                product.capabilities().add(CommercialCapabilityNormalizer.normalize(row.capabilityCode()));
            }
        }
        var products = grouped.values().stream()
            .map(product -> new CommercialCatalogSnapshot.Product(
                product.code(),
                product.name(),
                product.type().toLowerCase(Locale.ROOT),
                List.copyOf(product.capabilities())
            ))
            .toList();
        var aliasMap = new LinkedHashMap<String, String>();
        aliases.forEach(entry -> aliasMap.put(entry.getKey(), entry.getValue()));

        var coreCapabilities = products.stream()
            .filter(product -> "core_platform".equals(product.code()))
            .findFirst()
            .map(CommercialCatalogSnapshot.Product::capabilities)
            .orElseGet(List::of);
        var effective = effectiveCapabilities(session, products, coreCapabilities);

        return new CommercialCatalogSnapshot(
            version.code(),
            "shadow",
            products,
            Map.copyOf(aliasMap),
            coreCapabilities,
            effective
        );
    }

    private List<String> effectiveCapabilities(
        AuthSessionResponse session,
        List<CommercialCatalogSnapshot.Product> products,
        List<String> coreCapabilities
    ) {
        var effective = new LinkedHashSet<>(coreCapabilities);
        var role = session.user().role() == null ? "" : session.user().role().trim().toLowerCase(Locale.ROOT);
        if (role.equals("root") || role.equals("superadmin")) {
            products.forEach(product -> effective.addAll(product.capabilities()));
        } else {
            session.user().module_slugs().stream()
                .map(CommercialCapabilityNormalizer::normalize)
                .filter(value -> !value.isBlank())
                .forEach(effective::add);
        }
        return new ArrayList<>(effective);
    }

    private record CatalogVersion(long id, String code) {
    }

    private record ProductCapabilityRow(
        String productCode,
        String displayName,
        String productType,
        String capabilityCode
    ) {
    }

    private record MutableProduct(
        String code,
        String name,
        String type,
        LinkedHashSet<String> capabilities
    ) {
        private MutableProduct(String code, String name, String type) {
            this(code, name, type, new LinkedHashSet<>());
        }
    }
}
