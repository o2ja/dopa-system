// cd print-bridge; pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "dopa-bridge",
      script: "index.js",
      cwd: __dirname,
      autorestart: true,
      restart_delay: 3000,
      max_memory_restart: "200M",
      time: true,
      out_file: "logs/bridge.out.log",
      error_file: "logs/bridge.err.log",
      merge_logs: true,
    },
  ],
};
