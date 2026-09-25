package com.indice.erp.pos.cashregister;

final class CashRegisterTestFactory {
    private CashRegisterTestFactory() {}
    static CashRegisterService create(CashRegisterDependencies dependencies) {
        var ownership = new CashRegisterOwnership(dependencies);
        var queries = new CashRegisterQueries(dependencies, ownership);
        var codes = new CashRegisterCodes(dependencies);
        var settlements = new CashRegisterSettlementAccess(dependencies, ownership);
        return new CashRegisterService(queries, ownership, codes, new CashRegisterCreation(dependencies, codes, settlements),
            new CashRegisterProvisioning(dependencies, codes, new CashRegisterWarehouseScope(dependencies)),
            new CashRegisterUpdate(dependencies, ownership, settlements), new CashRegisterDeletion(dependencies, ownership), settlements);
    }
}
