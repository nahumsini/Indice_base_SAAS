package com.indice.erp.pos.square;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties={
    "spring.datasource.url=jdbc:mysql://127.0.0.1:${indice.test.mysql-port:3307}/indice_test_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC",
    "spring.datasource.username=indice_test_user", "spring.datasource.password=indice_test_pass",
    "app.pos.mercado-pago.enabled=false", "app.pos.square.enabled=false"})
class SquareSubmissionJsonIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Test @Transactional void mysqlRepresentationIsStableForFirstDeliveryAndRetry() {
        assertThat(jdbc.queryForObject("SELECT DATABASE()",String.class)).contains("test");
        var columns=jdbc.queryForObject("""
            SELECT GROUP_CONCAT(column_name ORDER BY seq_in_index) FROM information_schema.statistics
            WHERE table_schema=DATABASE() AND table_name='pos_square_oauth_states'
              AND index_name='ix_square_oauth_state_expiry'
            """,String.class);
        assertThat(columns).isEqualTo("expires_at,id");
        jdbc.execute("DROP TEMPORARY TABLE IF EXISTS square_submission_json_test");
        jdbc.execute("CREATE TEMPORARY TABLE square_submission_json_test (body JSON NOT NULL)");
        var input="{ \"z\": 1, \"a\": { \"second\": 2, \"first\": 1 } }";
        jdbc.update("INSERT INTO square_submission_json_test(body) VALUES (CAST(? AS JSON))",input);
        var first=jdbc.queryForObject("SELECT CAST(body AS CHAR) FROM square_submission_json_test",String.class);
        var retry=jdbc.queryForObject("SELECT CAST(body AS CHAR) FROM square_submission_json_test",String.class);
        assertThat(first).isEqualTo(retry).isNotEqualTo(input);
        jdbc.execute("DROP TEMPORARY TABLE square_submission_json_test");
    }
}
