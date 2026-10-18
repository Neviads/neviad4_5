package com.neviad.beneviadsystem.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI neviadOpenApi() {
        return new OpenAPI().info(new Info()
                .title("NEVIAD Physics API")
                .description("Backend API for the NEVIAD Physics teaching workspace")
                .version("0.1.0"));
    }
}
