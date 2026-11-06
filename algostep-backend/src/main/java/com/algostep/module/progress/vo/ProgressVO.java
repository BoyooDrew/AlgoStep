package com.algostep.module.progress.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ProgressVO {

    private Long id;
    private Long algorithmId;
    private String algorithmName;
    private String algorithmNameZh;
    private String category;
    private String difficulty;
    private String status;
    private Integer stepIndex;
    private Integer totalSteps;
    private Integer studyTime;
    private LocalDateTime updateTime;
}
