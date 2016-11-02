//
// Myke's Magical Gulper. Gulp it down good sonny! Yeah, you like that.
//
// Includes (all installed via `npm install` which uses package.json)
var gulp       = require('gulp'),
	clear      = require('cli-clear'),
	inquirer   = require('inquirer'),
	watch      = require('gulp-watch'),
	postcss    = require('gulp-postcss'),
	sourcemaps = require('gulp-sourcemaps'),
	cleanCss   = require('gulp-clean-css'),
	colors     = require('colors'),
	concat     = require('gulp-concat'),
	uglify     = require('gulp-uglify'),
	size       = require('gulp-size'),
	gulpconfig = require('./gulpconfig.json');

var mode = 0;
/*
gulp.task('default', () => {
  const question = {
    message : 'Do you want to continue?(no)',
    default : false
  };

  return gulp.src('file')
    .pipe(prompt.confirm(question));
});
*/

gulp.task('mode', () => {
	const question = [{
			name: 'mode',
			type: 'list',
			message: 'Whaddya want?',
			choices: [
				{
					value: 1,
					name: 'Choose me'
				},
				{
					value: 2,
					name: 'No choose me'
				},
				{
					value: 3,
					name: 'PIKACHU'
				}
			],
			default: 0
	}];

	return inquirer.prompt(question).then(answer => {
		mode = answer.mode;
		//gulp.task('default', ['css', 'js']);
		//gulp.task('css');
			//cb();
	});
});

// Only runs when mode is completed
gulp.task('css', ['mode'], function() {
	console.log("hey let's do this, with mode: " + mode);
});

gulp.task('default', ['mode', 'css']);
