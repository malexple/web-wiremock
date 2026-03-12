package ru.mcs.webwiremock.config;

import feign.Logger;
import feign.RequestInterceptor;
import org.springframework.context.annotation.Bean;

public class WiremockFeignConfig {

    @Bean
    public Logger.Level feignLoggerLevel() {
        return Logger.Level.BASIC;
    }

    /**
     * Добавляем Content-Type по умолчанию для всех запросов к WireMock Admin API.
     * Без этого POST/PUT запросы могут вернуть 415 Unsupported Media Type.
     */
    @Bean
    public RequestInterceptor contentTypeInterceptor() {
        return requestTemplate -> {
            if (requestTemplate.body() != null) {
                requestTemplate.header("Content-Type", "application/json");
                requestTemplate.header("Accept", "application/json");
            }
        };
    }
}
