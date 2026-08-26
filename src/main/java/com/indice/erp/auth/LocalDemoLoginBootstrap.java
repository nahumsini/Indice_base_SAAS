package com.indice.erp.auth;

import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Profile("minio")
@ConditionalOnProperty(name = "app.local-demo-login.enabled", havingValue = "true")
public class LocalDemoLoginBootstrap {

    private static final Logger log = LoggerFactory.getLogger(LocalDemoLoginBootstrap.class);

    private final JdbcTemplate jdbcTemplate;
    private final BCryptPasswordEncoder passwordEncoder;
    private final String email;
    private final String companyName;
    private final String password;

    public LocalDemoLoginBootstrap(
        JdbcTemplate jdbcTemplate,
        BCryptPasswordEncoder passwordEncoder,
        @Value("${app.local-demo-login.email:demo@example.com}") String email,
        @Value("${app.local-demo-login.company-name:Empresa Demo Spring}") String companyName,
        @Value("${app.local-demo-login.password:}") String password
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
        this.email = email == null ? "" : email.trim().toLowerCase();
        this.companyName = companyName == null ? "" : companyName.trim();
        this.password = password == null ? "" : password;
    }

    @PostConstruct
    void restoreAndVerify() {
        if (email.isBlank() || companyName.isBlank() || password.isBlank()) {
            throw new IllegalStateException("Local demo login configuration is incomplete.");
        }

        var passwordHash = passwordEncoder.encode(password);
        var userIds = jdbcTemplate.query(
            "SELECT id FROM users WHERE LOWER(TRIM(email)) = ? ORDER BY id LIMIT 1",
            (resultSet, rowNumber) -> resultSet.getLong("id"),
            email
        );
        if (userIds.isEmpty()) {
            jdbcTemplate.update(
                """
                    INSERT INTO users (email, password_hash, full_name)
                    VALUES (?, ?, 'Usuario Demo')
                    """,
                email,
                passwordHash
            );
            userIds = jdbcTemplate.query(
                "SELECT id FROM users WHERE LOWER(TRIM(email)) = ? ORDER BY id LIMIT 1",
                (resultSet, rowNumber) -> resultSet.getLong("id"),
                email
            );
        } else {
            jdbcTemplate.update(
                """
                    UPDATE users
                    SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                passwordHash,
                userIds.getFirst()
            );
        }

        var companyIds = jdbcTemplate.query(
            "SELECT id FROM companies WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) ORDER BY id LIMIT 1",
            (resultSet, rowNumber) -> resultSet.getLong("id"),
            companyName
        );
        if (companyIds.isEmpty()) {
            jdbcTemplate.update(
                """
                    INSERT INTO companies (name, commercial_account_type, creation_origin)
                    VALUES (?, 'SUPER_ADMIN', 'WEB_SELF_SERVICE')
                    """,
                companyName
            );
            companyIds = jdbcTemplate.query(
                "SELECT id FROM companies WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) ORDER BY id LIMIT 1",
                (resultSet, rowNumber) -> resultSet.getLong("id"),
                companyName
            );
        }
        if (userIds.isEmpty() || companyIds.isEmpty()) {
            throw new IllegalStateException("The local demo account could not be restored.");
        }
        var userId = userIds.getFirst();
        var companyId = companyIds.getFirst();

        var updatedMemberships = jdbcTemplate.update(
            """
                UPDATE user_companies
                SET role = 'superadmin', status = 'active', visibility = 'all'
                WHERE user_id = ? AND company_id = ?
                """,
            userId,
            companyId
        );
        if (updatedMemberships == 0) {
            jdbcTemplate.update(
                """
                    INSERT INTO user_companies
                        (user_id, company_id, role, status, visibility)
                    VALUES (?, ?, 'superadmin', 'active', 'all')
                    """,
                userId,
                companyId
            );
        }

        var userCompanyIds = jdbcTemplate.query(
            """
                SELECT id
                FROM user_companies
                WHERE user_id = ? AND company_id = ?
                ORDER BY id DESC
                LIMIT 1
                """,
            (resultSet, rowNumber) -> resultSet.getLong("id"),
            userId,
            companyId
        );
        if (userCompanyIds.isEmpty()) {
            throw new IllegalStateException("The local demo membership could not be restored.");
        }
        var userCompanyId = userCompanyIds.getFirst();

        jdbcTemplate.update(
            """
                INSERT INTO platform_administrators
                    (user_id, platform_role, status, mfa_required, created_by_user_id)
                VALUES (?, 'PLATFORM_ROOT', 'ACTIVE', 0, ?)
                ON DUPLICATE KEY UPDATE
                    platform_role = VALUES(platform_role),
                    status = VALUES(status),
                    mfa_required = VALUES(mfa_required),
                    revoked_by_user_id = NULL,
                    revoked_at = NULL
                """,
            userId,
            userId
        );

        jdbcTemplate.update(
            """
                INSERT INTO company_module_entitlements
                    (company_id, module_slug, status, source)
                SELECT ?, module_row.slug, 'active', 'local_demo_bootstrap'
                FROM modules module_row
                WHERE COALESCE(module_row.is_active, 1) = 1
                  AND COALESCE(module_row.assignment_enabled, 1) = 1
                  AND LOWER(COALESCE(module_row.lifecycle_status, 'released')) IN ('pilot', 'released')
                ON DUPLICATE KEY UPDATE
                    status = VALUES(status),
                    source = VALUES(source)
                """,
            companyId
        );
        jdbcTemplate.update(
            """
                INSERT INTO user_company_module_roles
                    (user_company_id, module_slug, role, skill_level)
                SELECT ?, module_row.slug, 'admin', 100
                FROM modules module_row
                WHERE COALESCE(module_row.is_active, 1) = 1
                  AND COALESCE(module_row.assignment_enabled, 1) = 1
                  AND LOWER(COALESCE(module_row.lifecycle_status, 'released')) IN ('pilot', 'released')
                ON DUPLICATE KEY UPDATE
                    role = VALUES(role),
                    skill_level = VALUES(skill_level)
                """,
            userCompanyId
        );
        jdbcTemplate.update(
            """
                INSERT INTO company_subscription_plan_modules
                    (company_id, module_slug, source, status)
                SELECT ?, module_row.slug, 'local_demo_bootstrap', 'active'
                FROM modules module_row
                WHERE COALESCE(module_row.is_active, 1) = 1
                  AND COALESCE(module_row.assignment_enabled, 1) = 1
                  AND LOWER(COALESCE(module_row.lifecycle_status, 'released')) IN ('pilot', 'released')
                ON DUPLICATE KEY UPDATE
                    source = VALUES(source),
                    status = VALUES(status)
                """,
            companyId
        );

        seedPosKioskCatalog(companyId, userId);

        var storedHash = jdbcTemplate.queryForObject(
            "SELECT password_hash FROM users WHERE id = ?",
            String.class,
            userId
        );
        if (storedHash == null || !passwordEncoder.matches(password, normalizeBcryptHash(storedHash))) {
            throw new IllegalStateException("The local demo password could not be verified after restoration.");
        }

        log.info("Local demo login ready email={} company={}", email, companyName);
    }

    private void seedPosKioskCatalog(long companyId, long userId) {
        var warehouseId = ensurePosKioskWarehouse(companyId, userId);
        for (var product : POS_KIOSK_PRODUCTS) {
            jdbcTemplate.update(
                """
                    INSERT INTO sales_products
                        (company_id, product_code, sku, name, description, category, type,
                         price, cost, currency, tax_category, status, visibility,
                         inventory_ready, pos_ready, custom_fields_json, metadata_json,
                         created_by_user_id, updated_by_user_id, deleted_at)
                    VALUES
                        (?, ?, ?, ?, ?, ?, 'product', ?, ?, 'MXN', 'standard', 'active',
                         'commercial', 1, 1,
                         JSON_OBJECT('barcode', ?, 'brand', ?, 'presentation', ?, 'unit', 'PZA'),
                         JSON_OBJECT('seed', 'local-demo-pos-kiosk-v1',
                                     'initialStock', ?, 'minimumStock', ?,
                                     'illustrativePrices', TRUE,
                                     'imageUrl', ?,
                                     'imageAlt', ?,
                                     'gallery', JSON_EXTRACT(?, '$')),
                         ?, ?, NULL)
                    ON DUPLICATE KEY UPDATE
                        sku = VALUES(sku),
                        name = VALUES(name),
                        description = VALUES(description),
                        category = VALUES(category),
                        type = VALUES(type),
                        price = VALUES(price),
                        cost = VALUES(cost),
                        currency = VALUES(currency),
                        tax_category = VALUES(tax_category),
                        status = VALUES(status),
                        visibility = VALUES(visibility),
                        inventory_ready = VALUES(inventory_ready),
                        pos_ready = VALUES(pos_ready),
                        custom_fields_json = VALUES(custom_fields_json),
                        metadata_json = VALUES(metadata_json),
                        updated_by_user_id = VALUES(updated_by_user_id),
                        deleted_at = NULL
                    """,
                companyId,
                product.productCode(),
                product.sku(),
                product.name(),
                product.description(),
                product.category(),
                product.price(),
                product.cost(),
                product.barcode(),
                product.brand(),
                product.presentation(),
                product.initialStock(),
                product.minimumStock(),
                product.imageUrl(),
                product.imageAlt(),
                product.imageGalleryJson(),
                userId,
                userId
            );

            var productId = jdbcTemplate.queryForObject(
                "SELECT id FROM sales_products WHERE company_id = ? AND product_code = ?",
                Long.class,
                companyId,
                product.productCode()
            );
            if (productId == null) {
                throw new IllegalStateException("A local POS kiosk demo product could not be restored.");
            }
            jdbcTemplate.update(
                """
                    INSERT INTO sales_inventory_balances
                        (company_id, balance_code, product_id, warehouse_id, warehouse_name,
                         available_quantity, reserved_quantity, minimum_quantity, unit_cost,
                         uses_inventory, last_movement_at, metadata_json,
                         created_by_user_id, updated_by_user_id, deleted_at)
                    VALUES
                        (?, ?, ?, ?, 'Almacén POS y kiosco demo', ?, 0, ?, ?, 1,
                         CURRENT_DATE,
                         JSON_OBJECT('seed', 'local-demo-pos-kiosk-v1', 'barcode', ?),
                         ?, ?, NULL)
                    ON DUPLICATE KEY UPDATE
                        balance_code = VALUES(balance_code),
                        warehouse_name = VALUES(warehouse_name),
                        available_quantity = VALUES(available_quantity),
                        reserved_quantity = VALUES(reserved_quantity),
                        minimum_quantity = VALUES(minimum_quantity),
                        unit_cost = VALUES(unit_cost),
                        uses_inventory = VALUES(uses_inventory),
                        last_movement_at = VALUES(last_movement_at),
                        metadata_json = VALUES(metadata_json),
                        updated_by_user_id = VALUES(updated_by_user_id),
                        deleted_at = NULL
                    """,
                companyId,
                "DKSK-STK-" + product.sequence(),
                productId,
                warehouseId,
                product.initialStock(),
                product.minimumStock(),
                product.cost(),
                product.barcode(),
                userId,
                userId
            );
        }
        log.info("Local POS kiosk catalog ready company={} products={}", companyName, POS_KIOSK_PRODUCTS.size());
    }

    private long ensurePosKioskWarehouse(long companyId, long userId) {
        jdbcTemplate.update(
            """
                INSERT INTO sales_inventory_warehouses
                    (company_id, warehouse_code, name, type, jurisdiction,
                     responsible_user_id, responsible_name, address_note, status,
                     last_movement_at, metadata_json, created_by_user_id,
                     updated_by_user_id, deleted_at)
                VALUES
                    (?, 'DEMO-KIOSK-WH-001', 'Almacén POS y kiosco demo',
                     'businessWarehouse', 'Operación local', ?, 'Usuario Demo',
                     'Existencias de demostración para ventas y autocobro.', 'active',
                     CURRENT_DATE, JSON_OBJECT('seed', 'local-demo-pos-kiosk-v1'),
                     ?, ?, NULL)
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    type = VALUES(type),
                    jurisdiction = VALUES(jurisdiction),
                    responsible_user_id = VALUES(responsible_user_id),
                    responsible_name = VALUES(responsible_name),
                    address_note = VALUES(address_note),
                    status = VALUES(status),
                    last_movement_at = VALUES(last_movement_at),
                    metadata_json = VALUES(metadata_json),
                    updated_by_user_id = VALUES(updated_by_user_id),
                    deleted_at = NULL
                """,
            companyId,
            String.valueOf(userId),
            userId,
            userId
        );
        var warehouseId = jdbcTemplate.queryForObject(
            """
                SELECT id
                FROM sales_inventory_warehouses
                WHERE company_id = ? AND warehouse_code = 'DEMO-KIOSK-WH-001'
                """,
            Long.class,
            companyId
        );
        if (warehouseId == null) {
            throw new IllegalStateException("The local POS kiosk demo warehouse could not be restored.");
        }
        return warehouseId;
    }

    private String normalizeBcryptHash(String encodedPassword) {
        return encodedPassword.startsWith("$2y$")
            ? "$2a$" + encodedPassword.substring(4)
            : encodedPassword;
    }

    private record DemoProduct(
        String sequence,
        String productCode,
        String sku,
        String barcode,
        String name,
        String description,
        String category,
        String brand,
        String presentation,
        BigDecimal cost,
        BigDecimal price,
        BigDecimal initialStock,
        BigDecimal minimumStock
    ) {
        private DemoProduct(
            String sequence,
            String sku,
            String barcode,
            String name,
            String description,
            String category,
            String brand,
            String presentation,
            String cost,
            String price,
            String initialStock,
            String minimumStock
        ) {
            this(
                sequence,
                "DEMO-KIOSK-" + sequence,
                sku,
                barcode,
                name,
                description,
                category,
                brand,
                presentation,
                new BigDecimal(cost),
                new BigDecimal(price),
                new BigDecimal(initialStock),
                new BigDecimal(minimumStock)
            );
        }

        private String imageUrl() {
            return switch (sku) {
                case "KSK-AGUA-600" -> "/demo-products/water-600ml.jpg";
                case "KSK-GRANOLA-035" -> "/demo-products/granola-35g.jpg";
                default -> null;
            };
        }

        private String imageAlt() {
            return switch (sku) {
                case "KSK-AGUA-600" -> "Botella de agua natural de 600 ml";
                case "KSK-GRANOLA-035" -> "Barra de granola de 35 g";
                default -> null;
            };
        }

        private String imageGalleryJson() {
            return switch (sku) {
                case "KSK-AGUA-600" -> """
                    [
                      {
                        "id": "local-demo-water-primary",
                        "url": "/demo-products/water-600ml.jpg",
                        "alt": "Botella de agua natural de 600 ml"
                      },
                      {
                        "id": "local-demo-water-alternate",
                        "url": "/demo-products/water-600ml-alt.jpg",
                        "alt": "Vista alterna de botella de agua natural de 600 ml"
                      }
                    ]
                    """;
                case "KSK-GRANOLA-035" -> """
                    [
                      {
                        "id": "local-demo-granola-primary",
                        "url": "/demo-products/granola-35g.jpg",
                        "alt": "Barra de granola de 35 g"
                      }
                    ]
                    """;
                default -> "[]";
            };
        }
    }

    private static final List<DemoProduct> POS_KIOSK_PRODUCTS = List.of(
        new DemoProduct("001", "KSK-AGUA-600", "7501000000011", "Agua natural 600 ml", "Botella individual de agua purificada.", "Bebidas", "Índice Fresh", "600 ml", "7.00", "18.00", "80", "15"),
        new DemoProduct("002", "KSK-COLA-600", "7501000000028", "Refresco de cola 600 ml", "Refresco de cola en botella individual.", "Bebidas", "Índice Fresh", "600 ml", "15.00", "28.00", "60", "12"),
        new DemoProduct("003", "KSK-JUGO-NAR-500", "7501000000035", "Jugo de naranja 500 ml", "Jugo de naranja listo para beber.", "Bebidas", "Índice Fresh", "500 ml", "17.00", "32.00", "45", "10"),
        new DemoProduct("004", "KSK-CAFE-AMER-355", "7501000000042", "Café americano 355 ml", "Café americano preparado al momento.", "Bebidas", "Índice Café", "355 ml", "10.00", "35.00", "50", "10"),
        new DemoProduct("005", "KSK-PAPAS-045", "7501000000059", "Papas clásicas 45 g", "Papas fritas con sal en presentación individual.", "Snacks", "Índice Snacks", "45 g", "12.00", "25.00", "70", "14"),
        new DemoProduct("006", "KSK-GALLETAS-060", "7501000000066", "Galletas de chocolate 60 g", "Galletas con chispas de chocolate.", "Snacks", "Índice Snacks", "60 g", "10.00", "22.00", "55", "10"),
        new DemoProduct("007", "KSK-GRANOLA-035", "7501000000073", "Barra de granola 35 g", "Barra de avena, miel y frutos secos.", "Snacks", "Índice Natural", "35 g", "8.00", "18.00", "65", "12"),
        new DemoProduct("008", "KSK-SANDWICH-JQ", "7501000000080", "Sándwich de jamón y queso", "Sándwich fresco empacado individualmente.", "Alimentos", "Índice Fresh", "1 pieza", "34.00", "65.00", "30", "8"),
        new DemoProduct("009", "KSK-HELADO-VAI-120", "7501000000097", "Helado de vainilla 120 ml", "Vaso individual de helado de vainilla.", "Congelados", "Índice Fresh", "120 ml", "16.00", "38.00", "35", "8"),
        new DemoProduct("010", "KSK-CHOCOLATE-040", "7501000000103", "Chocolate con leche 40 g", "Barra individual de chocolate con leche.", "Snacks", "Índice Snacks", "40 g", "12.00", "24.00", "50", "10")
    );
}
