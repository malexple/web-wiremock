package ru.mcs.webwiremock.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "integration")
public class WiremockProperties {
    private String wiremockHost = "http://localhost:8888";
    /**
     * Папка для хранения профилей стабов.
     * Монтируется как volume в docker-compose.
     */
    private String profilesDir = "./wiremock/profiles";
}