package com.algostep;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.algostep.module.**.mapper")
public class AlgoStepApplication {

    public static void main(String[] args) {
        SpringApplication.run(AlgoStepApplication.class, args);
    }
}
