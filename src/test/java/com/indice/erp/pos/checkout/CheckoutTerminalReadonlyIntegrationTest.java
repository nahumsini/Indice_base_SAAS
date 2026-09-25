package com.indice.erp.pos.checkout;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.cashregister.CashRegisterRecord;
import com.indice.erp.pos.restaurant.RestaurantTerminalCheckoutReader;
import com.indice.erp.pos.selfservice.SelfServiceTerminalCheckoutReader;
import com.indice.erp.pos.status.CashRegisterStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties={
    "spring.datasource.url=jdbc:mysql://127.0.0.1:${indice.test.mysql-port:3307}/indice_test_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC",
    "spring.datasource.username=indice_test_user", "spring.datasource.password=indice_test_pass",
    "app.pos.mercado-pago.enabled=false", "app.pos.square.enabled=false"})
class CheckoutTerminalReadonlyIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager manager;
    @Autowired SelfServiceTerminalCheckoutReader pretickets;
    @Autowired RestaurantTerminalCheckoutReader restaurants;
    @Test
    void sourceClaimPreflightUsesNonlockingQueriesAllowedByMysqlReadonly() {
        assertEquals("indice_test_db", jdbc.queryForObject("SELECT DATABASE()", String.class));
        var context = new PosContext(-1L, -1L, "Synthetic", "admin", true, PosScope.businessOffice(-1L, -1L));
        var register = new CashRegisterRecord(-1L, -1L, -1L, -1L, -1L, "Synthetic", "TEST", "Synthetic",
            CashRegisterStatus.ACTIVE, true, null, -1L, null, null, null, null, 0L, null, null);
        var transaction = new TransactionTemplate(manager);
        transaction.setReadOnly(true);
        transaction.execute(status -> {
            assertThrows(PosApiException.class, () -> pretickets.requireClaim(context, -1L, register));
            assertThrows(PosApiException.class, () -> restaurants.requireClaim(context, -1L, -1L, -1L));
            assertFalse(status.isRollbackOnly());
            return null;
        });
    }
}
