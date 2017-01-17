//
// Lapis Compiler
//
// Gulp it down good sonny! Yeah, you like that don't you:
//     gulp --silent
//
"use strict";
var clear = require('cli-clear');
clear();
console.log('Please wait..');

/**
 * Required packages
 */
var autoprefixer = require('gulp-autoprefixer'),
	bless        = require('gulp-bless'),
	browserSync  = require('browser-sync').create(),
	cleanCss     = require('gulp-clean-css'),
	colors       = require('colors'),
	compass      = require('compass-importer'),
	concat       = require('gulp-concat'),
	debug        = require('gulp-debug'),
	filter       = require('gulp-filter'),
	path         = require('path'),
	fs           = require('fs'),
	gulp         = require('gulp'),
	gutil        = require('gulp-util'),
	include      = require('gulp-include'),
	inquirer     = require('inquirer'),
	lapisconfig  = require('./lapisconfig.json'),
	override     = require('json-override'),
	sass         = require('gulp-sass'),
	size         = require('gulp-size'),
	sourcemaps   = require('gulp-sourcemaps'),
	babel        = require('gulp-babel'),
	uglify       = require('gulp-uglify'),
	watch        = require('gulp-watch'),
	through      = require('through2');

/**
 * Default modes, overriden by modes select.
 * Set in an 'everything off by default' style.
 */
let modes = {
	'minify': false,
	'sassStyle': 'expanded',
	'sourcemaps': false,
	'browserSync': false,
	'bless': false,
	'convertES6': true
};

let hasOverridenLapisConfig = false;
overrideLapisConfig();

/**
 * Intro
 */
clear();
echoFill('', 'cyan', 'white', 'bold');
echoFill(' Lapis Compiler', 'cyan', 'white', 'bold');
echoFill('', 'cyan', 'white', 'bold');
console.log('');

/**
 * Select modes for compilation
 */
gulp.task('modes', () => {
	const question = [{
		name: 'modes',
		type: 'list',
		message: 'Which modes would you prefer?',
		choices: [
			{
				name: 'Unminified',
				value: {
					'sourcemaps': true,
					'bless': true
				}
			},
			{
				name: 'Unminified + browser-sync',
				value: {
					'sourcemaps': true,
					'browserSync': true,
					'bless': true
				}
			},
			{
				name: 'Unminified + browser-sync - bless (debugging)',
				value: {
					'sourcemaps': true,
					'browserSync': true,
					'bless': false
				}
			},
			{
				name: 'Minified',
				value: {
					'minify': true,
					'sassStyle': 'compressed',
					'bless': true
				}
			},
			{
				name: 'Minified   + browser-sync',
				value: {
					'minify': true,
					'sassStyle': 'compressed',
					'browserSync': true,
					'bless': true
				}
			}
		],
		default: 4
	}];

	return inquirer.prompt(question).then(answer => {
		modes = override(modes, answer.modes, true);

		if (hasOverridenLapisConfig) {
			echoFill(" Found lapisconfig.json", 'blue', 'white', 'bold');
		}
		echoFill(' Running compiler from:', 'cyan', 'white', 'bold');
		console.log(' ' + process.cwd());
	});
});

/**
 * Compile CSS
 */
/*
gulp.task('css', () => {
	compileCSS();
});
*/
function compileCSS(css) {
	echoFill(' Change Event: Sass', 'magenta', 'white', 'bold');

	var compilation = gulp.src(css.src)
		// Sourcemaps init
		.pipe(modes.sourcemaps ? sourcemaps.init({
			//largeFile: true
		}) : gutil.noop())

		// Compile
		.pipe(sass({
				outputStyle: modes.sassStyle,
				precision: 8,
				importer: compass
			})
			.on('error', function(error) {
				echoFill(' Error!', 'red', 'white', 'bold');
				//sass.logError(error)
				console.log('File:'.red);
				console.log(error.relativePath + colourise(' - line' + ' ' + error.line, 'white'));
				console.log('Message:'.red);
				console.log(error.messageOriginal);
				console.log('');
			}))

		// Combine files together
		.pipe(concat(css.filename))

		// Autoprefixer
		.pipe(autoprefixer({
			browsers: ['IE 9', 'last 2 versions']
		}))

		// Bless (might not be wanted for unminified?)
		.pipe(modes.bless ? bless({
			// Allow @import rules within main compiled css file
			// rather than just leaving as a bunch of unreferenced files
			imports: true,
			suffix: '-chunk'
		}) : gutil.noop())
			.on('error', function(error) {
				echoFill(' Error!', 'red', 'white', 'bold');
				console.log('Message:'.red);
				console.log(error.reason);
				console.log('Snippet:'.red);
				console.log(error.source.substring(0, 160));
				console.log('');
			})

		// Minify
		.pipe(modes.minify ? cleanCss({
			advanced: false,
			roundingPrecision: 4,
			// Stop it from trying to minify files included by @import
			// because bless (above) splits files into @imports and it breaks.
			processImport: false,
			// Remove any forced special comments that start /*! .. (e.g. bootstrap)
			// Except for the very first one! e.g. company name..
			keepSpecialComments: 1, // current clean-css
			specialComments: 1 // clean-css v4 + (future proofing)
		}) : gutil.noop())

		// Sourcemaps (inline)
		.pipe(modes.sourcemaps ? sourcemaps.write() : gutil.noop())

		// Filesize output
		.pipe(size({
			showFiles: true,
			title: 'Created',
			pretty: true
		}))

		// 'Compiled' message
		.pipe(through.obj((chunk, enc, cb) => {
			echoFill(' Compiled', 'green', 'white', 'bold');
			console.log('');
			cb(null, chunk);
		}));

	// Save compiled file to each destination, whether single string or array
	if (typeof css.dest === 'string') {
		//console.log(process.cwd() + '/' + css.dest + '/' + css.filename);
		compilation.pipe(gulp.dest(css.dest));
	} else {
		for (var i = 0; i < css.dest.length; i++) {
			compilation.pipe(gulp.dest(css.dest[i]));
		}
	}

}

