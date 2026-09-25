package com.indice.erp.pos.square;

record SquareRefundActor(String type, Long userId) {
    static SquareRefundActor user(long id) { return new SquareRefundActor("USER", id); }
    static SquareRefundActor webhook() { return new SquareRefundActor("WEBHOOK", null); }
    static SquareRefundActor scheduled() { return new SquareRefundActor("SCHEDULED", null); }
    static SquareRefundActor system() { return new SquareRefundActor("SYSTEM", null); }
}
