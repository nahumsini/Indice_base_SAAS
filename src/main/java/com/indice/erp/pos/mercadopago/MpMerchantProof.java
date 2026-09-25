package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import java.util.Set;
import java.util.Arrays;
import java.util.HashSet;

final class MpMerchantProof {
    private MpMerchantProof() {}
    static void mexico(MpProviderDtos.Profile profile, String sellerId) {
        if (profile == null || sellerId == null || !sellerId.matches("[0-9]{1,32}") || !sellerId.equals(profile.id())
            || !"MX".equals(profile.countryId()) || !"MLM".equals(profile.siteId())) {
            throw PosApiException.conflict("A verified Mexican merchant account is required.");
        }
    }
    static void tokens(MpProviderDtos.Tokens tokens, boolean production, String sellerId) {
        if (tokens == null || tokens.accessToken() == null || tokens.accessToken().isBlank()
            || tokens.refreshToken() == null || tokens.refreshToken().isBlank() || tokens.expiresIn() < 120
            || tokens.expiresIn() > 31536000 || tokens.liveMode() == null || tokens.liveMode() != production
            || tokens.accessToken().length() > 8192 || tokens.refreshToken().length() > 8192
            || tokens.scope() == null || tokens.scope().length() > 255
            || tokens.userId() == null || !tokens.userId().matches("[0-9]{1,32}")
            || (sellerId != null && !sellerId.equals(tokens.userId()))) {
            throw PosApiException.conflict("Merchant authorization could not be verified.");
        }
        var scopes = new HashSet<>(Arrays.asList(tokens.scope().trim().split("\\s+")));
        if (!scopes.containsAll(Set.of("read", "write", "offline_access"))) {
            throw PosApiException.conflict("Merchant authorization requires read, write and offline access.");
        }
    }
}
