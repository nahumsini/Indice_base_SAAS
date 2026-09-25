package com.indice.erp.pos.mercadopago;

import java.util.List;

public interface MpMerchantGateway {
    MpProviderDtos.Tokens exchange(String code, String verifier);
    MpProviderDtos.Tokens refresh(String refreshToken);
    MpProviderDtos.Profile profile(String token);
    List<MpProviderDtos.Terminal> terminals(String token);
    MpProviderDtos.Terminal configure(String token, String terminalId);
}
