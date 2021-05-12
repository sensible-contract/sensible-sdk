const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
module.exports = {
  mode: "production",
  entry: "./src/index.browser.js",
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
      process: "process",
    }),
  ],
  output: {
    filename: "sensible.browser.min.js",
    path: path.resolve(__dirname, "dist"),
    library: {
      name: "sensible",
      type: "umd",
    },
    clean: true,
  },
  resolve: {
    fallback: {
      buffer: require.resolve("buffer/"),
      zlib: require.resolve("browserify-zlib"),
      http: require.resolve("stream-http"),
      https: require.resolve("https-browserify"),
      stream: require.resolve("stream-browserify"),
      crypto: require.resolve("crypto-browserify"),
      path: require.resolve("path-browserify"),
      os: require.resolve("os-browserify/browser"),
    },
    alias: {},
  },
  externals: {
    tls: "empty",
    fs: "empty",
    net: "empty",
  },
};
