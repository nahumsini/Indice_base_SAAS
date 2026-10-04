package com.indice.erp.platformadmin.leads;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PlatformLeadIntakeController {
    private final PlatformLeadService leads;

    public PlatformLeadIntakeController(PlatformLeadService leads) {
        this.leads = leads;
    }

    /** Server-to-server only. The marketing site validates CSRF, honeypot and rate limits before signing. */
    @PostMapping("/api/v1/public/platform-leads")
    public ResponseEntity<?> ingest(
        @RequestHeader(name = "X-Lead-Id", required = false) String submissionId,
        @RequestHeader(name = "X-Lead-Timestamp", required = false) String timestamp,
        @RequestHeader(name = "X-Lead-Signature", required = false) String signature,
        @RequestBody byte[] rawBody
    ) {
        try {
            var id = leads.ingest(submissionId, timestamp, signature, rawBody);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("leadId", id));
        } catch (SecurityException denied) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Lead intake was rejected."));
        } catch (IllegalArgumentException invalid) {
            return ResponseEntity.badRequest().body(Map.of("message", invalid.getMessage()));
        } catch (IllegalStateException unavailable) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", "Lead intake is unavailable."));
        }
    }
}
