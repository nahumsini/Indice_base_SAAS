package com.indice.erp.sales;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class SalesRepositoryProductDeletionTest {

    private static final SalesEntityDefinition PRODUCTS = SalesDefinitions.definitions().get("products");

    @Test
    void productDeletionIsTenantScopedSoftDeleteAndRepeatedDeletionIsNotFound() {
        var jdbc = new ProductDeletionJdbcTemplate(7L, 91L);
        var repository = new SalesRepository(jdbc, new ObjectMapper());

        repository.softDelete(7L, PRODUCTS, 91L);

        assertThat(jdbc.updateCount).isEqualTo(1);
        assertThat(jdbc.updateSql)
                .startsWith("UPDATE sales_products SET deleted_at = CURRENT_TIMESTAMP")
                .contains("WHERE company_id = ? AND id = ?")
                .doesNotContain("DELETE FROM");
        assertThat(jdbc.updateArgs).containsExactly(7L, 91L);

        assertThatThrownBy(() -> repository.softDelete(7L, PRODUCTS, 91L))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessage("product not found.");
        assertThat(jdbc.updateCount).isEqualTo(1);
    }

    @Test
    void aDifferentTenantCannotDeleteTheProductOrInferItThroughTheMutation() {
        var jdbc = new ProductDeletionJdbcTemplate(7L, 91L);
        var repository = new SalesRepository(jdbc, new ObjectMapper());

        assertThatThrownBy(() -> repository.softDelete(8L, PRODUCTS, 91L))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessage("product not found.");

        assertThat(jdbc.querySql)
                .contains("entity.company_id = ?")
                .contains("entity.deleted_at IS NULL");
        assertThat(jdbc.queryArgs).containsExactly("product", 8L, 91L);
        assertThat(jdbc.updateCount).isZero();
    }

    @Test
    void removesOnlyTheDeletedProductFromPublicCatalogSelectionsInItsTenant() {
        var jdbc = mock(JdbcTemplate.class);
        var repository = new SalesRepository(jdbc, new ObjectMapper());

        repository.removeProductFromPublicCatalogs(7L, 91L);

        verify(jdbc).update(
                contains("DELETE FROM sales_public_catalog_products WHERE company_id = ? AND product_id = ?"),
                org.mockito.ArgumentMatchers.eq(7L),
                org.mockito.ArgumentMatchers.eq(91L));
    }

    private static final class ProductDeletionJdbcTemplate extends JdbcTemplate {
        private final long ownerCompanyId;
        private final long productId;
        private boolean deleted;
        private String querySql;
        private Object[] queryArgs = new Object[0];
        private String updateSql;
        private Object[] updateArgs = new Object[0];
        private int updateCount;

        private ProductDeletionJdbcTemplate(long ownerCompanyId, long productId) {
            this.ownerCompanyId = ownerCompanyId;
            this.productId = productId;
        }

        @Override
        @SuppressWarnings("unchecked")
        public <T> List<T> query(String sql, RowMapper<T> rowMapper, Object... args) {
            querySql = sql;
            queryArgs = args;
            var requestedCompanyId = ((Number) args[1]).longValue();
            var requestedProductId = ((Number) args[2]).longValue();
            if (deleted || requestedCompanyId != ownerCompanyId || requestedProductId != productId) {
                return List.of();
            }
            var row = new LinkedHashMap<String, Object>();
            row.put("id", productId);
            row.put("name", "Referenced product");
            return (List<T>) (List<?>) List.of(row);
        }

        @Override
        public int update(String sql, Object... args) {
            updateSql = sql;
            updateArgs = args;
            updateCount++;
            deleted = true;
            return 1;
        }
    }
}
