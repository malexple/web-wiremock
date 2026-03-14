package ru.mcs.webwiremock.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import ru.mcs.webwiremock.config.WiremockFeignConfig;
import ru.mcs.webwiremock.dto.wiremock.*;

@FeignClient(
        name = "wiremock-admin",
        url = "${integration.wiremock-host}",
        path = "/__admin",
        configuration = WiremockFeignConfig.class
)
public interface WiremockAdminClient {

    @GetMapping("/mappings")
    StubMappingsWrapper getAllMappings(
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Integer offset
    );

    @GetMapping("/mappings/{id}")
    StubMapping getMappingById(@PathVariable("id") String id);

    @PostMapping("/mappings")
    StubMapping createMapping(@RequestBody StubMapping stubMapping);

    @PutMapping("/mappings/{id}")
    StubMapping updateMapping(
            @PathVariable("id") String id,
            @RequestBody StubMapping stubMapping
    );

    @DeleteMapping("/mappings/{id}")
    void deleteMapping(@PathVariable("id") String id);

    @DeleteMapping("/mappings")
    void deleteAllMappings();

    @PostMapping("/mappings/import")
    void importMappings(@RequestBody StubMappingsImport importRequest);

    @GetMapping("/requests")
    LoggedRequestsWrapper getRequests(
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String since
    );

    @GetMapping("/requests/unmatched")
    LoggedRequestsWrapper getUnmatchedRequests();

    @DeleteMapping("/requests")
    void clearRequests();

    @GetMapping("/health")
    String getHealth();

    // ─── Scenarios ────────────────────────────────────────────

    @GetMapping("/scenarios")
    ScenariosWrapper getAllScenarios();

    /** Сбросить ВСЕ сценарии в состояние Started */
    @PostMapping("/scenarios/reset")
    void resetAllScenarios();

    /** Установить конкретное состояние для конкретного сценария */
    @PutMapping("/scenarios/{scenarioName}/state")
    void setScenarioState(
            @PathVariable("scenarioName") String scenarioName,
            @RequestBody ScenarioSetStateRequest request
    );
}