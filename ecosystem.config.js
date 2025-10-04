module.exports = {
  apps: [{
    name: 'datakiln-backend',
    script: './backend/dist/index.js',
    instances: 'max', // Use all available CPU cores
    exec_mode: 'cluster', // Cluster mode for load balancing
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '0.0.0.0',
      DATA_DIR: './backend/data',
      LOG_DIR: './backend/logs',
      FILESYSTEM_ROOT: './backend/data/sandboxes',
      ALLOWED_ORIGINS: 'https://datakiln.example.com',
      API_KEY_REQUIRED: 'true',
      MAX_PARALLEL_WORKFLOWS: '10',
      DEFAULT_TIMEOUT_MS: '300000',
      MAX_MEMORY_MB: '2048',
      PUPPETEER_HEADLESS: 'true',
      PUPPETEER_ARGS: '--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage,--disable-gpu,--disable-software-rasterizer'
    },
    // Production environment variables (override with actual values)
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      LOG_LEVEL: 'info'
    },
    // Development environment
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000,
      LOG_LEVEL: 'debug'
    },
    // Error handling and restart
    max_memory_restart: '1G', // Restart if memory usage exceeds 1GB
    restart_delay: 4000, // Delay between restarts
    max_restarts: 10, // Maximum restart attempts
    min_uptime: '10s', // Minimum uptime before considering stable

    // Logging
    log_file: './backend/logs/combined.log',
    out_file: './backend/logs/out.log',
    error_file: './backend/logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,

    // Process management
    pid_file: './backend/logs/pm2.pid',
    watch: false, // Don't watch files in production
    ignore_watch: [
      'node_modules',
      'logs',
      'data',
      '*.log'
    ],

    // Health monitoring
    health_check: {
      enabled: true,
      url: 'http://localhost:3000/health',
      interval: 30000, // 30 seconds
      timeout: 10000, // 10 seconds
      fails: 3 // Number of fails before restart
    },

    // Resource limits
    node_args: [
      '--max-old-space-size=2048', // 2GB heap limit
      '--max-new-space-size=1024'  // 1GB new space limit
    ],

    // Environment file
    env_file: './.env',

    // User and group (for security)
    uid: 'datakiln',
    gid: 'datakiln'
  }],

  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/datakiln.git',
      path: '/var/www/datakiln',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};