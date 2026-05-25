module.exports = {
  apps: [
    {
      name: "klarbot",
      cwd: "/var/www/klarapps-discord-bot",
      script: "dist/index.js",
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
