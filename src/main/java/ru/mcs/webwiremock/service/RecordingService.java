package ru.mcs.webwiremock.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import ru.mcs.webwiremock.client.WiremockAdminClient;
import ru.mcs.webwiremock.dto.ui.ApplyRecordingRequest;
import ru.mcs.webwiremock.dto.ui.RecordingStubInfo;
import ru.mcs.webwiremock.dto.wiremock.CustomMatcher;
import ru.mcs.webwiremock.dto.wiremock.RecordingFilters;
import ru.mcs.webwiremock.dto.wiremock.RecordingResult;
import ru.mcs.webwiremock.dto.wiremock.RecordingSpec;
import ru.mcs.webwiremock.dto.wiremock.RecordingStatus;
import ru.mcs.webwiremock.dto.wiremock.StubMapping;
import ru.mcs.webwiremock.dto.wiremock.StubMetadata;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecordingService {

    private final WiremockAdminClient wiremockAdminClient;
    private final ApiTreeService apiTreeService;
    private final ProfileService profileService;

    public RecordingStatus getStatus() {
        return wiremockAdminClient.getRecordingStatus();
    }

    public void startRecording(String targetBaseUrl, String urlPathPattern, boolean repeatsAsScenarios) {
        RecordingSpec.RecordingSpecBuilder builder = RecordingSpec.builder()
                .targetBaseUrl(targetBaseUrl)
                .repeatsAsScenarios(repeatsAsScenarios)
                .persist(true);

        if (urlPathPattern != null && !urlPathPattern.isBlank()) {
            builder.filters(RecordingFilters.builder()
                    .urlPathPattern(urlPathPattern)
                    .build());
        }

        wiremockAdminClient.startRecording(builder.build());
        log.info("Recording started: target={}, filter={}", targetBaseUrl, urlPathPattern);
    }

    public List<RecordingStubInfo> stopRecording() {
        RecordingResult result = wiremockAdminClient.stopRecording();
        List<StubMapping> mappings = result.getMappings();
        if (mappings == null) return List.of();

        log.info("Recording stopped: {} stubs captured", mappings.size());
        return mappings.stream()
                .map(this::toStubInfo)
                .toList();
    }

    /**
     * Постобработка после записи:
     * 1. Удалить нежелательные стабы
     * 2. Привязать оставшиеся к clientId (JWT) если указан
     * 3. Сохранить в профиль если указан
     */
    public void applyRecording(ApplyRecordingRequest request) throws IOException {
        if (request.getDeleteIds() != null) {
            for (String id : request.getDeleteIds()) {
                try {
                    wiremockAdminClient.deleteMapping(id);
                } catch (Exception e) {
                    log.warn("Failed to delete recorded stub {}: {}", id, e.getMessage());
                }
            }
        }

        String clientId = request.getClientId();
        if (clientId != null && !clientId.isBlank() && request.getKeepIds() != null) {
            for (String id : request.getKeepIds()) {
                try {
                    StubMapping stub = wiremockAdminClient.getMappingById(id);
                    applyJwtBinding(stub, clientId, request.getClientName());
                    stub.setPriority(StubService.CLIENT_STUB_PRIORITY);
                    wiremockAdminClient.updateMapping(id, stub);
                } catch (Exception e) {
                    log.warn("Failed to apply JWT binding to stub {}: {}", id, e.getMessage());
                }
            }
            log.info("JWT binding applied to {} stubs for clientId={}", request.getKeepIds().size(), clientId);
        }

        if (request.getProfileName() != null && !request.getProfileName().isBlank()) {
            profileService.saveCurrentAsProfile(request.getProfileName(), "Recorded via Record & Playback");
            log.info("Saved recorded stubs to profile '{}'", request.getProfileName());
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void applyJwtBinding(StubMapping stub, String clientId, String clientName) {
        if (stub.getRequest() == null) return;

        Map<String, Object> headerParams = new HashMap<>();
        headerParams.put("alg", "HS256");
        headerParams.put("typ", "JWT");

        Map<String, Object> payloadParams = new HashMap<>();
        payloadParams.put("externalId", clientId);

        Map<String, Object> parameters = new HashMap<>();
        parameters.put("header", headerParams);
        parameters.put("payload", payloadParams);

        stub.getRequest().setCustomMatcher(
                CustomMatcher.builder()
                        .name("jwt-matcher")
                        .parameters(parameters)
                        .build()
        );

        if (stub.getMetadata() == null) {
            stub.setMetadata(new StubMetadata());
        }
        stub.getMetadata().setClientId(clientId);
        if (clientName != null && !clientName.isBlank()) {
            stub.getMetadata().setClientName(clientName);
        }
    }

    private RecordingStubInfo toStubInfo(StubMapping stub) {
        String url = apiTreeService.extractEffectivePath(stub.getRequest());
        String method = (stub.getRequest() != null && stub.getRequest().getMethod() != null)
                ? stub.getRequest().getMethod() : "ANY";
        Integer status = (stub.getResponse() != null) ? stub.getResponse().getStatus() : null;
        boolean hasScenario = stub.getScenarioName() != null;

        return RecordingStubInfo.builder()
                .id(stub.getId())
                .name(stub.getName() != null ? stub.getName() : method + " " + url)
                .method(method)
                .url(url)
                .responseStatus(status)
                .hasScenario(hasScenario)
                .scenarioName(stub.getScenarioName())
                .build();
    }
}
