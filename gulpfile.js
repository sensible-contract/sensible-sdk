const ts = require("gulp-typescript");
const tsProject = ts.createProject("tsconfig.json");
const typedoc = require("gulp-typedoc");
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
gulp.task("copy_file", function () {
  return gulp
    .src(["./src/**/*.js", "./src/**/*.json"], { base: "./src" })
    .pipe(gulp.dest("dist"));
});
gulp.task("browserify", function () {
  tsProject.config.exclude = "";
  return browserify({
    basedir: ".",
    debug: true,
    entries: ["src/index.browser.ts"],
    cache: {},
    packageCache: {},
    // fullPaths: true,
  })
    .plugin(tsify, tsProject.config)
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

gulp.task("typedoc", function () {
  return gulp.src(["src/**/*.ts"]).pipe(
    typedoc({
      entryPoints: ["./src/index.ts"],
      out: "./docs",
      name: "sensible-sdk",
      tsconfig: "tsconfig.json",
      excludePrivate: true,
    })
  );
});
gulp.task(
  "default",
  gulp.series(
    "clean",
    "tsc",
    "copy_file",
    "browserify"
    // "typedoc"
  )
);
