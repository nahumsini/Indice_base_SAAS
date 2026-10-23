package com.indice.erp.sales.whatsapping;

import com.indice.erp.auth.AuthSessionUser;
import org.springframework.stereotype.Service;

/** Owner port shared with human Conversations: exclusions are not opt-in or provider receipts. */
@Service
public class WhatsAppSuppressionContract {
    private final WhatsappingRepository repository;
    public WhatsAppSuppressionContract(WhatsappingRepository repository){this.repository=repository;}
    public boolean blocked(long company,String canonicalPhone){return repository.isSuppressed(company,canonicalPhone);}
    public void recordOptOut(AuthSessionUser actor,String canonicalPhone){
        if(!canonicalPhone.matches("\\+[1-9][0-9]{6,14}"))throw new IllegalArgumentException("Invalid canonical peer");
        repository.suppress(actor,canonicalPhone);
    }
}
