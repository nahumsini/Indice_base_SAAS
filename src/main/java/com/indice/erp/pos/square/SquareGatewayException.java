package com.indice.erp.pos.square;

class SquareGatewayException extends RuntimeException {

    private final boolean uncertain;
    private final int statusCode;

    SquareGatewayException(String message, boolean uncertain, Throwable cause) {
        this(message, uncertain, 0, cause);
    }

    SquareGatewayException(String message, boolean uncertain, int statusCode, Throwable cause) {
        super(message, cause);
        this.uncertain = uncertain;
        this.statusCode = statusCode;
    }

    boolean uncertain() {
        return uncertain;
    }

    boolean unauthorized() {
        return statusCode == 401;
    }
}
