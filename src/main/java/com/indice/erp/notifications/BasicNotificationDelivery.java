package com.indice.erp.notifications;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** One source and recipient per transaction; a failed module cannot roll back another module's notices. */
@Service
public class BasicNotificationDelivery {
    private final SessionAuthService sessions;
    private final AppNotificationService inbox;
    public BasicNotificationDelivery(SessionAuthService sessions,AppNotificationService inbox) {this.sessions=sessions;this.inbox=inbox;}
    @Transactional
    public void deliver(long user,long company,NotificationSignalSource source) {
        sessions.scheduledActor(user,company).ifPresent(actor->{
            for(var signal:source.current(actor)) {
                if(!source.canConfigure(actor,signal.event())) continue;
                inbox.publishOnce(new AppNotificationEvent(company,actor.userCompanyId(),source.module(),signal.sourceType(),signal.sourceId(),
                    signal.event(),signal.key(),signal.title(),signal.reference(),signal.destination()));
            }
        });
    }
}
