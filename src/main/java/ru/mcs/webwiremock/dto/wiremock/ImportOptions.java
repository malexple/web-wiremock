package ru.mcs.webwiremock.dto.wiremock;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ImportOptions {
    /**
     * OVERWRITE — перезаписать стаб с тем же id
     * IGNORE    — пропустить если уже существует
     */
    @Builder.Default
    private String duplicatePolicy = "OVERWRITE";

    /**
     * true  → удалить все стабы которых нет в импорте (режим REPLACE)
     * false → оставить существующие стабы (режим MERGE)
     */
    @Builder.Default
    private boolean deleteAllNotInImport = false;
}