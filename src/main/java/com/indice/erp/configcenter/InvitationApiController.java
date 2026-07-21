package com.indice.erp.configcenter;

import com.indice.erp.billing.seats.SeatCapacityExceededException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/invitations")
public class InvitationApiController {

    private final ConfigCenterService configCenterService;
    private final InvitationSeatCoordinator invitationSeatCoordinator;

    public InvitationApiController(
        ConfigCenterService configCenterService,
        InvitationSeatCoordinator invitationSeatCoordinator
    ) {
        this.configCenterService = configCenterService;
        this.invitationSeatCoordinator = invitationSeatCoordinator;
    }

    @GetMapping("/{token}")
    public ResponseEntity<?> getInvitation(@PathVariable String token) {
        try {
            return ResponseEntity.ok(configCenterService.getInvitation(token));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(messageBody(ex.getMessage()));
        }
    }

    @PostMapping("/{token}/accept")
    public ResponseEntity<?> acceptInvitation(
        @PathVariable String token,
        @RequestBody Map<String, Object> payload
    ) {
        try {
            return ResponseEntity.ok(invitationSeatCoordinator.accept(token, payload));
        } catch (SeatCapacityExceededException ex) {
            var body = messageBody(ex.getMessage());
            body.put("code", "SEAT_CAPACITY_EXCEEDED");
            body.put("limit", ex.snapshot().limit());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(messageBody(ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(messageBody(ex.getMessage()));
        }
    }

    private Map<String, Object> messageBody(String message) {
        var body = new LinkedHashMap<String, Object>();
        body.put("message", message);
        return body;
    }
}
