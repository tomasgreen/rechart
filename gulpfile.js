var gulp = require('gulp'),
	rename = require('gulp-rename'),
	streamify = require('gulp-streamify'),
	uglify = require('gulp-uglify'),
	concat = require('gulp-concat'),
	minifyCSS = require('gulp-minify-css'),
	argv = require('yargs').argv,
	less = require('gulp-less'),
	debug = (argv.debug !== undefined),
	serve = (argv.server !== undefined),
	watch = (argv.watch !== undefined),
	spawn = require('child_process').spawn,
	version = debug ? 'dev' : require('./package.json').version,
	node;
/*
	watch
*/
gulp.task('watch', function () {
	gulp.watch('./src/js/**/*.js', ['js']);
	gulp.watch('./src/style/**/*.less', ['less']);
	gulp.watch('./server.js', ['serve']);
});
/*
	js
*/
gulp.task('js', function () {
	gulp.src('./src/js/*.js')
		.pipe(concat('rechart-' + version + '.js'))
		.pipe(gulp.dest('./build/'))
		.pipe(gulp.dest('./examples/static/'))
		.pipe(rename('rechart-' + version + '.min.js'))
		.pipe(streamify(uglify()))
		.pipe(gulp.dest('./build/'))
		.pipe(gulp.dest('./examples/static/'));
});
/*
	css
*/
gulp.task('less', function () {
	gulp.src('./src/style/*.less')
		.pipe(less())
		.pipe(rename('rechart-' + version + '.css'))
		.pipe(gulp.dest('./build/'))
		.pipe(gulp.dest('./examples/static/'))
		.pipe(rename('rechart-' + version + '.min.css'))
		.pipe(minifyCSS({
			keepSpecialComments: 0
		}))
		.pipe(gulp.dest('./build/'))
		.pipe(gulp.dest('./examples/static/'));
});

var run = ['js', 'less'];
if (watch) {
	run.push('watch');
}
if (serve) {
	run.push('serve');
	gulp.task('serve', function () {
		if (node) node.kill();
		node = spawn('node', ['./server.js'], {
			stdio: 'inherit'
		});
	});
}
gulp.task('default', run);
/*
	not sure what `on exit` does compared to `on SIGINT`
*/
process.on('exit', function () {
	if (node) node.kill();
});
process.on('SIGINT', function () {
	/* http://stackoverflow.com/questions/10021373/what-is-the-windows-equivalent-of-process-onsigint-in-node-js */
	console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");
	if (node) node.kill();
	process.exit();
});