package com.indice.erp.sales.mailing;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

public final class MailingContracts {
    private MailingContracts() { }
    public record DraftInput(@NotBlank @Size(max=180) String name,
        @NotNull @Size(max=240) String subject,@NotNull @Size(max=160) String senderName,
        @NotNull @Email @Size(max=240) String replyTo,@NotNull @Size(max=240) String previewText,
        @NotNull @Size(max=20000) String bodyText,@NotNull @Size(max=500) List<@NotNull @Positive Long> contactIds,
        @Min(0) long version, @Size(max=36) String senderAccountId,@Size(max=500000) String bodyHtml) {
        public DraftInput(String name,String subject,String senderName,String replyTo,String previewText,String bodyText,List<Long> contactIds,long version,String senderAccountId){this(name,subject,senderName,replyTo,previewText,bodyText,contactIds,version,senderAccountId,null);}
        public DraftInput(String name,String subject,String senderName,String replyTo,String previewText,String bodyText,List<Long> contactIds,long version) {
            this(name,subject,senderName,replyTo,previewText,bodyText,contactIds,version,null);
        }
    }
    public record Contact(long id,String name,String email) { }
    public record Campaign(String id,String name,String subject,String senderName,String replyTo,
        String previewText,String bodyText,String status,long version,long recipientCount,Instant updatedAt,
        List<Contact> recipients,String senderAccountId,String bodyHtml) { public Campaign(String id,String name,String subject,String senderName,String replyTo,String previewText,String bodyText,String status,long version,long recipientCount,Instant updatedAt,List<Contact> recipients,String senderAccountId){this(id,name,subject,senderName,replyTo,previewText,bodyText,status,version,recipientCount,updatedAt,recipients,senderAccountId,null);} }
    public record CampaignPage(List<Campaign> items,long total,int page,int pageSize,boolean canEdit,boolean canViewDetails) { }
    public record ContactPage(List<Contact> items,long total,int page,int pageSize) { }
}
