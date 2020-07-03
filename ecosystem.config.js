module.exports = {
  apps: [
    {
      name: 'silkbot',
      script: 'index.js',
      watch: false,
      ignore_watch: [
        './node_modules',
        './cache',
        './db'
      ],
      env: {
        'NODE_ENV': 'production'
      },
      env_development: {
        'NODE_ENV': 'development'
      }
    }
  ]
};
