package com.indice.erp.kiosk.api;

import com.indice.erp.kiosk.engine.KioskRateLimitExceededException;
import com.indice.erp.kiosk.engine.KioskEngineDisabledException;
import com.indice.erp.kiosk.engine.KioskUnavailableException;
import com.indice.erp.billing.lifecycle.CommercialAccessRestrictedException;
import com.indice.erp.hr.attendance.kiosk.api.PublicKioskAttendanceApiController;
import com.indice.erp.pos.PosApiException;
import java.util.NoSuchElementException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(assignableTypes = {
    KioskPublicV2Controller.class,
    ProcessTaskKioskAdminV2Controller.class,
    PayableKioskAdminV2Controller.class,
    PettyCashKioskAdminV2Controller.class,
    AttendanceKioskAdminV2Controller.class,
    ProcurementSupplierPortalAdminV2Controller.class,
    PointOfSaleKioskAdminV2Controller.class,
    SalesPublicCatalogAdminV2Controller.class,
    PublicKioskAttendanceApiController.class,
    KioskCenterV2Controller.class,
    KioskMultiDashboardV2Controller.class,
    MultiKioskAdminV2Controller.class,
    MultiKioskPublicV2Controller.class
})
public class KioskPublicV2ExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(KioskPublicV2ExceptionHandler.class);

    /*
     * Keep the advice self-contained. Spring MVC test slices discover global
     * @RestControllerAdvice classes even when the v2 controllers are not part
     * of the slice, while regular @Component collaborators are intentionally
     * excluded. The response factory is stateless, so owning an instance here
     * prevents unrelated legacy controller slices from acquiring a hidden
     * dependency on the v2 API surface.
     */
    private final KioskV2ResponseFactory responses = new KioskV2ResponseFactory();

    @ExceptionHandler(KioskRateLimitExceededException.class)
    public ResponseEntity<?> rateLimited(KioskRateLimitExceededException failure) {
        var headers = new HttpHeaders();
        headers.set(HttpHeaders.RETRY_AFTER, String.valueOf(failure.retryAfterSeconds()));
        return new ResponseEntity<>(
            responses.error("KIOSK_RATE_LIMITED", "Demasiados intentos. Intenta de nuevo más tarde.", true),
            headers,
            HttpStatus.TOO_MANY_REQUESTS
        );
    }

    @ExceptionHandler(CommercialAccessRestrictedException.class)
    public ResponseEntity<?> commercialRestriction(CommercialAccessRestrictedException failure) {
        return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED).body(
            responses.error(
                "KIOSK_COMMERCIAL_ACCESS_RESTRICTED",
                failure.writeOnly()
                    ? "Este kiosko está temporalmente disponible solo para consulta."
                    : "Este kiosko requiere que la empresa regularice su facturación.",
                true
            ));
    }

    @ExceptionHandler(KioskEngineDisabledException.class)
    public ResponseEntity<?> engineDisabled(KioskEngineDisabledException failure) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(
            responses.error("KIOSK_ENGINE_DISABLED", "El motor de kioskos no estÃ¡ disponible.", true));
    }

    @ExceptionHandler({KioskUnavailableException.class, NoSuchElementException.class})
    public ResponseEntity<?> unavailable(RuntimeException failure) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
            responses.error("KIOSK_NOT_AVAILABLE", "Este kiosko no está disponible.", false));
    }

    @ExceptionHandler(KioskInternalAccessException.class)
    public ResponseEntity<?> internalAccess(KioskInternalAccessException failure) {
        var status = failure.authenticated() ? HttpStatus.FORBIDDEN : HttpStatus.UNAUTHORIZED;
        var code = failure.authenticated()
            ? "KIOSK_INTERNAL_FORBIDDEN" : "KIOSK_INTERNAL_AUTH_REQUIRED";
        return ResponseEntity.status(status).body(
            responses.error(code, "No tienes acceso a esta superficie de kioskos.", false));
    }

    @ExceptionHandler(PosApiException.class)
    public ResponseEntity<?> pos(PosApiException failure) {
        return ResponseEntity.status(failure.status()).body(
            responses.error("KIOSK_POS_ERROR", failure.getMessage(), false));
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<?> forbidden(SecurityException failure) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
            responses.error("KIOSK_ACTION_NOT_ALLOWED", "Esta acción no está disponible.", false));
    }

    @ExceptionHandler(UnsupportedOperationException.class)
    public ResponseEntity<?> unsupported(UnsupportedOperationException failure) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).body(
            responses.error("KIOSK_METHOD_NOT_AVAILABLE", "Este método no está disponible.", false));
    }

    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    public ResponseEntity<?> invalid(RuntimeException failure) {
        return ResponseEntity.badRequest().body(
            responses.error("KIOSK_VALIDATION_ERROR", "Revisa la información enviada.", false));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<?> unexpected(RuntimeException failure) {
        LOGGER.error("Unexpected kiosk engine failure type={} message={}",
            failure.getClass().getSimpleName(), failure.getMessage(), failure);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
            responses.error("KIOSK_INTERNAL_ERROR", "No fue posible completar la operación.", true));
    }
}
