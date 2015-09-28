require('win-common')({useTestGlobals: true });

global.AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
// NOTE: install your credentials to ~/.aws/credentials

//[default]
//aws_access_key_id = xxx
//aws_secret_access_key = xxx
//
global.log = console.log.bind(console)
