package com.indice.erp.sales.publiccatalog;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SalesPublicCatalogRepositoryTest {

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void resolvesTheCurrentCompanyLogoBeforeTheLegacyCompanyColumn() {
        var jdbcTemplate = mock(JdbcTemplate.class);
        var repository = new SalesPublicCatalogRepository(jdbcTemplate);
        when(jdbcTemplate.query(any(String.class), any(RowMapper.class), any(Object[].class)))
            .thenReturn(List.of());

        repository.list(7L);

        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).query(sql.capture(), any(RowMapper.class), any(Object[].class));
        assertThat(sql.getValue())
            .contains("$.config_center.empresa_template.logo")
            .contains("company.logo_url")
            .contains("LEFT JOIN company_settings ON company_settings.company_id = catalog.company_id");
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void resolvesInventoryOnlyFromActiveWarehousesInTheCatalogScope() {
        var jdbcTemplate = mock(JdbcTemplate.class);
        var repository = new SalesPublicCatalogRepository(jdbcTemplate);
        when(jdbcTemplate.query(any(String.class), any(RowMapper.class), any(Object[].class)))
            .thenReturn(List.of());

        repository.publicItems(catalog());

        var sql = ArgumentCaptor.forClass(String.class);
        var arguments = ArgumentCaptor.forClass(Object[].class);
        verify(jdbcTemplate).query(sql.capture(), any(RowMapper.class), arguments.capture());
        assertThat(sql.getValue())
            .contains("JOIN sales_inventory_warehouses warehouse")
            .contains("warehouse.deleted_at IS NULL")
            .contains("TRIM(warehouse.business_unit_id) = CAST(? AS CHAR)")
            .contains("TRIM(warehouse.business_id) = CAST(? AS CHAR)")
            .contains("IN ('commercial', 'pos_ready', 'quote_only')")
            .doesNotContain("<> 'operational_item'")
            .contains("product.price IS NOT NULL AND product.price > 0");
        assertThat(arguments.getValue()).containsExactly(11L, 12L, 7L, 17L, 7L);
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void validatesSelectedProductsWithTheSameCommercialReadinessContract() {
        var jdbcTemplate = mock(JdbcTemplate.class);
        var repository = new SalesPublicCatalogRepository(jdbcTemplate);
        when(jdbcTemplate.queryForObject(any(String.class), any(Class.class), any(Object[].class)))
            .thenReturn(1L);

        assertThat(repository.productsArePublishable(7L, List.of(91L))).isTrue();

        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).queryForObject(sql.capture(), any(Class.class), any(Object[].class));
        assertThat(sql.getValue())
            .contains("LOWER(TRIM(status)) = 'active'")
            .contains("IN ('commercial', 'pos_ready', 'quote_only')")
            .doesNotContain("<> 'operational_item'")
            .contains("price IS NOT NULL AND price > 0");
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void replacesLargeCatalogSelectionsWithOneTenantScopedBatch() {
        var jdbcTemplate = mock(JdbcTemplate.class);
        var repository = new SalesPublicCatalogRepository(jdbcTemplate);
        var productIds = List.of(91L, 92L, 93L);

        repository.replaceProducts(7L, 17L, productIds);

        var deleteSql = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).update(deleteSql.capture(), eq(17L), eq(7L));
        assertThat(deleteSql.getValue()).contains("catalog_id = ? AND company_id = ?");

        var insertSql = ArgumentCaptor.forClass(String.class);
        var batch = ArgumentCaptor.forClass(List.class);
        verify(jdbcTemplate).batchUpdate(insertSql.capture(), batch.capture());
        assertThat(insertSql.getValue()).contains("INSERT INTO sales_public_catalog_products");
        assertThat(batch.getValue()).hasSize(3);
        assertThat((Object[]) batch.getValue().get(2)).containsExactly(17L, 7L, 93L, 2);
    }

    @Test
    void adminSelectionDropsDeletedOrNoLongerPublishableProducts() {
        var jdbcTemplate = mock(JdbcTemplate.class);
        var repository = new SalesPublicCatalogRepository(jdbcTemplate);
        when(jdbcTemplate.queryForList(any(String.class), any(Class.class), any(Object[].class)))
            .thenReturn(List.of(91L));

        assertThat(repository.productIds(7L, 17L)).containsExactly(91L);

        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).queryForList(sql.capture(), any(Class.class), any(Object[].class));
        assertThat(sql.getValue())
            .contains("JOIN sales_products product")
            .contains("product.deleted_at IS NULL")
            .contains("LOWER(TRIM(product.status)) = 'active'")
            .contains("IN ('commercial', 'pos_ready', 'quote_only')")
            .doesNotContain("<> 'operational_item'")
            .contains("product.price IS NOT NULL AND product.price > 0");
    }

    @Test
    void preservesCustomCategoryLabelsAndFallsBackOnlyWhenTheyAreBlank() {
        assertThat(SalesPublicCatalogRepository.publicCategory("  Alojamientos en Cancún  "))
                .isEqualTo("Alojamientos en Cancún");
        assertThat(SalesPublicCatalogRepository.publicCategory("CRM B2B"))
                .isEqualTo("CRM B2B");
        assertThat(SalesPublicCatalogRepository.publicCategory("  ")).isEqualTo("Other");
        assertThat(SalesPublicCatalogRepository.publicCategory(null)).isEqualTo("Other");
    }

    @Test
    void mapsDatabaseProductTypesToTheFrontendContract() {
        assertThat(SalesPublicCatalogRepository.publicProductType("operational_item"))
                .isEqualTo("Operational item");
        assertThat(SalesPublicCatalogRepository.publicProductType("service")).isEqualTo("Service");
        assertThat(SalesPublicCatalogRepository.publicProductType("unexpected")).isEqualTo("Product");
    }

    private SalesPublicCatalogRepository.CatalogRecord catalog() {
        var now = Instant.parse("2026-07-18T12:00:00Z");
        return new SalesPublicCatalogRepository.CatalogRecord(
            17L, 7L, "Empresa", null, 11L, "Unidad", 12L, "Negocio", "CATALOGO-2026",
            "Catálogo 2026", "Catálogo público", null, null,
            "GENERAL", "#FF6B5E", "SOFT", "GRID", "ELEVATED", "LANDSCAPE", "Contactar", "email",
            "ventas@example.com", "ACTIVE", null, "tokenhint", null, true, false, true,
            true, true, true, true, false, 1L, now, now);
    }
}
