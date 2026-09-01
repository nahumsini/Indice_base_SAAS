package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;

public class SquareTerminalUnavailableException extends PosApiException {

    private SquareTerminalUnavailableException(String message) {
        super(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, message);
    }

    static SquareTerminalUnavailableException disabled() {
        return new SquareTerminalUnavailableException("Square Terminal is not enabled.");
    }

    static SquareTerminalUnavailableException config(String message) {
        return new SquareTerminalUnavailableException(message);
    }
}
