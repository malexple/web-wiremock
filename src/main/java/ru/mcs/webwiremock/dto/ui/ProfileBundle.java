package ru.mcs.webwiremock.dto.ui;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.mcs.webwiremock.dto.wiremock.StubMapping;

import java.time.Instant;
import java.util.List;

/**
 * Формат файла профиля на диске и при экспорте/импорте.
 * Один файл = один сервис = набор стабов.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfileBundle {
    private String name;
    private String description;
    private Instant createdAt;
    private Instant updatedAt;
    /** Версия формата для будущей совместимости */
    @Builder.Default
    private String formatVersion = "1";
    private List<StubMapping> stubs;
}