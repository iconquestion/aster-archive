const { loadConfig } = require("./config");
const { createLogger } = require("./logger");
const { createApp } = require("./app");
const { createServers } = require("./createServers");

// 进程入口只负责装配配置、应用和 server，再交给 server 层启动监听。
function main() {
    const config = loadConfig();
    const logger = createLogger(config.logsDir);
    const { app, level15 } = createApp({
        appOrigin: config.appOrigin,
        logger,
    });
    const servers = createServers({
        app,
        level15,
        config,
        logger,
    });

    servers.start();
}

if (require.main === module) {
    main();
}

module.exports = {
    main,
};
