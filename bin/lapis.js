#! /usr/bin/env node
var shell = require('shelljs');

shell.exec('echo Starting Lapis Compiler..');
shell.exec('gulp --silent');
