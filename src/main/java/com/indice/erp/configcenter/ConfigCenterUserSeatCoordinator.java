package com.indice.erp.configcenter;

import com.indice.erp.billing.seats.SeatService;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConfigCenterUserSeatCoordinator {

    private final ConfigCenterService users;
    private final SeatService seats;

    public ConfigCenterUserSeatCoordinator(ConfigCenterService users, SeatService seats) {
        this.users = users;
        this.seats = seats;
    }

    @Transactional
    public Map<String, Object> activate(long companyId, long actorUserId, String actorRole, long userId) {
        users.requireCanActivateUser(companyId, actorUserId, actorRole, userId);
        seats.requireAvailableSeatForActivation(companyId, userId);
        return users.activateUser(companyId, actorUserId, actorRole, userId);
    }
}
