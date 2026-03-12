package ru.mcs.webwiremock.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.mcs.webwiremock.config.WiremockProperties;
import ru.mcs.webwiremock.dto.ui.ApiResponse;
import ru.mcs.webwiremock.dto.ui.RunTestRequest;
import ru.mcs.webwiremock.dto.ui.RunTestResponse;
import ru.mcs.webwiremock.service.RunTestService;

@Slf4j
@RestController
@RequestMapping("/run-test")
@RequiredArgsConstructor
public class RunTestController {

    private final RunTestService runTestService;
    private final WiremockProperties wiremockProperties;

    /**
     * Выполняет HTTP-запрос к WireMock через бэкенд.
     * URL формируется как wiremockHost + path из запроса.
     * Это позволяет работать внутри k8s-сети без CORS-проблем.
     *
     * Если в запросе уже передан полный URL (начинается с http) —
     * используем его as-is. Иначе добавляем wiremockHost как префикс.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<RunTestResponse>> runTest(
            @RequestBody RunTestRequest request) {

        if (request.getUrl() == null || request.getUrl().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("URL is required"));
        }

        // Нормализуем URL: если передан относительный путь — добавляем хост WireMock
        if (!request.getUrl().startsWith("http")) {
            String base = wiremockProperties.getWiremockHost()
                    .replaceAll("/$", "");
            String path = request.getUrl().startsWith("/")
                    ? request.getUrl()
                    : "/" + request.getUrl();
            request.setUrl(base + path);
        }

        log.debug("RunTest: {} {}", request.getMethod(), request.getUrl());
        RunTestResponse response = runTestService.execute(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}