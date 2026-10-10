package com.indice.erp.kiosk.api;

import com.indice.erp.kiosk.engine.KioskEngineFeatureFlags;
import com.indice.erp.kiosk.engine.KioskUnavailableException;
import com.indice.erp.kiosk.engine.MultiKioskTodayService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v2/multi-kiosks/public/{publicToken}/today")
public class MultiKioskTodayController {
    private final KioskEngineFeatureFlags flags;
    private final MultiKioskTodayService today;
    private final KioskV2ResponseFactory responses;
    public MultiKioskTodayController(KioskEngineFeatureFlags flags, MultiKioskTodayService today,
            KioskV2ResponseFactory responses) { this.flags = flags; this.today = today; this.responses = responses; }
    @GetMapping
    public ResponseEntity<?> today(HttpServletRequest request, @PathVariable String publicToken,
            @RequestHeader("X-Multi-Kiosk-Session-Token") String sessionToken) {
        if (!flags.registryEnabled() || !flags.sessionsEnabled() || !flags.auditEnabled()
                || !flags.multiDashboardEnabled()) throw new KioskUnavailableException();
        var session = request.getSession(false);
        if (session == null) throw new SecurityException("Employee session required.");
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(responses.success(
            today.today(publicToken, sessionToken, session.getId()), null, null));
    }
}
