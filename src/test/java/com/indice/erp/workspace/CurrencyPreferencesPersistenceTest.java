package com.indice.erp.workspace;

import static org.assertj.core.api.Assertions.assertThat;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

@JdbcTest(properties={"logging.level.org.springframework=WARN", "logging.level.org.springframework.jdbc.core=WARN"})
@AutoConfigureTestDatabase(replace=AutoConfigureTestDatabase.Replace.NONE)
@Import({UserWorkspaceStateService.class, ObjectMapper.class})
class CurrencyPreferencesPersistenceTest {
    @Autowired JdbcTemplate db;
    @Autowired UserWorkspaceStateService states;
    @Autowired ObjectMapper mapper;

    @Test void currencyIsDurablePerUserAndCompanyWithoutExpiryOrDuplicateRows() {
        assertThat(db.queryForObject("SELECT DATABASE()", String.class)).isEqualTo("indice_test_db");
        long firstCompany = company(), secondCompany = company(), alice = user(), bob = user();
        var aliceCurrency = mapper.createObjectNode().put("version", 1).put("preferredCurrency", "CAD");
        var bobCurrency = mapper.createObjectNode().put("version", 1).put("preferredCurrency", "USD");
        states.save(firstCompany, alice, "system", "business-currency", aliceCurrency, 1);
        // A repeated, identical save is safe after an acknowledgement is lost.
        states.save(firstCompany, alice, "system", "business-currency", aliceCurrency, 1);
        assertThat(state(firstCompany, bob).isEmpty()).isTrue();
        assertThat(state(secondCompany, alice).isEmpty()).isTrue();
        states.save(firstCompany, bob, "system", "business-currency", bobCurrency, 1);
        states.save(secondCompany, alice, "system", "business-currency", bobCurrency, 1);
        var afterRestart = new UserWorkspaceStateService(db, mapper);
        assertThat((JsonNode) afterRestart.get(firstCompany, alice, "system", "business-currency").get("state")).isEqualTo(aliceCurrency);
        assertThat(state(firstCompany, bob)).isEqualTo(bobCurrency);
        assertThat(state(secondCompany, alice)).isEqualTo(bobCurrency);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM user_workspace_states WHERE company_id=? AND user_id=? AND module_key='system' AND tab_key='business-currency' AND expires_at IS NULL", Integer.class, firstCompany, alice)).isEqualTo(1);
        states.delete(firstCompany, alice, "system", "business-currency");
        assertThat(state(firstCompany, alice).isEmpty()).isTrue();
        assertThat(state(firstCompany, bob)).isEqualTo(bobCurrency);
        assertThat(state(secondCompany, alice)).isEqualTo(bobCurrency);
    }
    private JsonNode state(long company, long user) {
        return (JsonNode) states.get(company, user, "system", "business-currency").get("state");
    }
    private long company() {
        db.update("INSERT INTO companies(name,commercial_account_type,platform_status) VALUES (?,'SUPER_ADMIN','ACTIVE')", "Currency test " + UUID.randomUUID());
        return db.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
    }
    private long user() {
        db.update("INSERT INTO users(email,password_hash,full_name) VALUES (?,'test-only','Currency test')", UUID.randomUUID() + "@example.invalid");
        return db.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
    }
}
