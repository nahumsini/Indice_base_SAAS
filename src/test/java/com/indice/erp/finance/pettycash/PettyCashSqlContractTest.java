package com.indice.erp.finance.pettycash;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PettyCashSqlContractTest {

    @Test
    void insertContractsKeepOnePlaceholderPerBoundValue() {
        assertThat(placeholderCount(PettyCashSql.INSERT_FUND)).isEqualTo(35);
        assertThat(placeholderCount(PettyCashSql.INSERT_STATEMENT)).isEqualTo(34);
        assertThat(placeholderCount(PettyCashSql.INSERT_MOVEMENT)).isEqualTo(19);
    }

    @Test
    void fundUpdateKeepsOnePlaceholderPerBoundValue() {
        assertThat(placeholderCount(PettyCashSql.UPDATE_FUND)).isEqualTo(35);
    }

    private long placeholderCount(String sql) {
        return sql.chars().filter(character -> character == '?').count();
    }
}