/**
 * Compile JS
 */
function compileJS(js) {
	echoFill(' Change Event: JS', 'blue', 'white', 'bold');

	var compilation = gulp.src(js.src)
		// Grab .js files
		//.pipe(filter('*.js'))

		// Allow //=include and //=require for .js files
		.pipe(include({
			debugIncludes: true
		}))
			.on('error', console.log)

		// Convert ES6 to ES2015 for better compatibility
		.pipe(modes.convertES6 ? babel({
			presets: ['es2015']
		}) : gutil.noop())
			.on('error', function(error) {
				echoFill(' Error!', 'red', 'white', 'bold');
				console.log('Message:'.red);
				console.log(error.message);
				console.log('Snippet:'.red);
				console.log(error.codeFrame);
				console.log('');
			})

		// Combine files together
		.pipe(concat(js.filename))

		// Minify
		.pipe(modes.minify ? uglify() : gutil.noop())
			.on('error', function(error) {
				echoFill(' Error!', 'red', 'white', 'bold');
				console.log('File:'.red);
				console.log(error.fileName);
				//console.log(error.cause.line); // this is the line number after concat so useless
				console.log('Message:'.red);
				console.log(error.cause.message);
				console.log('');
			})

		// Echo filesize for debugging
		.pipe(size({
			showFiles: true,
			title: 'Created',
			pretty: true
		}))

		// 'Compiled' message
		.pipe(through.obj((chunk, enc, cb) => {
			echoFill(' Compiled', 'green', 'white', 'bold');
			console.log('');
			cb(null, chunk);
		}));

	// Save compiled file to each destination, whether single string or array
	if (typeof js.dest === 'string') {
		compilation.pipe(gulp.dest(js.dest));
	} else {
		for (var i = 0; i < js.dest.length; i++) {
			console.log(js.dest[i]);
			compilation.pipe(gulp.dest(js.dest[i]));
		}
	}
}

/**
 * Start all watch tasks when 'modes' is completed
 */
gulp.task('nowMyWatchBegins', ['modes'], () => {
	echoFill(' Config:', 'cyan', 'white', 'bold');
	console.log(lapisconfig);
	echoFill(' Modes:', 'cyan', 'white', 'bold');
	console.log(modes);

	/**
	 * Check for user defined browser sync proxy, or it'll nae work
	 */
	if (modes.browserSync) {
		if (lapisconfig.browserSync === undefined ||
			lapisconfig.browserSync.proxy === undefined) {
			echoFill(' Woah there!', 'red', 'white', 'bold');
			console.log(' Browser sync requires a proxy url, please add a section to your lapisconfig.json with proxy url and any extra files to watch for changes - similar to:');
			console.log('{\n    "browserSync": {\n        "proxy": "sitename.dev",\n        "watch": [\n            "./build/img/**/*",\n        ]\n    }\n}');
			console.log('PS: You can use "[currentdirectory]" to incorporate the folder name into the url');
			return false;
		}

		/**
		 * Watches array for browserSync
		 * (Watching compiled files)
		 * Combine given dest/filename values for css, js plus browserSync watch as extras.
		 */
		let watches = [];
		for (let i = 0; i < lapisconfig.css.length; i++) {
			if (lapisconfig.css[i].dest !== undefined &&
				lapisconfig.css[i].filename !== undefined) {
				watches = watches.concat(lapisconfig.css[i].dest + '/' + lapisconfig.css[i].filename);
			}
		}
		for (let i = 0; i < lapisconfig.js.length; i++) {
			if (lapisconfig.js[i].dest !== undefined &&
				lapisconfig.js[i].filename !== undefined) {
				watches = watches.concat(lapisconfig.js[i].dest + '/' + lapisconfig.js[i].filename);
			}
		}
		if (modes.browserSync &&
			lapisconfig.browserSync !== undefined &&
			lapisconfig.browserSync.watch !== undefined) {
			watches = watches.concat(lapisconfig.browserSync.watch);
		}

		browserSync.init({
			proxy: lapisconfig.browserSync.proxy,
			open: 'local',
			files: watches,
			logLevel: "info",
			//logFileChanges: false, // Stop file change message(?)
			logPrefix: "Browser Sync Refresh",
			//injectChanges: false // Don't try to inject, just do a page refresh(?)
		});

		echoFill(' Watching (Browser Sync):', 'blue', 'white', 'bold');
		console.log(watches);
	}

	echoFill('', 'green', 'white', 'bold');
	echoFill(' Ready!', 'green', 'white', 'bold');
	echoFill('', 'green', 'white', 'bold');

	//gulp.watch(lapisconfig.css.watch, ['css']);
	/*
	lapisconfig.css.forEach(function(css) {
		gulp.watch(css, ['css']);
	});
	*/
	for (let i = 0; i < lapisconfig.css.length; i++) {
		setWatch(lapisconfig.css[i], compileCSS);
	}
	//gulp.watch(lapisconfig.js.watch, ['js']);
	for (let i = 0; i < lapisconfig.js.length; i++) {
		setWatch(lapisconfig.js[i], compileJS);
	}
});

