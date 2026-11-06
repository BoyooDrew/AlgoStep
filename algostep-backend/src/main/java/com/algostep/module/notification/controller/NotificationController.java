package com.algostep.module.notification.controller;

import com.algostep.common.result.Result;
import com.algostep.module.notification.service.NotificationService;
import com.algostep.module.notification.vo.NotificationVO;
import com.baomidou.mybatisplus.core.metadata.IPage;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Tag(name = "通知管理")
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @Operation(summary = "获取通知列表（分页）")
    @GetMapping
    public Result<Map<String, Object>> page(
            @Parameter(description = "页码，默认1")
            @RequestParam(defaultValue = "1") int pageNum,
            @Parameter(description = "每页数量，默认10")
            @RequestParam(defaultValue = "10") int pageSize,
            @Parameter(description = "是否只看未读")
            @RequestParam(required = false) Boolean unreadOnly) {
        IPage<NotificationVO> page = notificationService.page(pageNum, pageSize, unreadOnly);
        Map<String, Object> result = new HashMap<>();
        result.put("list", page.getRecords());
        result.put("total", page.getTotal());
        result.put("pageNum", page.getCurrent());
        result.put("pageSize", page.getSize());
        result.put("unreadCount", notificationService.getUnreadCount());
        return Result.success(result);
    }

    @Operation(summary = "标记单条通知已读")
    @PutMapping("/{id}/read")
    public Result<Void> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return Result.success();
    }

    @Operation(summary = "全部标记为已读")
    @PutMapping("/read-all")
    public Result<Void> markAllAsRead() {
        notificationService.markAllAsRead();
        return Result.success();
    }

    @Operation(summary = "获取未读数量")
    @GetMapping("/unread-count")
    public Result<Map<String, Integer>> unreadCount() {
        Map<String, Integer> result = new HashMap<>();
        result.put("unreadCount", notificationService.getUnreadCount());
        return Result.success(result);
    }
}
