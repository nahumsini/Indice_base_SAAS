package com.indice.erp.pos.square;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.pos.square")
class SquareActivationProperties {
    private boolean liveActivationApproved;
    boolean isLiveActivationApproved() { return liveActivationApproved; }
    void setLiveActivationApproved(boolean value) { liveActivationApproved = value; }
}
