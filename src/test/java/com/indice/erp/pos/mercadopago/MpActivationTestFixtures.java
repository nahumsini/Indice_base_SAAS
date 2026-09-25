package com.indice.erp.pos.mercadopago;

final class MpActivationTestFixtures {
    static MpConnection connection(String activation, String state, String seller) {
        var decision = new MpCompanyActivation(activation, MpTestFixtures.NOW, null, null, 11L, "pilot rollout", 2);
        return new MpConnection(4, 42, seller, "production", state, "MX", "MLM", true,
            "access", "refresh", MpTestFixtures.NOW.plusSeconds(600), "read write offline_access",
            decision, 7, null, null);
    }
    private MpActivationTestFixtures() {}
}
