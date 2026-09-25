package com.indice.erp.pos.square;

import static org.junit.jupiter.api.Assertions.*;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties={
    "spring.datasource.url=jdbc:mysql://127.0.0.1:${indice.test.mysql-port:3307}/indice_test_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC",
    "spring.datasource.username=indice_test_user", "spring.datasource.password=indice_test_pass",
    "app.pos.mercado-pago.enabled=false", "app.pos.square.enabled=false"})
@Transactional
class SquareOAuthStateIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired SquareConnectionRepository connections;
    @Autowired SquareOAuthStateStore states;
    @Test void companyActorEnvironmentBindingPreventsConsumptionAndReplay() {
        assertEquals("indice_test_db", jdbc.queryForObject("SELECT DATABASE()", String.class));
        String unique = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies(name) VALUES (?)", "Synthetic Square " + unique);
        long company = jdbc.queryForObject("SELECT id FROM companies WHERE name=?", Long.class, "Synthetic Square " + unique);
        jdbc.update("INSERT INTO users(email,password_hash) VALUES (?,'isolated-no-login')", unique + "@example.test");
        long actor = jdbc.queryForObject("SELECT id FROM users WHERE email=?", Long.class, unique + "@example.test");
        var owner = context(actor, company);
        var now = Instant.now();
        String hash = SquareHashing.sha256(unique);
        connections.createOAuthState(owner, hash, "sandbox", now.plusSeconds(300));
        assertThrows(PosApiException.class, () -> states.consume(context(actor + 1, company), hash, "sandbox", now));
        assertThrows(PosApiException.class, () -> states.consume(context(actor, company + 1), hash, "sandbox", now));
        assertThrows(PosApiException.class, () -> states.consume(owner, hash, "production", now));
        assertThrows(PosApiException.class, () -> states.consume(owner, hash, "sandbox", now.plusSeconds(301)));
        assertEquals("PENDING", jdbc.queryForObject("SELECT status FROM pos_square_oauth_states WHERE company_id=? AND state_hash=?", String.class, company, hash));
        assertEquals(company, states.consume(owner, hash, "sandbox", now).companyId());
        assertThrows(PosApiException.class, () -> states.consume(owner, hash, "sandbox", now));
    }
    private PosContext context(long actor, long company) {
        return new PosContext(actor, company, "Synthetic Square", "admin", true, PosScope.corporateOffice());
    }
}
