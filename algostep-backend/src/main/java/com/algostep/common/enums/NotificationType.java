package com.algostep.common.enums;

import lombok.Getter;

@Getter
public enum NotificationType {

    SYSTEM("SYSTEM", "系统通知"),
    PROGRESS("PROGRESS", "进度通知"),
    ACHIEVEMENT("ACHIEVEMENT", "成就通知");

    private final String code;
    private final String desc;

    NotificationType(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public static NotificationType fromCode(String code) {
        for (NotificationType type : values()) {
            if (type.code.equals(code)) {
                return type;
            }
        }
        return SYSTEM;
    }
}
