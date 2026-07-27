package com.indice.erp.billing.stripe;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/signup")
public class SignupCheckoutApiController {

    @PostMapping("/checkout")
    public ResponseEntity<?> createCheckout() {
        return deprecatedSignupCheckout();
    }

    @GetMapping("/checkout-status")
    public ResponseEntity<?> checkoutStatus() {
        return deprecatedSignupCheckout();
    }

    private ResponseEntity<?> deprecatedSignupCheckout() {
        return ResponseEntity.status(HttpStatus.GONE).body(Map.of(
            "message", "Signup checkout has moved to the billing signup flow.",
            "signupPath", "/signup",
            "apiPath", "/api/v1/billing/signup/checkout"
        ));
    }
}
