package com.algostep.module.notification.service;

import com.algostep.module.notification.vo.NotificationVO;
import com.baomidou.mybatisplus.core.metadata.IPage;

public interface NotificationService {

    void create(Long userId, String type, String title, String content);

    IPage<NotificationVO> page(int pageNum, int pageSize, Boolean unreadOnly);

    void markAsRead(Long id);

    void markAllAsRead();

    int getUnreadCount();
}
