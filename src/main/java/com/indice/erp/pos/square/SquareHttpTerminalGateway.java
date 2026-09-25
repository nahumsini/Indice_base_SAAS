package com.indice.erp.pos.square;

import java.util.List;
import org.springframework.stereotype.Component;

@Component
class SquareHttpTerminalGateway implements SquareTerminalGateway {
    private final SquareOAuthHttpClient oauth;
    private final SquareDeviceHttpClient devices;
    private final SquareCheckoutHttpClient checkouts;
    SquareHttpTerminalGateway(SquareOAuthHttpClient oauth, SquareDeviceHttpClient devices,
            SquareCheckoutHttpClient checkouts) {
        this.oauth = oauth; this.devices = devices; this.checkouts = checkouts;
    }
    public OAuthToken exchangeCode(String code) { return oauth.exchange(code); }
    public OAuthToken refreshToken(String token) { return oauth.refresh(token); }
    public List<SquareTerminalDtos.SquareLocation> listLocations(String token) {
        return devices.locations(token);
    }
    public DeviceCode createDeviceCode(String token, String key, String location, String name) {
        return devices.create(token, key, location, name);
    }
    public Checkout createCheckout(String token, String requestJson) {
        return checkouts.create(token, requestJson);
    }
    public Checkout getCheckout(String token, String id) { return checkouts.get(token, id); }
    public List<Checkout> searchCheckouts(String token, CheckoutSearch search) {
        return checkouts.search(token, search);
    }
    public Checkout cancelCheckout(String token, String id) { return checkouts.cancel(token, id); }
}
