package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class MercadoPagoIntentScopeIntegrationTest extends MpFinancialDatabaseFixture {
    @Test void historicalReadRemainsBoundToOriginalShiftAfterRegisterScopeChanges() {
        jdbc.update("UPDATE pos_cash_registers SET unit_id=NULL,business_id=NULL WHERE company_id=? AND id=?",
            companyId, registerId);
        var reader = application.getBean(MpIntentReader.class);
        assertTrue(reader.find(observed.context(), observed.id()).isPresent());
        var anotherBusiness = new PosContext(actorId, companyId, "synthetic", "admin", true,
            PosScope.businessOffice(unitId, businessId + 100000));
        assertTrue(reader.find(anotherBusiness, observed.id()).isEmpty());
        var anotherTenant = new PosContext(actorId, companyId + 100000, "synthetic", "admin", true,
            PosScope.businessOffice(unitId, businessId));
        assertTrue(reader.find(anotherTenant, observed.id()).isEmpty());
    }

    @Test void anotherCashierCannotReadOriginalAttemptInSameCompanyAndBusiness() {
        var anotherCashier = new PosContext(actorId + 100000, companyId, "synthetic", "cashier", true,
            PosScope.businessOffice(unitId, businessId));
        assertTrue(application.getBean(MpIntentReader.class).find(anotherCashier, observed.id()).isEmpty());
    }
}
