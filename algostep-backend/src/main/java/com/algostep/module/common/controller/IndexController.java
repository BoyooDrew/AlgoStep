package com.algostep.module.common.controller;

import com.algostep.common.result.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@Tag(name = "公共接口")
@RestController
public class IndexController {

    @Operation(summary = "系统状态")
    @GetMapping("/api/status")
    public Result<Map<String, Object>> index() {
        Map<String, Object> data = new HashMap<>();
        data.put("name", "AlgoStep API");
        data.put("version", "1.0.0");
        data.put("status", "running");
        data.put("docs", "/doc.html");
        data.put("description", "算法可视化教学工具后端 API");
        return Result.success(data);
    }

    @Operation(summary = "健康检查")
    @GetMapping("/health")
    public Result<String> health() {
        return Result.success("OK");
    }
}
