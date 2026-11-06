package com.algostep.module.progress.vo;

import lombok.Data;

@Data
public class ProgressStatsVO {

    private Integer total;
    private Integer unstarted;
    private Integer learning;
    private Integer mastered;
    private Long totalStudyTime;
}
