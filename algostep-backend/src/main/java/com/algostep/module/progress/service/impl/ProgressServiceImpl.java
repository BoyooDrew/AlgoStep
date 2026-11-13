package com.algostep.module.progress.service.impl;

import com.algostep.common.enums.LearningStatus;
import com.algostep.common.exception.BusinessException;
import com.algostep.common.result.ResultCode;
import com.algostep.common.utils.UserContext;
import com.algostep.module.algorithm.entity.Algorithm;
import com.algostep.module.algorithm.mapper.AlgorithmMapper;
import com.algostep.module.progress.dto.ProgressDTO;
import com.algostep.module.progress.entity.LearningProgress;
import com.algostep.module.progress.mapper.ProgressMapper;
import com.algostep.module.progress.service.ProgressService;
import com.algostep.module.progress.vo.ProgressStatsVO;
import com.algostep.module.progress.vo.ProgressVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProgressServiceImpl implements ProgressService {

    private final ProgressMapper progressMapper;
    private final AlgorithmMapper algorithmMapper;

    @Override
    public List<ProgressVO> list() {
        Long userId = UserContext.getUserId();

        // 查询用户所有进度
        List<LearningProgress> progressList = progressMapper.selectList(
                new LambdaQueryWrapper<LearningProgress>()
                        .eq(LearningProgress::getUserId, userId)
                        .orderByDesc(LearningProgress::getUpdateTime));

        if (progressList.isEmpty()) {
            return new ArrayList<>();
        }

        // 批量查询算法信息
        List<Long> algoIds = progressList.stream()
                .map(LearningProgress::getAlgorithmId)
                .collect(Collectors.toList());
        List<Algorithm> algorithms = algorithmMapper.selectBatchIds(algoIds);
        Map<Long, Algorithm> algoMap = algorithms.stream()
                .collect(Collectors.toMap(Algorithm::getId, a -> a));

        // 组装 VO
        return progressList.stream()
                .map(p -> toVO(p, algoMap.get(p.getAlgorithmId())))
                .collect(Collectors.toList());
    }

    @Override
    public ProgressVO getByAlgorithmId(Long algorithmId) {
        Long userId = UserContext.getUserId();

        LearningProgress progress = progressMapper.selectOne(
                new LambdaQueryWrapper<LearningProgress>()
                        .eq(LearningProgress::getUserId, userId)
                        .eq(LearningProgress::getAlgorithmId, algorithmId));

        Algorithm algorithm = algorithmMapper.selectById(algorithmId);

        if (progress == null) {
            // 没有学习记录，返回默认进度
            ProgressVO vo = new ProgressVO();
            vo.setAlgorithmId(algorithmId);
            if (algorithm != null) {
                vo.setAlgorithmName(algorithm.getName());
                vo.setAlgorithmNameZh(algorithm.getNameZh());
                vo.setCategory(algorithm.getCategory());
                vo.setDifficulty(algorithm.getDifficulty());
            }
            vo.setStatus(LearningStatus.UNSTARTED.getCode());
            vo.setStepIndex(0);
            vo.setTotalSteps(0);
            vo.setStudyTime(0);
            return vo;
        }

        return toVO(progress, algorithm);
    }

    @Override
    @Transactional
    public ProgressVO save(ProgressDTO dto) {
        Long userId = UserContext.getUserId();
        Algorithm algorithm = algorithmMapper.selectById(dto.getAlgorithmId());
        if (algorithm == null) {
            throw new BusinessException(ResultCode.ALGORITHM_NOT_FOUND);
        }

        // 查询已有进度
        LearningProgress progress = progressMapper.selectOne(
                new LambdaQueryWrapper<LearningProgress>()
                        .eq(LearningProgress::getUserId, userId)
                        .eq(LearningProgress::getAlgorithmId, dto.getAlgorithmId()));

        if (progress == null) {
            // 新建进度
            progress = new LearningProgress();
            progress.setUserId(userId);
            progress.setAlgorithmId(dto.getAlgorithmId());
            progress.setStatus(LearningStatus.LEARNING.getCode());
            progress.setStepIndex(0);
            progress.setTotalSteps(0);
            progress.setStudyTime(0);
        }

        // 更新字段（仅更新传入的非空字段）
        if (dto.getStepIndex() != null) {
            progress.setStepIndex(dto.getStepIndex());
        }
        if (dto.getTotalSteps() != null) {
            progress.setTotalSteps(dto.getTotalSteps());
        }
        if (dto.getStudyTime() != null) {
            progress.setStudyTime(dto.getStudyTime());
        }
        if (dto.getStatus() != null) {
            // 校验状态合法
            LearningStatus.fromCode(dto.getStatus());
            progress.setStatus(dto.getStatus());
        } else {
            // stepIndex 为 0-based；最后一步已掌握，回到起点则回到未开始
            if (progress.getTotalSteps() > 0 && progress.getStepIndex() >= progress.getTotalSteps() - 1) {
                progress.setStatus(LearningStatus.MASTERED.getCode());
            } else if (progress.getStepIndex() > 0) {
                progress.setStatus(LearningStatus.LEARNING.getCode());
            } else {
                progress.setStatus(LearningStatus.UNSTARTED.getCode());
            }
        }

        if (progress.getId() == null) {
            progressMapper.insert(progress);
            log.info("学习进度创建 | userId={} algoId={}", userId, dto.getAlgorithmId());
        } else {
            progressMapper.updateById(progress);
            log.info("学习进度更新 | userId={} algoId={} step={}", userId, dto.getAlgorithmId(), progress.getStepIndex());
        }

        return toVO(progress, algorithm);
    }

    @Override
    public ProgressStatsVO getStats() {
        Long userId = UserContext.getUserId();

        List<LearningProgress> all = progressMapper.selectList(
                new LambdaQueryWrapper<LearningProgress>()
                        .eq(LearningProgress::getUserId, userId));

        int unstarted = 0;
        int learning = 0;
        int mastered = 0;
        long totalStudyTime = 0;

        for (LearningProgress p : all) {
            LearningStatus status = LearningStatus.fromCode(p.getStatus());
            switch (status) {
                case LEARNING:
                    learning++;
                    break;
                case MASTERED:
                    mastered++;
                    break;
                default:
                    unstarted++;
            }
            if (p.getStudyTime() != null) {
                totalStudyTime += p.getStudyTime();
            }
        }

        ProgressStatsVO vo = new ProgressStatsVO();
        vo.setTotal(all.size());
        vo.setUnstarted(unstarted);
        vo.setLearning(learning);
        vo.setMastered(mastered);
        vo.setTotalStudyTime(totalStudyTime);
        return vo;
    }

    private ProgressVO toVO(LearningProgress progress, Algorithm algorithm) {
        ProgressVO vo = new ProgressVO();
        vo.setId(progress.getId());
        vo.setAlgorithmId(progress.getAlgorithmId());
        vo.setStatus(progress.getStatus());
        vo.setStepIndex(progress.getStepIndex());
        vo.setTotalSteps(progress.getTotalSteps());
        vo.setStudyTime(progress.getStudyTime());
        vo.setUpdateTime(progress.getUpdateTime());

        if (algorithm != null) {
            vo.setAlgorithmName(algorithm.getName());
            vo.setAlgorithmNameZh(algorithm.getNameZh());
            vo.setCategory(algorithm.getCategory());
            vo.setDifficulty(algorithm.getDifficulty());
            vo.setUrl(algorithm.getUrl());   // 新增：算法页路径，供“继续学习”跳转
        }

        return vo;
    }
}
