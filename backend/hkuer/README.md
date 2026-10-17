# HKUer 后端

Java 21、Spring Boot 3.4、MyBatis-Plus、MySQL、Redis。完整初始化与启动流程见 [项目 README](../../README.md)。

在此目录运行 HkuerApplication 或执行：

```sh
mvn spring-boot:run
```

发布仓库默认从 ../../.local/mesh/application-local.properties 读取私有配置；也可通过 HKUER_LOCAL_CONFIG 指定。原工作区保留本机配置路径。先按根目录 README 配置 MySQL、Redis，再启动应用；Flyway 自动应用 src/main/resources/db/mesh/ 中的迁移。

```sh
mvn test
mvn -DskipTests package
```

完整测试需要专用测试库；无需数据库的测试命令见根目录 README。真实云服务测试默认跳过，必须显式开启。

Controller 接口沿用 Result，业务逻辑放在 Service，数据库查询放在 Mapper。新社区接口为 /mesh/*，管理员扩展为 /console/mesh/*。登录、点赞、收藏、评论、文件及原后台服务继续复用。

target/、私有配置、数据库文件和运行日志不进入仓库。
