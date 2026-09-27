package com.indice.erp.pos.square;

import java.sql.Timestamp;
import com.indice.erp.pos.PosApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class SquareConnectionCredentialWriter {
    private final JdbcTemplate jdbc;
    void save(SquareConnectionRepository.OAuthState state, SquareRecords.Connection connection,
            boolean existing) {
        var expiry=connection.tokenExpiresAt()==null?null:Timestamp.from(connection.tokenExpiresAt());
        try {
            if (!existing) jdbc.update("""
                INSERT INTO pos_square_connections
                  (company_id,environment,merchant_id,access_token_protected,refresh_token_protected,
                   token_expires_at,status,created_by_user_id,updated_by_user_id)
                VALUES (?,?,?,?,?,?,'CONNECTED',?,?)
                """,state.companyId(),state.environment(),connection.merchantId(),connection.accessToken(),
                connection.refreshToken(),expiry,state.userId(),state.userId());
            else if (jdbc.update("""
                UPDATE pos_square_connections SET merchant_id=?,access_token_protected=?,
                  refresh_token_protected=?,token_expires_at=?,token_version=token_version+1,
                  refresh_lease_owner=NULL,refresh_lease_until=NULL,status='CONNECTED',updated_by_user_id=?
                WHERE company_id=? AND environment=?
                """,connection.merchantId(),connection.accessToken(),connection.refreshToken(),expiry,
                state.userId(),state.companyId(),state.environment()) != 1)
                throw PosApiException.conflict("Square connection changed. Retry the connection.");
        } catch (DataIntegrityViolationException collision) {
            throw PosApiException.conflict("Square merchant is already connected to another company.");
        }
    }
}
