#! /usr/bin/env node
var shell = require('shelljs');

shell.exec('echo Starting Lapis Compiler..');
shell.exec('gulp --silent');

/*
var exec = require('child_process').exec;

exec('echo Starting Lapis Compiler..', function(error, stdout, stderr) {});
exec('gulp --silent', function(error, stdout, stderr) {});
*/
