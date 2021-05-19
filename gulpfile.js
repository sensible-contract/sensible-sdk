const ts = require("gulp-typescript");
const tsProject = ts.createProject("tsconfig.json");

const gulp = require("gulp");
const browserify = require("browserify");
const source = require("vinyl-source-stream");
const tsify = require("tsify");
const watchify = require("watchify");
const gutil = require("gulp-util");
const uglify = require("gulp-uglify");
const sourcemaps = require("gulp-sourcemaps");
const buffer = require("vinyl-buffer");
const clean = require("gulp-clean"); //清理文件或文件夹
const standalonify = require("standalonify");
var merge = require("merge2");
gulp.task("clean", function () {
  return gulp.src("dist/*", { read: false }).pipe(clean());
});

gulp.task("tsc", function () {
  var tsResult = tsProject.src().pipe(tsProject());
  return merge([
    tsResult.dts.pipe(gulp.dest("dist")),
    tsResult.js.pipe(gulp.dest("dist")),
  ]);
});
gulp.task("copy_js", function () {
  return gulp
    .src("./src/common/*.js", { base: "./src" })
    .pipe(gulp.dest("dist"));
});

gulp.task("copy_bcp01_contact", function () {
  return gulp
    .src("./src/bcp01/contract-desc/*", { base: "./src" })
    .pipe(gulp.dest("dist"));
});

gulp.task("copy_bcp02_contact", function () {
  return gulp
    .src("./src/bcp02/contract-desc/*", { base: "./src" })
    .pipe(gulp.dest("dist"));
});

gulp.task("browserify", function () {
  return browserify({
    basedir: ".",
    debug: true,
    entries: ["src/index.browser.ts"],
    cache: {},
    packageCache: {},
  })
    .plugin(tsify)
    .plugin(standalonify, { name: "sensible" })
    .bundle()
    .pipe(source("sensible.browser.min.js"))
    .pipe(buffer())
    .pipe(
      sourcemaps.init({
        loadMaps: true,
      })
    )
    .pipe(uglify())
    .pipe(sourcemaps.write("./"))
    .pipe(gulp.dest("dist"));
});

gulp.task(
  "default",
  gulp.series(
    "clean",
    "tsc",
    "copy_js",
    "copy_bcp01_contact",
    "copy_bcp02_contact",
    "browserify"
  )
);
