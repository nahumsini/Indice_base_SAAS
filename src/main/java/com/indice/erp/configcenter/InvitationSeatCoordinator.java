package com.indice.erp.configcenter;

import com.indice.erp.billing.seats.SeatService;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InvitationSeatCoordinator {

    private final ConfigCenterService invitations;
    private final SeatService seats;

    public InvitationSeatCoordinator(ConfigCenterService invitations, SeatService seats) {
        this.invitations = invitations;
        this.seats = seats;
    }

    @Transactional
    public Map<String, Object> invite(
        long companyId,
        long actorUserId,
        String actorRole,
        Map<String, Object> payload
    ) {
        var email = payload == null || payload.get("email") == null ? "" : String.valueOf(payload.get("email"));
        var reservation = seats.reserveInvitation(
            companyId,
            email,
            actorUserId,
            "invitation:" + companyId + ":" + UUID.randomUUID()
        );
        var result = invitations.inviteUser(companyId, actorUserId, actorRole, payload);
        seats.attachInvitation(reservation, ((Number) result.get("invitation_id")).longValue());
        return result;
    }

    @Transactional
    public Map<String, Object> delete(
        long companyId,
        long actorUserId,
        String actorRole,
        long invitationId
    ) {
        var result = invitations.deleteInvitation(companyId, actorUserId, actorRole, invitationId);
        seats.releaseInvitation(companyId, invitationId);
        return result;
    }

    @Transactional
    public Map<String, Object> resend(
        long companyId,
        long actorUserId,
        String actorRole,
        long invitationId,
        Map<String, Object> payload
    ) {
        var result = invitations.resendInvitation(companyId, actorUserId, actorRole, invitationId, payload);
        seats.refreshInvitation(companyId, invitationId, String.valueOf(result.get("email")), actorUserId);
        return result;
    }

    @Transactional
    public Map<String, Object> accept(String token, Map<String, Object> payload) {
        var result = invitations.acceptInvitation(token, payload);
        seats.consumeInvitation(
            ((Number) result.get("company_id")).longValue(),
            ((Number) result.get("invitation_id")).longValue(),
            ((Number) result.get("user_company_id")).longValue()
        );
        return result;
    }
}
