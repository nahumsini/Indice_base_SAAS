package com.indice.erp.pos.square;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import static org.assertj.core.api.Assertions.assertThat;

class SquareOAuthRefreshRaceIntegrationTest extends SquareRegisterDatabaseFixture {
    @Autowired SquareConnectionCredentialWriter writer;
    @Autowired SquareRefreshLeaseStore leases;
    @Test void oauthReconnectInvalidatesAnAlreadyClaimedRefresh() {
        var state=new SquareConnectionRepository.OAuthState(1,company,actor,"sandbox");
        writer.save(state,new SquareRecords.Connection(0,company,"merchant-1","old","old-refresh",
            Instant.now().plusSeconds(60),0),false);
        var id=last("pos_square_connections");
        assertThat(leases.claim(id,0,"stale-worker",Instant.now().plusSeconds(90))).isTrue();
        writer.save(state,new SquareRecords.Connection(0,company,"merchant-1","oauth","oauth-refresh",
            Instant.now().plusSeconds(3600),0),true);
        var stale=new SquareRecords.Connection(id,company,"merchant-1","stale","stale-refresh",
            Instant.now().plusSeconds(3600),0);
        assertThat(leases.complete(id,0,"stale-worker",stale,actor)).isFalse();
        assertThat(leases.fail(id,0,"stale-worker",actor)).isFalse();
        assertThat(jdbc.queryForObject("SELECT access_token_protected FROM pos_square_connections WHERE id=?",
            String.class,id)).isEqualTo("oauth");
        assertThat(jdbc.queryForObject("SELECT status FROM pos_square_connections WHERE id=?",
            String.class,id)).isEqualTo("CONNECTED");
    }
    @Test void currentRefreshFailureMarksTheConnectionForReconnect() {
        var state=new SquareConnectionRepository.OAuthState(1,company,actor,"sandbox");
        writer.save(state,new SquareRecords.Connection(0,company,"merchant-1","old","old-refresh",
            Instant.now().plusSeconds(60),0),false);
        var id=last("pos_square_connections");
        assertThat(leases.claim(id,0,"current-worker",Instant.now().plusSeconds(90))).isTrue();
        assertThat(leases.fail(id,0,"current-worker",actor)).isTrue();
        assertThat(jdbc.queryForObject("SELECT status FROM pos_square_connections WHERE id=?",
            String.class,id)).isEqualTo("ERROR");
    }
}
