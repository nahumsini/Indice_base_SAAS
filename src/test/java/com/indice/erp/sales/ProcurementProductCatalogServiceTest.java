package com.indice.erp.sales;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class ProcurementProductCatalogServiceTest {

    @Mock JdbcTemplate jdbc;

    @Test
    void newProductCannotPersistASalePriceBelowSupplierCost() {
        var service = new ProcurementProductCatalogService(jdbc);

        assertThatThrownBy(() -> service.createNew(
            context(), null, "SUP-1", "Producto", null, null, null,
            new BigDecimal("10.1234"), new BigDecimal("10.1233"), "MXN"))
            .isInstanceOf(PosApiException.class)
            .hasMessage("Sale price cannot be lower than the supplier cost.");

        verifyNoInteractions(jdbc);
    }

    @Test
    void catalogPriceRejectsPrecisionThatTheDatabaseCannotPreserve() {
        var service = new ProcurementProductCatalogService(jdbc);

        assertThatThrownBy(() -> service.createNew(
            context(), null, "SUP-1", "Producto", null, null, null,
            new BigDecimal("10.0000"), new BigDecimal("10.12345"), "MXN"))
            .isInstanceOf(PosApiException.class)
            .hasMessage("Sale price supports up to 15 integers and four decimals.");

        verifyNoInteractions(jdbc);
    }

    private PosContext context() {
        return new PosContext(10L, 7L, "Buyer", "admin", true, PosScope.corporateOffice());
    }
}
