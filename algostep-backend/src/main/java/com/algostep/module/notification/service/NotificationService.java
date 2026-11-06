package com.algostep.module.notification.service;

import com.algostep.module.notification.vo.NotificationVO;
import com.baomidou.mybatisplus.core.metadata.IPage;

public interface NotificationService {

    IPage<NotificationVO> page(int pageNum, int pageSize, Boolean unreadOnly);

    void markAsRead(Long id);

    void markAllAsRead();

    int getUnreadCount();
}
