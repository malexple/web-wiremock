package ru.mcs.webwiremock.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ru.mcs.webwiremock.dto.ui.ApiResponse;
import ru.mcs.webwiremock.dto.wiremock.StubMapping;
import ru.mcs.webwiremock.service.ProxyStubBuilderService;
import ru.mcs.webwiremock.service.StubService;

@Slf4j
@RestController
@RequestMapping("/proxy")
@RequiredArgsConstructor
public class ProxyController {

    private final StubService stubService;
    private final ProxyStubBuilderService proxyStubBuilderService;

    /**
     * Автоматически создаёт прокси-стаб на основе существующего клиентского стаба.
     * Используется кнопкой "Создать прокси" в панели деталей стаба.
     *
     * @param sourceId     UUID исходного клиентского стаба
     * @param proxyBaseUrl URL сервиса назначения (например http://real-service:8080)
     */
    @PostMapping("/from-stub/{sourceId}")
    public ResponseEntity<ApiResponse<StubMapping>> createProxyFromStub(
            @PathVariable String sourceId,
            @RequestParam String proxyBaseUrl) {

        StubMapping source = stubService.getStubById(sourceId);
        StubMapping proxyStub = proxyStubBuilderService.buildProxyFromStub(source, proxyBaseUrl);
        StubMapping created = stubService.createStub(proxyStub);

        log.info("Created proxy stub id={} from source id={} → {}", created.getId(), sourceId, proxyBaseUrl);
        return ResponseEntity.ok(ApiResponse.ok("Proxy stub created", created));
    }

    /**
     * Создаёт произвольный прокси-стаб вручную через wizard.
     *
     * @param method       HTTP-метод (GET, POST, ANY и т.д.)
     * @param urlPattern   Regex-паттерн URL, например /api/integration/.*
     * @param proxyBaseUrl URL сервиса назначения
     * @param description  Описание
     */
    @PostMapping("/custom")
    public ResponseEntity<ApiResponse<StubMapping>> createCustomProxy(
            @RequestParam String method,
            @RequestParam String urlPattern,
            @RequestParam String proxyBaseUrl,
            @RequestParam(required = false) String description) {

        StubMapping proxy = proxyStubBuilderService.buildCustomProxyStub(
                method, urlPattern, proxyBaseUrl, description);
        StubMapping created = stubService.createStub(proxy);

        log.info("Created custom proxy stub id={} → {}", created.getId(), proxyBaseUrl);
        return ResponseEntity.ok(ApiResponse.ok("Custom proxy stub created", created));
    }
}