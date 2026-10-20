package com.indice.erp.email.accounts;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

public final class EmailAccountContracts {
    private EmailAccountContracts() { }
    public record AccountInput(
        @NotBlank @Size(max=160) String label,
        @NotBlank @Email @Size(max=240) String email,
        @NotBlank @Size(max=160) String displayName,
        @NotBlank @Size(max=253) String smtpHost, int smtpPort,
        @NotNull @Pattern(regexp="TLS|STARTTLS") String smtpSecurity,
        @NotBlank @Size(max=240) String smtpUsername,
        @Size(max=2048) String smtpPassword,
        @NotNull @Pattern(regexp="NONE|IMAP|POP3") String receiveProtocol,
        @NotNull @Size(max=253) String receiveHost, int receivePort,
        @NotNull @Size(max=240) String receiveUsername,
        @Size(max=2048) String receivePassword,
        boolean mailingEnabled, @Min(0) long version) {
        @Override public String toString(){return "AccountInput[redacted]";}
    }
    // Secrets, including their ciphertext, never cross the owner-service boundary.
    public record Account(String id,String label,String email,String displayName,
        String smtpHost,int smtpPort,String smtpSecurity,String smtpUsername,
        String receiveProtocol,String receiveHost,int receivePort,String receiveUsername,
        boolean mailingEnabled,boolean active,boolean hasSmtpPassword,boolean hasReceivePassword,
        String smtpStatus,String receiveStatus,Instant smtpCheckedAt,Instant receiveCheckedAt,long version) { }
    public record Accounts(List<Account> items,boolean configurationAvailable) { }
    public record Version(@Min(1) long version) { }
    public record ConnectionTest(@Min(1) long version,@NotNull @Pattern(regexp="SMTP|RECEIVE") String channel) { }
    // Additive test-only diagnostic; existing account response fields remain at the top level.
    public record ConnectionTestResult(@com.fasterxml.jackson.annotation.JsonUnwrapped Account account,String failureCode) { }
    public record Sender(String id,String label,String email,String displayName,String smtpStatus) { }
}
