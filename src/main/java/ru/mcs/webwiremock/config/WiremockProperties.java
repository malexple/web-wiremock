package ru.mcs.webwiremock.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "integration")
public class WiremockProperties {

    /**
     * Базовый URL WireMock-сервера, например http://localhost:8888
     * Задаётся в application.yml как integration.wiremock-host
     */
    private String wiremockHost;
}