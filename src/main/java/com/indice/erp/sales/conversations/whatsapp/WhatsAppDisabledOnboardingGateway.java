package com.indice.erp.sales.conversations.whatsapp;

import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

/** Real adapter intentionally unavailable until current Meta onboarding contracts are verified and authorized. */
@Component
public final class WhatsAppDisabledOnboardingGateway implements WhatsAppOnboardingGateway {
    public boolean configured(){return false;}
    public VerifiedAssets exchangeAndVerify(String code){throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"whatsapp_onboarding_verification_pending");}
}
