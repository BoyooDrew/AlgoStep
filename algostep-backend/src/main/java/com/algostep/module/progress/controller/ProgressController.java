package com.algostep.module.progress.controller;

import com.algostep.common.result.Result;
import com.algostep.module.progress.dto.ProgressDTO;
import com.algostep.module.progress.service.ProgressService;
import com.algostep.module.progress.vo.ProgressStatsVO;
import com.algostep.module.progress.vo.ProgressVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "学习进度")
@RestController
@RequestMapping("/api/progress")
@RequiredArgsConstructor
public class ProgressController {

    private final ProgressService progressService;

    @Operation(summary = "获取全部学习进度")
    @GetMapping
    public Result<List<ProgressVO>> list() {
        return Result.success(progressService.list());
    }

    @Operation(summary = "获取单个算法进度")
    @GetMapping("/{algorithmId}")
    public Result<ProgressVO> getByAlgorithmId(@PathVariable Long algorithmId) {
        return Result.success(progressService.getByAlgorithmId(algorithmId));
    }

    @Operation(summary = "保存学习进度")
    @PutMapping
    public Result<ProgressVO> save(@Valid @RequestBody ProgressDTO dto) {
        return Result.success(progressService.save(dto));
    }

    @Operation(summary = "学习统计")
    @GetMapping("/stats")
    public Result<ProgressStatsVO> getStats() {
        return Result.success(progressService.getStats());
    }
}
