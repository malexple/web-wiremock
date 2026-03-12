package ru.mcs.webwiremock;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cloud.openfeign.EnableFeignClients;
import ru.mcs.webwiremock.config.WiremockProperties;

@SpringBootApplication
@EnableFeignClients
@EnableConfigurationProperties(WiremockProperties.class)
public class WebWiremockApplication {

    public static void main(String[] args) {
        SpringApplication.run(WebWiremockApplication.class, args);
    }
}