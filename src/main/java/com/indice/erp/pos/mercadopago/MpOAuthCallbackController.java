package com.indice.erp.pos.mercadopago;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
public class MpOAuthCallbackController {
    @GetMapping("/api/v1/pos/mercado-pago/oauth/callback")
    public ResponseEntity<Void> callback(@RequestParam(required=false) String code,
        @RequestParam(required=false) String state, @RequestParam(required=false) String error) {
        String location = "/point-of-sale/cajas?mp_oauth_error=invalid_response";
        if (error != null) location = "/point-of-sale/cajas?mp_oauth_error=access_denied";
        else if (code != null && !code.isBlank() && code.length() <= 512 && state != null
            && state.matches("[A-Za-z0-9_-]{43}")) {
            location = "/point-of-sale/cajas?mp_oauth_code=" + enc(code) + "&mp_oauth_state=" + enc(state);
        }
        return ResponseEntity.status(303).header("Location", location).header("Cache-Control", "no-store")
            .header("Referrer-Policy", "no-referrer").build();
    }
    private String enc(String value) { return URLEncoder.encode(value, StandardCharsets.UTF_8); }
}
