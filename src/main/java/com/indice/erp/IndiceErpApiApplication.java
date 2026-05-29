package com.indice.erp;

import com.indice.erp.observability.StartupFailureLoggingListener;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class IndiceErpApiApplication {

    public static void main(String[] args) {
        var application = new SpringApplication(IndiceErpApiApplication.class);
        application.addListeners(new StartupFailureLoggingListener());
        application.run(args);
    }
}
