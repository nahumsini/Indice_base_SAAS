package com.indice.erp.sales;
import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import static com.indice.erp.sales.InventoryAssistantContracts.*;

class InventoryAssistantContractsTest {
    private final ObjectMapper mapper=new ObjectMapper().registerModule(new JavaTimeModule());
    @Test void delegatedBodiesRejectUnknownAuthorityEvenUnderTheLegacyLenientMapper() throws Exception {
        assertThatThrownBy(()->mapper.readValue("{\"companyId\":99}",Change.class)).isInstanceOf(Exception.class);
        assertThatThrownBy(()->mapper.readValue("{\"product\":{\"name\":\"Synthetic\",\"companyId\":99}}",Change.class)).isInstanceOf(Exception.class);
        assertThatThrownBy(()->mapper.readValue("{\"stock\":{\"availableQuantity\":100}}",Change.class)).isInstanceOf(Exception.class);
        assertThatThrownBy(()->mapper.readValue("{\"warehouse\":{\"role\":\"root\"}}",Change.class)).isInstanceOf(Exception.class);
        assertThatThrownBy(()->mapper.readValue("{\"sql\":\"SELECT 1\"}",Query.class)).isInstanceOf(Exception.class);
    }
    @Test void serializationPreservesExplicitDecimalInputAndOmitsAbsentChangeFields() throws Exception {
        var change=mapper.readValue("{\"movement\":{\"date\":\"2026-10-06\",\"toWarehouseId\":2,\"reason\":\"Synthetic\",\"items\":[{\"productId\":3,\"quantity\":\"0.125\",\"unitCost\":\"1.2345\"}]}}",Change.class);
        var json=mapper.valueToTree(change);assertThat(json.has("product")).isFalse();assertThat(json.get("movement").has("fromWarehouseId")).isFalse();
        assertThat(change.movement().items().getFirst().quantity()).isEqualByComparingTo(new BigDecimal("0.125"));
        assertThat(change.movement().items().getFirst().unitCost()).isEqualByComparingTo(new BigDecimal("1.2345"));
    }
}
