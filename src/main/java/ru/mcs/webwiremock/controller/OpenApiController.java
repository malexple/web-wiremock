package ru.mcs.webwiremock.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import ru.mcs.webwiremock.dto.ui.ApiResponse;

@Slf4j
@RestController
@RequestMapping("/openapi")
@RequiredArgsConstructor
public class OpenApiController {

    /**
     * Reuse RestClient из RunTestService — тот же бин, те же таймауты.
     * Используется как прокси для обхода CORS при загрузке OpenAPI-спека из браузера.
     */
    private final RestClient runTestRestClient;

    /**
     * Проксирует GET-запрос к указанному URL и возвращает тело как строку.
     * Нужен потому что браузер не может обратиться к internal k8s URL напрямую из-за CORS.
     *
     * @param url полный URL к OpenAPI JSON/YAML (например http://my-service/v3/api-docs)
     */
    @GetMapping("/fetch")
    public ResponseEntity<ApiResponse<String>> fetchSpec(@RequestParam String url) {
        log.debug("Fetching OpenAPI spec from: {}", url);
        try {
            ResponseEntity<String> response = runTestRestClient
                    .get()
                    .uri(url)
                    .retrieve()
                    .onStatus(code -> code.isError(), (req, resp) -> {})
                    .toEntity(String.class);
            return ResponseEntity.ok(ApiResponse.ok(response.getBody()));
        } catch (Exception e) {
            log.error("Failed to fetch OpenAPI spec from {}: {}", url, e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Ошибка загрузки: " + e.getMessage()));
        }
    }
}