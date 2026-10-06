module.exports = {
    apps: [
        {
            name: "erp-api",
            script: "./src/server.js",
            instances: 1,
            autorestart: true,
            watch: false,
            env: {
                NODE_ENV: "production"
            }
        },
        {
            name: "erp-worker",
            script: "./src/workers/transferWorker.js",
            instances: 1,
            autorestart: true,
            watch: false,
            env: {
                NODE_ENV: "production"
            }
        }
    ]
};