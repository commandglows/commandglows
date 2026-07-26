module.exports = {
  apps: [{
    name: "winglowz_site",
    cwd: "/home/claude/winglowz/winglowz_site",
    script: "bash",
    args: ["-lc", "pnpm exec astro dev --port 3001 --force"],
    env: {
      PORT: 3001
    },
    autorestart: true,
    max_restarts: 3,
    min_uptime: "10s",
    restart_delay: 2000,
    watch: false
  }]
};
