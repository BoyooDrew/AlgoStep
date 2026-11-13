package com.algostep.module.progress.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ProgressDTO {

    @NotNull(message = "算法ID不能为空")
    private Long algorithmId;

    @Min(value = 0, message = "步数不能为负")
    private Integer stepIndex;

    @Min(value = 1, message = "总步数必须大于0")
    private Integer totalSteps;

    @Min(value = 0, message = "学习时长不能为负")
    private Integer studyTime;

    private String status;
}
