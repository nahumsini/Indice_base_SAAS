package com.indice.erp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class IndiceErpApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(IndiceErpApiApplication.class, args);
    }
}
