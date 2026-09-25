package com.indice.erp.pos.terminal;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpSession;

final class ProviderSessionlessRequest extends HttpServletRequestWrapper {
    ProviderSessionlessRequest(HttpServletRequest request) {
        super(request);
    }

    @Override
    public HttpSession getSession(boolean create) {
        return null;
    }

    @Override
    public HttpSession getSession() {
        return null;
    }
}