/**
 * Change event watch
 * Extracted out to a separate function
 * to allow data to pass through to compileCSS
 */
function setWatch(target, compiler) {
	gulp.watch(target.watch).on('change', function(f) {
		compiler(target);
	});
}

/**
 * Start 'config' task running, and subsequently, 'modes, 'css' and 'js'.
 */
gulp.task('default', [
	'modes',
	'nowMyWatchBegins',
]);

/**
 * Load lapisconfig.json overrides file if exists in same directory as package.json
 *
 * Runs asynchronously but that should be okay.
 */
 //const lapisConfig = () => {
function overrideLapisConfig() {
	fs.stat('../../lapisconfig.json', function(err, stat) {
		if (err === null) {
			var lapisconfigOverrides = require('../../lapisconfig.json');
			lapisconfig = override(lapisconfig, lapisconfigOverrides, true);
			hasOverridenLapisConfig = true;
		} else {
			// Use default lapisconfig.json
			hasOverridenLapisConfig = false;
		}
		// Change to given directory
		process.chdir(lapisconfig.from);

		// Replace "[currentdirectory]" with folder name, if used.
		let currentdirectory = process.cwd().split(path.sep).pop();
		if (lapisconfig.browserSync != null &&
			lapisconfig.browserSync.proxy != null) {
			lapisconfig.browserSync.proxy = lapisconfig.browserSync.proxy
			.replace(/\[currentdirectory\]/g, currentdirectory);
		}
	});

	return null;
}

/**
 * Fill line with string
 * (Move to its own npm module when everything is ironed out)
 */
function echoFill(string, bg, fg, bold) {
	if (bold === undefined) {
		bold = false;
	} else {
		bold = true;
	}
	string = fillColumns(string);

	string = colourise(string, fg, bg);

	if (bold) {
		string = string.bold;
	}

	process.stdout.write(string);
	//process.stdout.write("\n");
}

// Nice things are nice.
function fillColumns(string) {
	if (string === undefined) string = '';

	var columnCoverage = process.stdout.columns;
	while (columnCoverage < string.length) {
		columnCoverage += process.stdout.columns;
	}

	var padding = '';
	for (var i = string.length; i < columnCoverage; i++) {
		padding += ' ';
	}
	return string + padding; // + '\n';
}

function colourise(string, fg, bg) {
	// https://github.com/Marak/colors.js#colors-and-styles
	if (bg == undefined) bg = null;
	switch (fg) {
		case 'black':
			string = string.black;
			break;
		case 'red':
			string = string.red;
			break;
		case 'green':
			string = string.green;
			break;
		case 'yellow':
			string = string.yellow;
			break;
		case 'blue':
			string = string.blue;
			break;
		case 'magenta':
			string = string.magenta;
			break;
		case 'cyan':
			string = string.cyan;
			break;
		case 'white':
			string = string.white;
			break;
		case 'grey':
			string = string.grey;
			break;
	}
	switch (bg) {
		case 'black':
			string = string.bgBlack;
			break;
		case 'red':
			string = string.bgRed;
			break;
		case 'green':
			string = string.bgGreen;
			break;
		case 'yellow':
			string = string.bgYellow;
			break;
		case 'blue':
			string = string.bgBlue;
			break;
		case 'magenta':
			string = string.bgMagenta;
			break;
		case 'cyan':
			string = string.bgCyan;
			break;
		case 'white':
			string = string.bgWhite;
			break;
		default:
			break;
	}
	return string;
}
