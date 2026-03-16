package ru.mcs.webwiremock.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import ru.mcs.webwiremock.config.WiremockProperties;
import ru.mcs.webwiremock.dto.ui.ApiResponse;
import ru.mcs.webwiremock.dto.ui.ApplyRecordingRequest;
import ru.mcs.webwiremock.dto.ui.ClientInfo;
import ru.mcs.webwiremock.dto.ui.RecordingStartRequest;
import ru.mcs.webwiremock.dto.ui.RecordingStubInfo;
import ru.mcs.webwiremock.dto.wiremock.RecordingStatus;
import ru.mcs.webwiremock.dto.wiremock.StubMapping;
import ru.mcs.webwiremock.service.ProfileService;
import ru.mcs.webwiremock.service.RecordingService;
import ru.mcs.webwiremock.service.StubService;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Controller
@RequestMapping("/recording")
@RequiredArgsConstructor
public class RecordingController {

    private final RecordingService recordingService;
    private final StubService stubService;
    private final ProfileService profileService;
    private final WiremockProperties wiremockProperties;

    @GetMapping
    public String recordingPage(Model model) {
        // Прокси-стабы — источник для Target URL
        List<Map<String, String>> proxyStubs = stubService.getAllStubs().stream()
                .filter(s -> s.getMetadata() != null && Boolean.TRUE.equals(s.getMetadata().getProxyStub()))
                .map(this::toProxyStubMap)
                .toList();

        List<ClientInfo> clients = stubService.getClients();

        List<String> profiles = profileService.listProfiles().stream()
                .map(p -> p.getName())
                .toList();

        String currentStatus = "NeverStarted";
        try {
            RecordingStatus status = recordingService.getStatus();
            if (status.getStatus() != null) currentStatus = status.getStatus();
        } catch (Exception e) {
            log.debug("Could not fetch recording status: {}", e.getMessage());
        }

        model.addAttribute("proxyStubs", proxyStubs);
        model.addAttribute("clients", clients);
        model.addAttribute("profiles", profiles);
        model.addAttribute("currentStatus", currentStatus);
        model.addAttribute("wiremockHost", wiremockProperties.getWiremockHost());
        return "recording/index";
    }

    @PostMapping("/start")
    @ResponseBody
    public ResponseEntity<ApiResponse<Void>> start(@RequestBody RecordingStartRequest request) {
        if (request.getTargetBaseUrl() == null || request.getTargetBaseUrl().isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Укажите Target URL"));
        }
        recordingService.startRecording(
                request.getTargetBaseUrl(),
                request.getUrlPathPattern(),
                Boolean.TRUE.equals(request.getRepeatsAsScenarios())
        );
        return ResponseEntity.ok(ApiResponse.ok("Запись запущена", null));
    }

    @PostMapping("/stop")
    @ResponseBody
    public ResponseEntity<ApiResponse<List<RecordingStubInfo>>> stop() {
        List<RecordingStubInfo> stubs = recordingService.stopRecording();
        return ResponseEntity.ok(ApiResponse.ok(stubs));
    }

    @GetMapping("/status")
    @ResponseBody
    public ResponseEntity<ApiResponse<String>> status() {
        try {
            RecordingStatus status = recordingService.getStatus();
            return ResponseEntity.ok(ApiResponse.ok(status.getStatus()));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.ok("NeverStarted"));
        }
    }

    @PostMapping("/apply")
    @ResponseBody
    public ResponseEntity<ApiResponse<Void>> apply(@RequestBody ApplyRecordingRequest request) throws IOException {
        recordingService.applyRecording(request);
        int kept = request.getKeepIds() != null ? request.getKeepIds().size() : 0;
        return ResponseEntity.ok(ApiResponse.ok("Применено: " + kept + " стабов", null));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Map<String, String> toProxyStubMap(StubMapping s) {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("id", s.getId() != null ? s.getId() : "");
        m.put("name", s.getName() != null ? s.getName() : "Proxy stub");
        m.put("proxyBaseUrl", s.getResponse() != null && s.getResponse().getProxyBaseUrl() != null
                ? s.getResponse().getProxyBaseUrl() : "");
        return m;
    }
}
