#! /usr/bin/env node
var child_process = require('child_process');
console.log('Starting Lapis Compiler..');
child_process.execSync('gulp --silent', {
	stdio: 'inherit'
});
