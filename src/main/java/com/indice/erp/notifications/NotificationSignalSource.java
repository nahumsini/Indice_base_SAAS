package com.indice.erp.notifications;

import com.indice.erp.auth.AuthSessionUser;
import java.util.List;

/** Owner read projection. It never changes a business record or grants authority to its destination. */
public interface NotificationSignalSource {
    String module();
    boolean supports(String sourceType);
    boolean canConfigure(AuthSessionUser user, String event);
    List<Signal> current(AuthSessionUser user);
    boolean visible(AuthSessionUser user, String sourceType, long sourceId, String event);

    record Signal(String sourceType, long sourceId, String event, String key,
                  String title, String reference, String destination) { }
}
