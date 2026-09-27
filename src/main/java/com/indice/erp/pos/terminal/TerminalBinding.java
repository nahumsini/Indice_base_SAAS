package com.indice.erp.pos.terminal;

public record TerminalBinding(String providerCode, Long terminalId, String name, String status) {
    public static TerminalBinding unassigned() {
        return new TerminalBinding(null, null, null, "UNASSIGNED");
    }
}
