package com.indice.erp.auth;

import jakarta.servlet.http.HttpSession;
import java.time.Clock;
import java.time.Duration;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SignupTrialService {

    private final SignupService signupService;
    private final SignupPlanCalculator planCalculator;
    private final Clock clock;

    public SignupTrialService(SignupService signupService, SignupPlanCalculator planCalculator, Clock clock) {
        this.signupService = signupService;
        this.planCalculator = planCalculator;
        this.clock = clock;
    }

    @Transactional
    public SignupService.SignupResult startTrial(SignupCheckoutRequest request, HttpSession session) {
        var profile = signupService.prepareForCheckout(request.accountRequest());
        var plan = planCalculator.calculate(request);
        var now = clock.instant();
        var token = UUID.randomUUID().toString();
        var billing = new SignupBillingInfo(
            plan,
            "internal_customer_" + token,
            "internal_subscription_" + token,
            "trialing",
            now,
            now.plus(Duration.ofDays(SignupTrialTerms.TRIAL_DAYS)),
            now,
            now.plus(Duration.ofDays(SignupTrialTerms.TRIAL_DAYS)),
            false,
            null,
            "internal_trial"
        );
        var result = signupService.createVerifiedAccount(profile, billing);
        signupService.storeSession(session, result, profile.fullName());
        return result;
    }
}
