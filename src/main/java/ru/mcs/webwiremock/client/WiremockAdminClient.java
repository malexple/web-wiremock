package ru.mcs.webwiremock.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import ru.mcs.webwiremock.config.WiremockFeignConfig;
import ru.mcs.webwiremock.dto.wiremock.LoggedRequestsWrapper;
import ru.mcs.webwiremock.dto.wiremock.StubMapping;
import ru.mcs.webwiremock.dto.wiremock.StubMappingsWrapper;

@FeignClient(
        name = "wiremock-admin",
        url = "${integration.wiremock-host}",
        path = "/__admin",
        configuration = WiremockFeignConfig.class
)
public interface WiremockAdminClient {

    // ─────────────── Mappings (Stubs) ───────────────

    /**
     * Получить все стабы с поддержкой пагинации.
     *
     * @param limit  максимальное число записей (null = все)
     * @param offset смещение для пагинации
     */
    @GetMapping("/mappings")
    StubMappingsWrapper getAllMappings(
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Integer offset
    );

    /**
     * Получить стаб по UUID.
     */
    @GetMapping("/mappings/{id}")
    StubMapping getMappingById(@PathVariable("id") String id);

    /**
     * Создать новый стаб.
     */
    @PostMapping("/mappings")
    StubMapping createMapping(@RequestBody StubMapping stubMapping);

    /**
     * Обновить существующий стаб по UUID.
     */
    @PutMapping("/mappings/{id}")
    StubMapping updateMapping(
            @PathVariable("id") String id,
            @RequestBody StubMapping stubMapping
    );

    /**
     * Удалить стаб по UUID.
     */
    @DeleteMapping("/mappings/{id}")
    void deleteMapping(@PathVariable("id") String id);

    /**
     * Удалить ВСЕ стабы (сброс).
     */
    @DeleteMapping("/mappings")
    void deleteAllMappings();

    /**
     * Восстановить стабы из папки mappings/ на диске.
     */
    @PostMapping("/mappings/reset")
    void resetMappings();

    // ─────────────── Request Journal ───────────────

    /**
     * Получить журнал входящих запросов.
     *
     * @param limit максимальное число записей
     * @param since дата-время в ISO8601 (например "2024-01-01T00:00:00Z")
     */
    @GetMapping("/requests")
    LoggedRequestsWrapper getRequests(
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String since
    );

    /**
     * Запросы, не совпавшие ни с одним стабом.
     */
    @GetMapping("/requests/unmatched")
    LoggedRequestsWrapper getUnmatchedRequests();

    /**
     * Очистить журнал запросов.
     */
    @DeleteMapping("/requests")
    void clearRequests();

    // ─────────────── Health ───────────────

    /**
     * Проверка доступности WireMock сервера.
     */
    @GetMapping("/health")
    String getHealth();
}
