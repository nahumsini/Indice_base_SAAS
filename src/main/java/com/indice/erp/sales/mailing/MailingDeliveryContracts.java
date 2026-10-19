package com.indice.erp.sales.mailing;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import com.indice.erp.email.mailbox.CampaignEmailGateway;
public final class MailingDeliveryContracts {
    private MailingDeliveryContracts() { }
    public record Audience(long contactId,String name,String email,String eligibility) { }
    public record Review(String id,long version,String status,String subject,String bodyText,String replyTo,CampaignEmailGateway.Sender sender,List<Audience> audience,String digest,boolean canSend,boolean publicLinkReady) { }
    public record Launch(@Min(1) long version,@Min(1) long accountVersion,@NotBlank @Size(max=64) String digest,Instant scheduledAt,@NotBlank @Size(max=1000) String footer,@Size(max=500) List<@NotNull @Positive Long> contactIds) {
        // Older clients launch the full eligible audience; an explicit empty selection never does.
        public Launch(long version,long accountVersion,String digest,Instant scheduledAt,String footer){this(version,accountVersion,digest,scheduledAt,footer,null);}
        @Override public String toString(){return "CampaignLaunch[redacted]";}
    }
    public record Consent(@NotEmpty @Size(max=500) List<@Positive Long> contactIds,@NotBlank @Size(min=10,max=1000) String evidence,@NotNull Instant consentedAt) { @Override public String toString(){return "Consent[redacted]";} }
    public record TestInput(@Min(1) long version,@NotBlank @Email @Size(max=240) String to,@NotNull @Pattern(regexp="[a-f0-9-]{36}") String requestId) { @Override public String toString(){return "TestMail[redacted]";} }
    public record Control(@Min(1) long version,@NotNull @Pattern(regexp="PAUSE|RESUME|CANCEL") String action) { }
    public record Delivery(String id,String name,String email,String state,Instant completedAt) { }
    public record Results(String status,long version,Instant scheduledAt,String lastError,List<Delivery> items,boolean canSend) { }
    public record SendResult(String state) { }
}
