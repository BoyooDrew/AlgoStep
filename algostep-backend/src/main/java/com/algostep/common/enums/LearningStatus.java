package com.algostep.common.enums;

import lombok.Getter;

@Getter
public enum LearningStatus {

    UNSTARTED("UNSTARTED", "未开始"),
    LEARNING("LEARNING", "学习中"),
    MASTERED("MASTERED", "已掌握");

    private final String code;
    private final String desc;

    LearningStatus(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public static LearningStatus fromCode(String code) {
        for (LearningStatus status : values()) {
            if (status.code.equals(code)) {
                return status;
            }
        }
        return UNSTARTED;
    }
}
