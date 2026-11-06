package com.algostep.common.constant;

public final class KafkaConstant {

    private KafkaConstant() {}

    public static final String TOPIC_PROGRESS_UPDATE = "progress-update";
    public static final String TOPIC_NOTIFICATION_SEND = "notification-send";
    public static final String TOPIC_USER_ACTIVITY = "user-activity";

    public static final String GROUP_PROGRESS = "progress-consumer-group";
    public static final String GROUP_NOTIFICATION = "notification-consumer-group";
}
