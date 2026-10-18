package com.indice.erp.email.accounts;

import java.net.InetAddress;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class EmailTransportSecurityTest {
    @Test void credentialsAreBoundToTenantAccountAndChannel() {
        var codec=new EmailCredentialCodec("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
        String encrypted=codec.encrypt(1,"a","smtp","synthetic-password");
        assertThat(codec.decrypt(1,"a","smtp",encrypted)).isEqualTo("synthetic-password");
        assertThat(codec.encrypt(1,"a","smtp","synthetic-password")).isNotEqualTo(encrypted);
        assertThatThrownBy(()->codec.decrypt(2,"a","smtp",encrypted)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(()->codec.decrypt(1,"b","smtp",encrypted)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(()->codec.decrypt(1,"a","receive",encrypted)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(()->new EmailCredentialCodec("").encrypt(1,"a","smtp","synthetic")).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }
    @Test void destinationsExcludePrivateReservedAndTransitionAddresses() throws Exception {
        for(String address:new String[]{"127.0.0.1","0.0.0.0","10.1.2.3","172.16.0.1","192.168.1.1","169.254.169.254","100.64.0.1","198.18.0.1","192.0.2.1","203.0.113.1","224.0.0.1","::1","fc00::1","fe80::1","2001:db8::1","2001:2::1","3fff::1","2002:7f00:1::1","::ffff:127.0.0.1"})
            assertThat(PublicMailSocketFactory.isPublic(InetAddress.getByName(address))).as(address).isFalse();
        assertThat(PublicMailSocketFactory.isPublic(InetAddress.getByName("8.8.8.8"))).isTrue();
        assertThat(PublicMailSocketFactory.isPublic(InetAddress.getByName("2606:4700:4700::1111"))).isTrue();
        assertThat(PublicMailSocketFactory.isPublic(InetAddress.getByName("2001:4860:4860::8888"))).isTrue();
        assertThat(PublicMailSocketFactory.isPublic(InetAddress.getByName("192.0.66.1"))).isTrue();
        assertThatThrownBy(()->new PublicMailSocketFactory("127.0.0.1",465)).isInstanceOf(java.io.IOException.class);
    }
}
