package com.indice.erp.pos.mercadopago;

record MpAuditActor(String type, Long userId) {
    static MpAuditActor user(long userId) { return new MpAuditActor("USER", userId); }
    static MpAuditActor webhook() { return new MpAuditActor("WEBHOOK", null); }
    static MpAuditActor scheduled() { return new MpAuditActor("SCHEDULED", null); }
    static MpAuditActor system() { return new MpAuditActor("SYSTEM", null); }
}
