package ru.mcs.webwiremock.service;

import org.springframework.stereotype.Service;
import ru.mcs.webwiremock.dto.wiremock.StubMapping;
import ru.mcs.webwiremock.dto.wiremock.StubMappingRequest;
import ru.mcs.webwiremock.dto.wiremock.StubMappingResponse;
import ru.mcs.webwiremock.dto.wiremock.StubMetadata;

import java.util.Objects;

@Service
public class ProxyStubBuilderService {

    /**
     * Генерирует прокси-стаб на основе существующего клиентского стаба.
     *
     * Логика:
     * - Копирует URL-matching из исходного стаба
     * - Убирает JWT customMatcher → стаб матчит всех остальных клиентов
     * - Выставляет низкий приоритет PROXY_STUB_PRIORITY = 10
     * - В metadata помечает как proxyStub и сохраняет clientId источника
     *
     * @param source       исходный клиентский стаб
     * @param proxyBaseUrl URL сервиса, куда проксировать
     */
    public StubMapping buildProxyFromStub(StubMapping source, String proxyBaseUrl) {
        StubMappingRequest proxyRequest = copyRequestWithoutMatcher(source.getRequest());
        String sourceClientId = source.getMetadata() != null
                ? source.getMetadata().getClientId()
                : null;
        String sourceName = Objects.requireNonNullElse(source.getName(), proxyBaseUrl);

        return StubMapping.builder()
                .name("PROXY → " + sourceName)
                .priority(StubService.PROXY_STUB_PRIORITY)
                .persistent(Boolean.TRUE)
                .request(proxyRequest)
                .response(buildProxyResponse(proxyBaseUrl))
                .metadata(StubMetadata.builder()
                        .proxyStub(Boolean.TRUE)
                        .proxyForClientId(sourceClientId)
                        .description("Auto-proxy for: " + sourceName)
                        .build())
                .build();
    }

    /**
     * Создаёт прокси-стаб вручную — через wizard UI.
     *
     * @param method       HTTP-метод (GET, POST, ANY и т.д.)
     * @param urlPattern   URL-паттерн (regex), например "/api/integration/.*"
     * @param proxyBaseUrl URL сервиса, куда проксировать
     * @param description  произвольное описание
     */
    public StubMapping buildCustomProxyStub(
            String method, String urlPattern,
            String proxyBaseUrl, String description) {

        return StubMapping.builder()
                .name("PROXY → " + proxyBaseUrl)
                .priority(StubService.PROXY_STUB_PRIORITY)
                .persistent(Boolean.TRUE)
                .request(StubMappingRequest.builder()
                        .method(method)
                        .urlPattern(urlPattern)
                        .build())
                .response(buildProxyResponse(proxyBaseUrl))
                .metadata(StubMetadata.builder()
                        .proxyStub(Boolean.TRUE)
                        .description(description)
                        .build())
                .build();
    }

    // ── private ───────────────────────────────────────────────────────────────

    /**
     * Копирует URL-matching из исходного request, но без customMatcher (JWT).
     * Также копирует headers и queryParameters для точного совпадения маршрута.
     */
    private StubMappingRequest copyRequestWithoutMatcher(StubMappingRequest source) {
        if (source == null) {
            return StubMappingRequest.builder()
                    .method("ANY")
                    .urlPattern(".*")
                    .build();
        }
        return StubMappingRequest.builder()
                .method(source.getMethod())
                .url(source.getUrl())
                .urlPattern(source.getUrlPattern())
                .urlPath(source.getUrlPath())
                .urlPathPattern(source.getUrlPathPattern())
                .urlPathTemplate(source.getUrlPathTemplate())
                .headers(source.getHeaders())
                .queryParameters(source.getQueryParameters())
                // customMatcher намеренно НЕ копируется
                .build();
    }

    private StubMappingResponse buildProxyResponse(String proxyBaseUrl) {
        return StubMappingResponse.builder()
                .proxyBaseUrl(proxyBaseUrl)
                .build();
    }
}