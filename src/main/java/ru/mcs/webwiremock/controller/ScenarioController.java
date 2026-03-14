package ru.mcs.webwiremock.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import ru.mcs.webwiremock.dto.ui.*;
import ru.mcs.webwiremock.dto.wiremock.StubMapping;
import ru.mcs.webwiremock.service.ProfileService;
import ru.mcs.webwiremock.service.ScenarioService;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Slf4j
@Controller
@RequestMapping("/scenarios")
@RequiredArgsConstructor
public class ScenarioController {

    private final ScenarioService scenarioService;
    private final ProfileService  profileService;
    private final ObjectMapper    objectMapper;

    @GetMapping
    public String scenariosPage(Model model) {
        model.addAttribute("scenarios", scenarioService.getAllScenarios());
        return "stubs/scenarios";
    }

    @GetMapping("/list")
    @ResponseBody
    public ResponseEntity<ApiResponse<List<ScenarioInfo>>> listScenarios() {
        return ResponseEntity.ok(ApiResponse.ok(scenarioService.getAllScenarios()));
    }

    @GetMapping("/{name}/state")
    @ResponseBody
    public ResponseEntity<ApiResponse<ScenarioInfo>> getScenarioState(@PathVariable String name) {
        try {
            return ResponseEntity.ok(ApiResponse.ok(scenarioService.getScenario(name)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** Создать новый сценарий через мастер */
    @PostMapping
    @ResponseBody
    public ResponseEntity<ApiResponse<ScenarioInfo>> createScenario(
            @RequestBody CreateScenarioRequest request) {
        try {
            ScenarioInfo created = scenarioService.createScenario(request);
            return ResponseEntity.ok(ApiResponse.ok(
                    "Сценарий '" + request.getScenarioName() + "' создан", created));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** Список стабов для выбора в мастере */
    @GetMapping("/available-stubs")
    @ResponseBody
    public ResponseEntity<ApiResponse<List<StubMapping>>> getAvailableStubs() {
        return ResponseEntity.ok(ApiResponse.ok(scenarioService.getAvailableStubs()));
    }

    @PostMapping("/{name}/reset")
    @ResponseBody
    public ResponseEntity<ApiResponse<Void>> resetScenario(@PathVariable String name) {
        scenarioService.resetScenario(name);
        return ResponseEntity.ok(ApiResponse.ok("Сценарий '" + name + "' сброшен в Started", null));
    }

    @PostMapping("/reset-all")
    @ResponseBody
    public ResponseEntity<ApiResponse<Void>> resetAllScenarios() {
        scenarioService.resetAllScenarios();
        return ResponseEntity.ok(ApiResponse.ok("Все сценарии сброшены в Started", null));
    }

    @PutMapping("/{name}/state")
    @ResponseBody
    public ResponseEntity<ApiResponse<ScenarioInfo>> setScenarioState(
            @PathVariable String name, @RequestBody Map<String, String> body) {
        String state = body.get("state");
        if (state == null || state.isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("state обязателен"));
        scenarioService.setScenarioState(name, state);
        return ResponseEntity.ok(ApiResponse.ok(scenarioService.getScenario(name)));
    }

    @DeleteMapping("/{name}")
    @ResponseBody
    public ResponseEntity<ApiResponse<Void>> deleteScenario(@PathVariable String name) {
        int deleted = scenarioService.deleteScenario(name);
        return ResponseEntity.ok(ApiResponse.ok(
                "Сценарий '" + name + "' удалён (" + deleted + " стабов)", null));
    }

    @GetMapping("/{name}/export")
    public ResponseEntity<byte[]> exportScenario(@PathVariable String name) throws IOException {
        ProfileBundle bundle = scenarioService.exportScenario(name);
        byte[] json = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(bundle);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment()
                                .filename("scenario-" + name + ".json", StandardCharsets.UTF_8)
                                .build().toString())
                .body(json);
    }

    @PostMapping("/import")
    @ResponseBody
    public ResponseEntity<ApiResponse<Void>> importScenario(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "merge") String mode) throws IOException {
        String content = new String(file.getBytes(), StandardCharsets.UTF_8);
        ProfileBundle bundle = objectMapper.readValue(content, ProfileBundle.class);
        profileService.applyBundle(bundle, mode);
        int count = bundle.getStubs() != null ? bundle.getStubs().size() : 0;
        return ResponseEntity.ok(ApiResponse.ok(
                "Импортировано " + count + " стабов сценария (режим: " + mode + ")", null));
    }
}