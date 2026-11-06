package com.algostep.module.algorithm.controller;

import com.algostep.common.result.Result;
import com.algostep.module.algorithm.service.AlgorithmService;
import com.algostep.module.algorithm.vo.AlgorithmVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "算法管理")
@RestController
@RequestMapping("/api/algorithms")
@RequiredArgsConstructor
public class AlgorithmController {

    private final AlgorithmService algorithmService;

    @Operation(summary = "获取算法列表")
    @GetMapping
    public Result<List<AlgorithmVO>> list(
            @Parameter(description = "分类：sort/dp/search")
            @RequestParam(required = false) String category) {
        return Result.success(algorithmService.list(category));
    }

    @Operation(summary = "获取算法详情")
    @GetMapping("/{id}")
    public Result<AlgorithmVO> getById(@PathVariable Long id) {
        return Result.success(algorithmService.getById(id));
    }
}
