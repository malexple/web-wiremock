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
import ru.mcs.webwiremock.dto.ui.ApiResponse;
import ru.mcs.webwiremock.dto.ui.ProfileBundle;
import ru.mcs.webwiremock.dto.ui.ProfileInfo;
import ru.mcs.webwiremock.service.ProfileService;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Slf4j
@Controller
@RequestMapping("/profiles")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;
    private final ObjectMapper   objectMapper;

    /** Страница управления профилями */
    @GetMapping
    public String profilesPage(Model model) {
        model.addAttribute("profiles", profileService.listProfiles());
        return "stubs/profiles";
    }

    /** Список профилей (для AJAX-обновления) */
    @GetMapping("/list")
    @ResponseBody
    public ResponseEntity<ApiResponse<List<ProfileInfo>>> listProfiles() {
        return ResponseEntity.ok(ApiResponse.ok(profileService.listProfiles()));
    }

    /** Сохранить текущие стабы как профиль */
    @PostMapping("/save")
    @ResponseBody
    public ResponseEntity<ApiResponse<ProfileInfo>> saveProfile(
            @RequestBody Map<String, String> body) throws IOException {
        String name = body.get("name");
        String desc = body.get("description");
        if (name == null || name.isBlank())
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Имя профиля обязательно"));
        ProfileBundle bundle = profileService.saveCurrentAsProfile(name, desc);
        return ResponseEntity.ok(ApiResponse.ok(ProfileInfo.builder()
                .name(bundle.getName())
                .description(bundle.getDescription())
                .stubCount(bundle.getStubs().size())
                .createdAt(bundle.getCreatedAt())
                .updatedAt(bundle.getUpdatedAt())
                .build()));
    }

    /** Применить профиль к WireMock (replace или merge) */
    @PostMapping("/{name}/apply")
    @ResponseBody
    public ResponseEntity<ApiResponse<Void>> applyProfile(
            @PathVariable String name,
            @RequestParam(defaultValue = "merge") String mode) throws IOException {
        profileService.applyProfile(name, mode);
        return ResponseEntity.ok(ApiResponse.ok(
                "Профиль '" + name + "' применён (режим: " + mode + ")", null));
    }

    /** Удалить профиль */
    @DeleteMapping("/{name}")
    @ResponseBody
    public ResponseEntity<ApiResponse<Void>> deleteProfile(@PathVariable String name)
            throws IOException {
        profileService.deleteProfile(name);
        return ResponseEntity.ok(ApiResponse.ok("Профиль '" + name + "' удалён", null));
    }

    /**
     * Экспорт ТЕКУЩИХ стабов WireMock как JSON-файл для скачивания.
     * Используется кнопкой "Экспорт" без сохранения на диск.
     */
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCurrentStubs(
            @RequestParam(defaultValue = "stubs-export") String name,
            @RequestParam(required = false) String description) throws IOException {
        ProfileBundle bundle = profileService.exportCurrentStubs(name, description);
        byte[] json = objectMapper.writerWithDefaultPrettyPrinter()
                .writeValueAsBytes(bundle);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment()
                                .filename(name + ".json", StandardCharsets.UTF_8)
                                .build().toString())
                .body(json);
    }

    /**
     * Экспорт конкретного профиля с диска как JSON-файл.
     */
    @GetMapping("/{name}/export")
    public ResponseEntity<byte[]> exportProfile(@PathVariable String name) throws IOException {
        ProfileBundle bundle = profileService.loadProfileBundle(name);
        byte[] json = objectMapper.writerWithDefaultPrettyPrinter()
                .writeValueAsBytes(bundle);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment()
                                .filename(name + ".json", StandardCharsets.UTF_8)
                                .build().toString())
                .body(json);
    }

    /**
     * Импорт профиля из загруженного файла (multipart).
     * Файл НЕ сохраняется на диск — сразу применяется в WireMock.
     * Опционально — можно сохранить как профиль.
     */
    @PostMapping("/import")
    @ResponseBody
    public ResponseEntity<ApiResponse<Void>> importFromFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "merge") String mode,
            @RequestParam(defaultValue = "false") boolean saveAsProfile) throws IOException {
        String content = new String(file.getBytes(), StandardCharsets.UTF_8);
        ProfileBundle bundle = objectMapper.readValue(content, ProfileBundle.class);
        if (saveAsProfile) {
            profileService.saveCurrentAsProfile(bundle.getName(), bundle.getDescription());
        }
        profileService.applyBundle(bundle, mode);
        return ResponseEntity.ok(ApiResponse.ok(
                "Импортировано " + (bundle.getStubs() != null ? bundle.getStubs().size() : 0)
                + " стабов (режим: " + mode + ")", null));
    }
}