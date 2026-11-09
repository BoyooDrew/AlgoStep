package com.algostep.common.guard;

import com.algostep.common.exception.BusinessException;
import com.algostep.common.result.ResultCode;
import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 登录防爆破守卫（单机内存实现）。
 *
 * 规则：同一「客户端 IP + 用户名」在 60 秒窗口内失败 5 次即拒绝登录，
 * 登录成功后立即清零。多实例部署时需替换为 Redis 计数。
 */
@Component
public class LoginAttemptGuard {

    private static final int MAX_FAILURES = 5;
    private static final long WINDOW_MS = 60_000L;

    private final Map<String, Deque<Long>> failures = new ConcurrentHashMap<>();

    /** 登录前置校验，超限抛出 RATE_LIMIT 业务异常 */
    public void check(String key) {
        Deque<Long> queue = failures.get(key);
        if (queue == null) return;

        synchronized (queue) {
            purge(queue);
            if (queue.size() >= MAX_FAILURES) {
                throw new BusinessException(ResultCode.RATE_LIMIT);
            }
        }
    }

    /** 记录一次登录失败 */
    public void recordFailure(String key) {
        Deque<Long> queue = failures.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (queue) {
            purge(queue);
            queue.addLast(System.currentTimeMillis());
        }
    }

    /** 登录成功后清除计数 */
    public void clear(String key) {
        failures.remove(key);
    }

    private void purge(Deque<Long> queue) {
        long deadline = System.currentTimeMillis() - WINDOW_MS;
        while (!queue.isEmpty() && queue.peekFirst() < deadline) {
            queue.pollFirst();
        }
    }
}
