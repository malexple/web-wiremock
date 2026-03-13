package ru.mcs.webwiremock.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import ru.mcs.webwiremock.client.WiremockAdminClient;
import ru.mcs.webwiremock.config.WiremockProperties;
import ru.mcs.webwiremock.dto.ui.ProfileBundle;
import ru.mcs.webwiremock.dto.ui.ProfileInfo;
import ru.mcs.webwiremock.dto.wiremock.ImportOptions;
import ru.mcs.webwiremock.dto.wiremock.StubMapping;
import ru.mcs.webwiremock.dto.wiremock.StubMappingsImport;
import ru.mcs.webwiremock.dto.wiremock.StubMappingsWrapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.stream.Stream;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProfileService {

    private final WiremockAdminClient wiremockAdminClient;
    private final WiremockProperties  wiremockProperties;
    private final ObjectMapper         objectMapper;

    // ─── Список профилей на диске ─────────────────────────────
    public List<ProfileInfo> listProfiles() {
        Path dir = profilesDir();
        if (!Files.exists(dir)) return Collections.emptyList();

        try (Stream<Path> files = Files.list(dir)) {
            return files
                    .filter(p -> p.getFileName().toString().endsWith(".json"))
                    .map(this::readProfileInfo)
                    .filter(p -> p != null)
                    .sorted((a, b) -> a.getName().compareToIgnoreCase(b.getName()))
                    .toList();
        } catch (IOException e) {
            log.error("Failed to list profiles", e);
            return Collections.emptyList();
        }
    }

    // ─── Загрузить профиль из файла ───────────────────────────
    public ProfileBundle loadProfileBundle(String name) throws IOException {
        Path file = profileFile(name);
        if (!Files.exists(file)) throw new IllegalArgumentException("Profile not found: " + name);
        return objectMapper.readValue(file.toFile(), ProfileBundle.class);
    }

    // ─── Сохранить текущие стабы как профиль ─────────────────
    public ProfileBundle saveCurrentAsProfile(String name, String description) throws IOException {
        List<StubMapping> stubs = getAllCurrentStubs();
        ProfileBundle bundle = ProfileBundle.builder()
                .name(name)
                .description(description != null ? description : "")
                .createdAt(existingCreatedAt(name))
                .updatedAt(Instant.now())
                .stubs(stubs)
                .build();
        writeProfile(bundle);
        log.info("Saved profile '{}' with {} stubs", name, stubs.size());
        return bundle;
    }

    // ─── Загрузить профиль в WireMock ─────────────────────────
    /**
     * @param mode "replace" — удалить все стабы и загрузить профиль
     *             "merge"   — добавить стабы профиля к существующим
     */
    public void applyProfile(String name, String mode) throws IOException {
        ProfileBundle bundle = loadProfileBundle(name);
        applyBundle(bundle, mode);
    }

    // ─── Применить ProfileBundle (используется при file-import) ─
    public void applyBundle(ProfileBundle bundle, String mode) {
        boolean replace = "replace".equalsIgnoreCase(mode);
        ImportOptions opts = ImportOptions.builder()
                .duplicatePolicy("OVERWRITE")
                .deleteAllNotInImport(replace)
                .build();
        StubMappingsImport req = StubMappingsImport.builder()
                .mappings(bundle.getStubs() != null ? bundle.getStubs() : Collections.emptyList())
                .importOptions(opts)
                .build();
        wiremockAdminClient.importMappings(req);
        log.info("Applied profile '{}' mode={} stubs={}",
                bundle.getName(), mode,
                bundle.getStubs() != null ? bundle.getStubs().size() : 0);
    }

    // ─── Удалить профиль с диска ──────────────────────────────
    public void deleteProfile(String name) throws IOException {
        Path file = profileFile(name);
        if (Files.exists(file)) {
            Files.delete(file);
            log.info("Deleted profile '{}'", name);
        }
    }

    // ─── Экспорт текущих стабов как bundle (без сохранения) ──
    public ProfileBundle exportCurrentStubs(String name, String description) {
        return ProfileBundle.builder()
                .name(name != null ? name : "export")
                .description(description != null ? description : "")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .stubs(getAllCurrentStubs())
                .build();
    }

    // ─── Вспомогательные ─────────────────────────────────────
    private List<StubMapping> getAllCurrentStubs() {
        StubMappingsWrapper wrapper = wiremockAdminClient.getAllMappings(1000, 0);
        return wrapper.getMappings() != null ? wrapper.getMappings() : Collections.emptyList();
    }

    private Path profilesDir() {
        return Paths.get(wiremockProperties.getProfilesDir());
    }

    private Path profileFile(String name) {
        String safe = name.replaceAll("[^a-zA-Z0-9_\\-. ]", "_");
        return profilesDir().resolve(safe + ".json");
    }

    private void writeProfile(ProfileBundle bundle) throws IOException {
        Path dir = profilesDir();
        Files.createDirectories(dir);
        objectMapper.writerWithDefaultPrettyPrinter()
                .writeValue(profileFile(bundle.getName()).toFile(), bundle);
    }

    private ProfileInfo readProfileInfo(Path file) {
        try {
            ProfileBundle b = objectMapper.readValue(file.toFile(), ProfileBundle.class);
            return ProfileInfo.builder()
                    .name(b.getName() != null ? b.getName()
                            : file.getFileName().toString().replace(".json", ""))
                    .description(b.getDescription() != null ? b.getDescription() : "")
                    .stubCount(b.getStubs() != null ? b.getStubs().size() : 0)
                    .createdAt(b.getCreatedAt())
                    .updatedAt(b.getUpdatedAt())
                    .build();
        } catch (Exception e) {
            log.warn("Cannot read profile file {}: {}", file, e.getMessage());
            return null;
        }
    }

    private Instant existingCreatedAt(String name) {
        try {
            ProfileBundle existing = loadProfileBundle(name);
            return existing.getCreatedAt() != null ? existing.getCreatedAt() : Instant.now();
        } catch (Exception e) {
            return Instant.now();
        }
    }
}