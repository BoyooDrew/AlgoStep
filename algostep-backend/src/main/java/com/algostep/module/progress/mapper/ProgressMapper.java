package com.algostep.module.progress.mapper;

import com.algostep.module.progress.entity.LearningProgress;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ProgressMapper extends BaseMapper<LearningProgress> {
}
