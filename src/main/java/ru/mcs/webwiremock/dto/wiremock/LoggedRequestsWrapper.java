package ru.mcs.webwiremock.dto.wiremock;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class LoggedRequestsWrapper {
    private List<ServeEvent> requests;
    private Meta meta;
    private Boolean requestJournalDisabled;
}
