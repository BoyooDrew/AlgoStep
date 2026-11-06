package com.algostep.module.favorite.service.impl;

import com.algostep.common.exception.BusinessException;
import com.algostep.common.result.ResultCode;
import com.algostep.common.utils.UserContext;
import com.algostep.module.algorithm.entity.Algorithm;
import com.algostep.module.algorithm.mapper.AlgorithmMapper;
import com.algostep.module.favorite.entity.Favorite;
import com.algostep.module.favorite.mapper.FavoriteMapper;
import com.algostep.module.favorite.service.FavoriteService;
import com.algostep.module.favorite.vo.FavoriteVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FavoriteServiceImpl implements FavoriteService {

    private final FavoriteMapper favoriteMapper;
    private final AlgorithmMapper algorithmMapper;

    @Override
    public List<FavoriteVO> list() {
        Long userId = UserContext.getUserId();

        List<Favorite> favorites = favoriteMapper.selectList(
                new LambdaQueryWrapper<Favorite>()
                        .eq(Favorite::getUserId, userId)
                        .orderByDesc(Favorite::getCreateTime));

        if (favorites.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        List<Long> algoIds = favorites.stream()
                .map(Favorite::getAlgorithmId)
                .collect(Collectors.toList());
        List<Algorithm> algorithms = algorithmMapper.selectBatchIds(algoIds);
        Map<Long, Algorithm> algoMap = algorithms.stream()
                .collect(Collectors.toMap(Algorithm::getId, a -> a));

        return favorites.stream()
                .map(f -> toVO(f, algoMap.get(f.getAlgorithmId())))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void add(Long algorithmId) {
        Long userId = UserContext.getUserId();

        // 校验算法存在
        Algorithm algorithm = algorithmMapper.selectById(algorithmId);
        if (algorithm == null) {
            throw new BusinessException(ResultCode.ALGORITHM_NOT_FOUND);
        }

        // 校验是否已收藏
        Long count = favoriteMapper.selectCount(
                new LambdaQueryWrapper<Favorite>()
                        .eq(Favorite::getUserId, userId)
                        .eq(Favorite::getAlgorithmId, algorithmId));
        if (count != null && count > 0) {
            throw new BusinessException(ResultCode.FAVORITE_EXISTS);
        }

        Favorite favorite = new Favorite();
        favorite.setUserId(userId);
        favorite.setAlgorithmId(algorithmId);
        favoriteMapper.insert(favorite);

        log.info("收藏成功 | userId={} algorithmId={}", userId, algorithmId);
    }

    @Override
    @Transactional
    public void remove(Long algorithmId) {
        Long userId = UserContext.getUserId();

        Favorite favorite = favoriteMapper.selectOne(
                new LambdaQueryWrapper<Favorite>()
                        .eq(Favorite::getUserId, userId)
                        .eq(Favorite::getAlgorithmId, algorithmId));

        if (favorite == null) {
            throw new BusinessException(ResultCode.FAVORITE_NOT_FOUND);
        }

        favoriteMapper.deleteById(favorite.getId());
        log.info("取消收藏 | userId={} algorithmId={}", userId, algorithmId);
    }

    private FavoriteVO toVO(Favorite favorite, Algorithm algorithm) {
        FavoriteVO vo = new FavoriteVO();
        vo.setId(favorite.getId());
        vo.setAlgorithmId(favorite.getAlgorithmId());
        vo.setCreateTime(favorite.getCreateTime());

        if (algorithm != null) {
            vo.setAlgorithmName(algorithm.getName());
            vo.setAlgorithmNameZh(algorithm.getNameZh());
            vo.setCategory(algorithm.getCategory());
            vo.setDifficulty(algorithm.getDifficulty());
            vo.setUrl(algorithm.getUrl());
        }

        return vo;
    }
}
