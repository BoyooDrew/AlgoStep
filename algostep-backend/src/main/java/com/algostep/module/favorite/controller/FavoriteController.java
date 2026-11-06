package com.algostep.module.favorite.controller;

import com.algostep.common.result.Result;
import com.algostep.module.favorite.service.FavoriteService;
import com.algostep.module.favorite.vo.FavoriteVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "收藏管理")
@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;

    @Operation(summary = "获取收藏列表")
    @GetMapping
    public Result<List<FavoriteVO>> list() {
        return Result.success(favoriteService.list());
    }

    @Operation(summary = "添加收藏")
    @PostMapping("/{algorithmId}")
    public Result<Void> add(@PathVariable Long algorithmId) {
        favoriteService.add(algorithmId);
        return Result.success();
    }

    @Operation(summary = "取消收藏")
    @DeleteMapping("/{algorithmId}")
    public Result<Void> remove(@PathVariable Long algorithmId) {
        favoriteService.remove(algorithmId);
        return Result.success();
    }
}
