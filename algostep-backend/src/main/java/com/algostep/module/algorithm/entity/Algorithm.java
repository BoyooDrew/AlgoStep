package com.algostep.module.algorithm.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("algorithm")
public class Algorithm {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String name;

    private String nameZh;

    private String category;

    private String difficulty;

    /** 时间复杂度展示文案，如 O(n log n) */
    private String complexity;

    private String url;

    private String description;

    private Integer sortOrder;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}
