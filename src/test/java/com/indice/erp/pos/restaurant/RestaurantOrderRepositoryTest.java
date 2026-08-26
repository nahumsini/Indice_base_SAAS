package com.indice.erp.pos.restaurant;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import static org.assertj.core.api.Assertions.assertThat;

class RestaurantOrderRepositoryTest {

    @Test
    void adminProjectionDerivesEngineActivityAndRecoverableAccessFromCanonicalTables() {
        var jdbc = new CapturingJdbcTemplate();
        var repository = new RestaurantOrderRepository(jdbc);

        assertThat(repository.listAdmin(41L)).isEmpty();

        assertThat(jdbc.sql)
            .contains("FROM kiosk_sessions session")
            .contains("FROM kiosk_actions action")
            .contains("definition.protected_public_token")
            .doesNotContain("definition.last_activity_at")
            .doesNotContain("definition.access_recoverable");
    }

    @Test
    void tableProjectionSeparatesTheOptionalAreaFilterFromTheOrderClause() {
        var jdbc = new CapturingJdbcTemplate();
        var repository = new RestaurantOrderRepository(jdbc);

        assertThat(repository.tables(41L, 73L, 19L, 101L)).isEmpty();

        assertThat(jdbc.sql)
            .contains("restaurant_table.area_id = ?\nORDER BY")
            .contains("restaurant_order.settlement_shift_id = ?")
            .contains("restaurant_table.layout_shape")
            .contains("restaurant_table.layout_rotation")
            .contains("responsible_waiter_name")
            .doesNotContain("?ORDER BY");
    }

    @Test
    void floorPlanUpdatesRemainTenantEcosystemAndVersionScoped() {
        var jdbc = new CapturingJdbcTemplate();
        var repository = new RestaurantOrderRepository(jdbc);

        repository.updateTableLayout(41L, 73L, 19L, "Terraza", 6, "RECTANGLE", 2, 4, 4, 2, 0, 3L);

        assertThat(jdbc.sql)
            .contains("layout_shape = ?")
            .contains("version = version + 1")
            .contains("WHERE company_id = ? AND ecosystem_id = ? AND id = ? AND version = ?");
    }

    @Test
    void waiterCatalogReturnsOnlyProductsWithNetAvailabilityOrWithoutStockTracking() {
        var jdbc = new CapturingJdbcTemplate();
        var repository = new RestaurantOrderRepository(jdbc);

        assertThat(repository.catalog(41L, 73L, 101L, "MXN")).isEmpty();

        assertThat(jdbc.sql)
            .contains("SUM(item.quantity) AS reserved_quantity")
            .contains("item.company_id = ? AND ecosystem.warehouse_id = ?")
            .contains("restaurant_order.settlement_shift_id = ?")
            .contains("COALESCE(balance.available_quantity, 0) - COALESCE(reservation.reserved_quantity, 0)")
            .contains("COALESCE(product.inventory_ready, 0) = 0")
            .contains("COALESCE(balance.available_quantity, 0) > COALESCE(reservation.reserved_quantity, 0)");
    }

    @Test
    void orderItemProjectionPreservesGuestAndAuthoritativeKitchenTiming() {
        var jdbc = new CapturingJdbcTemplate();
        var repository = new RestaurantOrderRepository(jdbc);

        assertThat(repository.items(41L, 73L)).isEmpty();

        assertThat(jdbc.sql)
            .contains("item.guest_number")
            .contains("LEFT JOIN pos_restaurant_round_items")
            .contains("restaurant_round.sent_at")
            .contains("round_item.company_id = item.company_id")
            .contains("WHERE item.company_id = ? AND item.order_id = ?");
    }

    @Test
    void orderProjectionExposesPersistentServiceMilestonesInsideTheShiftBoundary() {
        var jdbc = new CapturingJdbcTemplate();
        var repository = new RestaurantOrderRepository(jdbc);

        assertThat(repository.ordersForShift(41L, 73L, 101L)).isEmpty();

        assertThat(jdbc.sql)
            .contains("restaurant_order.settlement_shift_id = ?")
            .contains("restaurant_order.first_item_at")
            .contains("restaurant_order.first_round_sent_at")
            .contains("restaurant_order.kitchen_started_at")
            .contains("restaurant_order.kitchen_ready_at")
            .contains("restaurant_order.served_at")
            .contains("responsible_waiter_name")
            .contains("restaurant_order.check_requested_at");
    }

    @Test
    void waiterAttributionIsTenantEcosystemShiftAndOrderScoped() {
        var jdbc = new CapturingJdbcTemplate();
        var repository = new RestaurantOrderRepository(jdbc);

        assertThat(repository.attributeWaiter(41L, 73L, 101L, 501L, 91L)).isTrue();

        assertThat(jdbc.sql)
            .contains("responsible_user_company_id = ?")
            .contains("company_id = ? AND ecosystem_id = ? AND settlement_shift_id = ? AND id = ?")
            .contains("status IN ('OPEN', 'IN_SERVICE', 'CHECK_REQUESTED', 'READY_FOR_CHECKOUT')");
    }

    @Test
    void kitchenTransitionRecordsItsMilestoneWithTenantEcosystemAndShiftScope() {
        var jdbc = new CapturingJdbcTemplate();
        var repository = new RestaurantOrderRepository(jdbc);

        assertThat(repository.updateItemStatus(
            41L, 73L, 101L, 501L, "SENT,ACKNOWLEDGED", "PREPARING")).isTrue();

        assertThat(jdbc.sql)
            .contains("restaurant_order.kitchen_started_at")
            .contains("COALESCE")
            .contains("restaurant_order.company_id = ?")
            .contains("restaurant_order.ecosystem_id = ?")
            .contains("restaurant_order.settlement_shift_id = ?")
            .contains("item.id = ?");
    }

    @Test
    void kitchenProjectionIsRestrictedToTheCurrentSettlementShift() {
        var jdbc = new CapturingJdbcTemplate();
        var repository = new RestaurantOrderRepository(jdbc);

        assertThat(repository.kitchenItems(41L, 73L, 101L, "ALL")).isEmpty();

        assertThat(jdbc.sql)
            .contains("restaurant_order.settlement_shift_id = ?")
            .contains("item.status IN ('SENT', 'ACKNOWLEDGED', 'PREPARING', 'READY')");
    }

    @Test
    void checkoutQueueIsRestrictedToTheCurrentSettlementShift() {
        var jdbc = new CapturingJdbcTemplate();
        var repository = new RestaurantOrderRepository(jdbc);

        assertThat(repository.pendingCheckout(41L, 73L, 101L, 91L)).isEmpty();

        assertThat(jdbc.sql)
            .contains("restaurant_order.settlement_cash_register_id = ?")
            .contains("restaurant_order.settlement_shift_id = ?");
    }

    private static final class CapturingJdbcTemplate extends JdbcTemplate {
        private String sql;

        @Override
        public <T> List<T> query(String sql, RowMapper<T> rowMapper, Object... args) {
            this.sql = sql;
            return List.of();
        }

        @Override
        public int update(String sql, Object... args) {
            this.sql = sql;
            return 1;
        }
    }
}
