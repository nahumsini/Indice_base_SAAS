package com.indice.erp.sales.conversations.whatsapp;

/** Provider-owned verification boundary. Browser asset IDs and token possession are never authority. */
public interface WhatsAppOnboardingGateway {
    record VerifiedAssets(String appId,String portfolioId,String wabaId,String phoneId,String displayPhone,String accessToken) {
        @Override public String toString(){return "VerifiedAssets[redacted]";}
    }
    boolean configured();
    /** Exchange a short-lived code server-side, inspect grants/asset ownership, WABA subscription and number health.
     * No token/secret in a URL and no browser-supplied IDs accepted as verification. */
    VerifiedAssets exchangeAndVerify(String code);
}
