package com.indice.erp.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI indiceOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Indice ERP API")
                        .version("v1")
                        .description("""
                                Spring backend API for Indice ERP modules including authentication,
                                Config Center, Human Resources, Attendance, and Processes.
                                Most business endpoints use the application session cookie created
                                by the login flow.
                                """)
                        .license(new License().name("Proprietary")))
                .servers(List.of(new Server()
                        .url("/")
                        .description("Current server")));
    }
}
