package com.algostep.module.notification.service.impl;

import com.algostep.common.exception.BusinessException;
import com.algostep.common.result.ResultCode;
import com.algostep.common.utils.UserContext;
import com.algostep.module.notification.entity.Notification;
import com.algostep.module.notification.mapper.NotificationMapper;
import com.algostep.module.notification.service.NotificationService;
import com.algostep.module.notification.vo.NotificationVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationMapper notificationMapper;

    @Override
    @Transactional
    public void create(Long userId, String type, String title, String content) {
        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setType(type);
        notification.setTitle(title);
        notification.setContent(content);
        notification.setIsRead(0);
        notificationMapper.insert(notification);
    }

    @Override
    public IPage<NotificationVO> page(int pageNum, int pageSize, Boolean unreadOnly) {
        Long userId = UserContext.getUserId();

        LambdaQueryWrapper<Notification> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Notification::getUserId, userId);
        if (Boolean.TRUE.equals(unreadOnly)) {
            wrapper.eq(Notification::getIsRead, 0);
        }
        wrapper.orderByDesc(Notification::getCreateTime);

        Page<Notification> page = new Page<>(pageNum, pageSize);
        IPage<Notification> result = notificationMapper.selectPage(page, wrapper);

        // 转换为 VO
        List<NotificationVO> voList = result.getRecords().stream()
                .map(this::toVO)
                .collect(Collectors.toList());

        Page<NotificationVO> voPage = new Page<>(result.getCurrent(), result.getSize(), result.getTotal());
        voPage.setRecords(voList);
        return voPage;
    }

    @Override
    @Transactional
    public void markAsRead(Long id) {
        Long userId = UserContext.getUserId();

        Notification notification = notificationMapper.selectById(id);
        if (notification == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "通知不存在");
        }
        if (!notification.getUserId().equals(userId)) {
            throw new BusinessException(ResultCode.FORBIDDEN, "无权操作该通知");
        }

        if (notification.getIsRead() == 1) {
            return;
        }

        notification.setIsRead(1);
        notificationMapper.updateById(notification);
        log.debug("通知已读 | userId={} notificationId={}", userId, id);
    }

    @Override
    @Transactional
    public void markAllAsRead() {
        Long userId = UserContext.getUserId();

        LambdaQueryWrapper<Notification> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Notification::getUserId, userId)
               .eq(Notification::getIsRead, 0);

        List<Notification> unreadList = notificationMapper.selectList(wrapper);
        if (unreadList.isEmpty()) {
            return;
        }

        // 批量标记已读
        for (Notification n : unreadList) {
            n.setIsRead(1);
            notificationMapper.updateById(n);
        }

        log.info("全部通知已读 | userId={} count={}", userId, unreadList.size());
    }

    @Override
    public int getUnreadCount() {
        Long userId = UserContext.getUserId();

        Long count = notificationMapper.selectCount(
                new LambdaQueryWrapper<Notification>()
                        .eq(Notification::getUserId, userId)
                        .eq(Notification::getIsRead, 0));

        return count != null ? count.intValue() : 0;
    }

    private NotificationVO toVO(Notification notification) {
        NotificationVO vo = new NotificationVO();
        vo.setId(notification.getId());
        vo.setType(notification.getType());
        vo.setTitle(notification.getTitle());
        vo.setContent(notification.getContent());
        vo.setIsRead(notification.getIsRead());
        vo.setCreateTime(notification.getCreateTime());
        return vo;
    }
}
