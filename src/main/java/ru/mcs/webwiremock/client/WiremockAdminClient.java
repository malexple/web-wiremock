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
import ru.mcs.webwiremock.dto.wiremock.RecordingResult;
import ru.mcs.webwiremock.dto.wiremock.RecordingSpec;
import ru.mcs.webwiremock.dto.wiremock.RecordingStatus;
import ru.mcs.webwiremock.dto.wiremock.ScenarioSetStateRequest;
import ru.mcs.webwiremock.dto.wiremock.ScenariosWrapper;
import ru.mcs.webwiremock.dto.wiremock.StubMapping;
import ru.mcs.webwiremock.dto.wiremock.StubMappingsImport;
import ru.mcs.webwiremock.dto.wiremock.StubMappingsWrapper;

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

    @PostMapping("/scenarios/reset")
    void resetAllScenarios();

    @PutMapping("/scenarios/{scenarioName}/state")
    void setScenarioState(
            @PathVariable("scenarioName") String scenarioName,
            @RequestBody ScenarioSetStateRequest request
    );

    // ─── Recording ────────────────────────────────────────────

    @PostMapping("/recordings/start")
    void startRecording(@RequestBody RecordingSpec spec);

    @PostMapping("/recordings/stop")
    RecordingResult stopRecording();

    @GetMapping("/recordings/status")
    RecordingStatus getRecordingStatus();
}
