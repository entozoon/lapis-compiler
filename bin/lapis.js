#! /usr/bin/env node
var path = require('path');
var shelljs = require('shelljs');

// Inspired by https://gist.github.com/jakub-g/a128174fc135eb773631
function cd(dir) {
	dir = path.resolve(dir)
	shelljs.cd(dir);

	var cwd = path.resolve(process.cwd());
	if (cwd != dir) {
		var msg = 'Unable to change directory to ' + dir;
		console.error(msg);
		throw new Error(msg);
	}
}

function exec(command, env) { // nee execSyncPrintOutput()
  env = env || process.env;
  try {
    return require('child_process').execSync((command), {
      stdio: 'inherit',
      env: env
    });
  } catch (e) {
    __handleExecFailure(command, e);
  }
}

cd('node_modules/lapis-compiler');
exec('gulp --silent');
