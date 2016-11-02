//
// Azure Compiler. Gulp it down good sonny! Yeah, you like that don't you.
//
var gulp         = require('gulp'),
	clear        = require('cli-clear'),
	colors       = require('colors'),
	inquirer     = require('inquirer'),
	browserSync  = require('browser-sync').create(),
	watch        = require('gulp-watch'),
	gutil        = require('gulp-util'),
	sourcemaps   = require('gulp-sourcemaps'),
	sass         = require('gulp-sass'),
	compass      = require('compass-importer'),
	concat       = require('gulp-concat'),
	autoprefixer = require('gulp-autoprefixer'),
	bless        = require('gulp-bless'),
	cleanCss     = require('gulp-clean-css'),
	size         = require('gulp-size'),
	colors       = require('colors'),
	uglify       = require('gulp-uglify'),
	size         = require('gulp-size'),
	override     = require('json-override'),
	fs           = require('fs'),
	azureconfig  = require('./azureconfig.json');

/**
 * Default modes, overrided by modes select
 */
let modes = {
	'minify': false,
	'sassStyle': 'expanded',
	'sourcemaps': true,
	'browserSync': false
};

let hasOverridenAzureConfig = false;
overrideAzureConfig();

/**
 * Intro
 */
clear();
echoFill('', 'cyan', 'white', 'bold');
echoFill(' Azure Compiler', 'cyan', 'white', 'bold');
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
				}
			},
			{
				name: 'Minified',
				value: {
					'minify': true,
					'sassStyle': 'compressed',
					'sourcemaps': false
				}
			},
			{
				name: 'Minified + browser-sync',
				value: {
					'minify': true,
					'sassStyle': 'compressed',
					'sourcemaps': false,
					'browserSync': true
				}
			}
		],
		default: 2
	}];

	return inquirer.prompt(question).then(answer => {
		modes = override(modes, answer.modes, true);

		if (hasOverridenAzureConfig) {
			echoFill(" Found azureconfig.json", 'blue', 'white', 'bold');
		}
		echoFill(' Running compiler from:', 'cyan', 'white', 'bold');
		console.log(' ' + process.cwd());
	});
});

/**
 * Compile CSS
 */
gulp.task('css', () => {
	echoFill(" Event", 'blue', 'white', 'bold');
	var css = gulp.src(azureconfig.css.src)
		// Sourcemaps init
		.pipe(modes.sourcemaps ? sourcemaps.init() : gutil.noop())

		// Compile
		.pipe(sass({
				outputStyle: modes.sassStyle,
				precision: 8,
				importer: compass
			})
			.on('error', sass.logError))

		// Concat to filename
		.pipe(concat(azureconfig.css.filename))

		// Autoprefixer
		.pipe(autoprefixer({
			browsers: ['IE 9', 'last 2 versions']
		}))

		// Bless (might not be wanted for unminified?)
		.pipe(bless({
			// Allow @import rules rather than splitting to separate files
			imports: true
		}))

		// Minify the CSS if in production
		.pipe(modes.minify ? cleanCss({
			advanced: false,
			roundingPrecision: 4,
			// Stop it from trying to minify files included by @import
			// because bless (above) splits files into @imports and it breaks.
			processImport: false
		}) : gutil.noop())

		// Sourcemaps (inline)
		.pipe(modes.sourcemaps ? gutil.noop() : sourcemaps.write())

		// Filesize output
		.pipe(size({
			showFiles: true,
			title: 'Output'
		}));

	// Save compiled file to each destination, whether single string or array
	if (typeof azureconfig.css.dest === 'string') {
		//console.log(process.cwd() + '/' + azureconfig.css.dest + '/' + azureconfig.css.filename);
		css.pipe(gulp.dest(azureconfig.css.dest));
	} else {
		for (var i = 0; i<azureconfig.css.dest.length; i++) {
			css.pipe(gulp.dest(azureconfig.css.dest[i]));
		}
	}
});

/**
 * Compile JS
 *
 * 'js' runs when 'modes' is completed
 */

gulp.task('js', ['modes'], () => {
	console.log(azureconfig.js);
});

/**
 * Start all watch tasks when 'modes' is completed
 */
gulp.task('nowMyWatchBegins', ['modes'], () => {
	echoFill(' Config:', 'cyan', 'white', 'bold');
	console.log(azureconfig.css);
	echoFill(' Modes:', 'cyan', 'white', 'bold');
	console.log(modes);

	/**
	 * Check for user defined browser sync proxy, or it'll nae work
	 */
	if (modes.browserSync) {
		if (azureconfig.browserSyncProxy == null) {
			echoFill(' Warning', 'red', 'white', 'bold');
			console.log(' Browser sync requires a proxy url, please add something similar to your azureconfig.json:');
			console.log('"browserSyncProxy": "sitename.dev"');
			return false;
		}
	}

	let watches = override(azureconfig.css.watch, azureconfig.js.watch, true);
	browserSync.init({
		proxy: azureconfig.browserSyncProxy,
		open: 'local',
		files: watches,
		logPrefix: "Browser-sync",
		//injectChanges: false // Don't try to inject, just do a page refresh
	});

	echoFill('', 'green', 'white', 'bold');
	echoFill(' Ready!', 'green', 'white', 'bold');
	echoFill('', 'green', 'white', 'bold');

	gulp.watch(azureconfig.css.watch, ['css']);
	//gulp.watch('./src/js/**/*.js', ['js']);
});

/**
 * Start 'config' task running, and subsequently, 'modes, 'css' and 'js'.
 */
gulp.task('default', [
	'modes',
	'nowMyWatchBegins',
]);


/**
 * Load azureconfig.json overrides file if exists in same directory as package.json
 *
 * Runs asynchronously but that should be okay.
 */
 //const azureConfig = () => {
function overrideAzureConfig() {
	fs.stat('../../azureconfig.json', function(err, stat) {
		if (err == null) {
			var azureconfigOverrides = require('../../azureconfig.json');
			azureconfig = override(azureconfig, azureconfigOverrides, true);
			hasOverridenAzureConfig = true;
		} else {
			// Use default azureconfig.json
			hasOverridenAzureConfig = false;
		}
		// Change to given directory
		process.chdir(azureconfig.css.from);
	});
	return null;
}


/**
 * Fill line with string
 * (Move to its own npm module when everything is ironed out)
 */
function echoFill(string, bg, fg, bold) {
	if (typeof bold == 'undefined') {
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
	if (typeof string == 'undefined') string = '';

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
	}
	return string;
}
