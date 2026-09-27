package com.indice.erp.pos.square;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SquareOAuthCallbackController {
    @GetMapping("/api/v1/pos/square/oauth/callback")
    public ResponseEntity<Void> callback(@RequestParam(required=false) String code,
        @RequestParam(required=false) String state, @RequestParam(required=false) String error) {
        String location = "/point-of-sale/cajas?square_oauth_error=invalid_response";
        if (error != null) location = "/point-of-sale/cajas?square_oauth_error=access_denied";
        else if (code != null && !code.isBlank() && code.length() <= 191 && state != null
            && state.matches("[a-f0-9]{64}")) {
            location = "/point-of-sale/cajas?square_oauth_code=" + enc(code) + "&square_oauth_state=" + enc(state);
        }
        return ResponseEntity.status(303).header("Location", location).header("Cache-Control", "no-store")
            .header("Referrer-Policy", "no-referrer").build();
    }
    private String enc(String value) { return URLEncoder.encode(value, StandardCharsets.UTF_8); }
}
