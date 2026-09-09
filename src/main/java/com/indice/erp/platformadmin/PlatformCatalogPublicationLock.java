package com.indice.erp.platformadmin;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.function.Supplier;
import javax.sql.DataSource;
import org.springframework.stereotype.Component;

/** Serializes catalog publication across application instances without a network-spanning transaction. */
@Component
public class PlatformCatalogPublicationLock {
    private static final String LOCK_NAME = "indice:commercial-catalog:publication";
    private final DataSource dataSource;

    public PlatformCatalogPublicationLock(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public <T> T execute(Supplier<T> action) {
        // MySQL advisory locks belong to the physical connection, not to a transaction.
        // Keep that connection exclusively until release; never return a locked connection to the pool.
        try (var connection = dataSource.getConnection()) {
            if (!lockCommand(connection, "SELECT GET_LOCK(?, 0)")) {
                throw new IllegalStateException("Ya hay una publicación en curso. Espera y vuelve a intentarlo.");
            }
            try {
                return action.get();
            } finally {
                try {
                    if (!lockCommand(connection, "SELECT RELEASE_LOCK(?)")) {
                        connection.abort(Runnable::run);
                    }
                } catch (SQLException failure) {
                    connection.abort(Runnable::run);
                    throw failure;
                }
            }
        } catch (SQLException failure) {
            throw new IllegalStateException("No se pudo coordinar la publicación del catálogo.", failure);
        }
    }

    private boolean lockCommand(Connection connection, String sql) throws SQLException {
        try (var statement = connection.prepareStatement(sql)) {
            statement.setString(1, LOCK_NAME);
            try (var result = statement.executeQuery()) {
                return result.next() && result.getInt(1) == 1 && !result.wasNull();
            }
        }
    }
}
