module.exports = {
  apps : [{
	  name: "feedme-prod",
    script: 'index.js',
    watch: '.',
	  instance_var: 'feedme-prod',
    ignore_watch : [".git", "node_modules", "error.log", "combined.log"],
	log_file: 'error.log',
  }],

  deploy : {
    production : {
      user : 'SSH_USERNAME',
      host : 'SSH_HOSTMACHINE',
      ref  : 'origin/master',
      repo : 'GIT_REPOSITORY',
      path : 'DESTINATION_PATH',
      'pre-deploy-local': '',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
