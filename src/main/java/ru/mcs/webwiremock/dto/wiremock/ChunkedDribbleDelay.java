package ru.mcs.webwiremock.dto.wiremock;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChunkedDribbleDelay {
    private Integer numberOfChunks;
    private Integer totalDuration;
}
