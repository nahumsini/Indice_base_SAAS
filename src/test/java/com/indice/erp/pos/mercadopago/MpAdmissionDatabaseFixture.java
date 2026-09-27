package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;

abstract class MpAdmissionDatabaseFixture extends MpFinancialDatabaseFixture {
    @BeforeEach void resolveSyntheticPriorAttempt() {
        jdbc.update("UPDATE pos_mercado_pago_payment_intents SET status='DECLINED' WHERE company_id=? AND id=?",
            companyId, observed.id());
    }
    PosContext context() {
        return new PosContext(actorId, companyId, "Synthetic", "admin", true, PosScope.businessOffice(unitId, businessId));
    }
    MpCreatePayment request() {
        return new MpCreatePayment(UUID.randomUUID().toString(), registerId, null, null, null, "MXN", List.of(), null);
    }
}
