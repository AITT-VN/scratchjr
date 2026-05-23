var WebpackNotifierPlugin = require("webpack-notifier");
const path = require("path");
const webpack = require("webpack");
const { execSync } = require("child_process");
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const mode = process.argv.find(arg => arg.startsWith('--mode=')).split('=')[1];
const isProduction = mode === 'production';
const sqlJsPath = path.dirname(require.resolve("sql.js/package.json"));

function safeGit(cmd, fallback) {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch (e) {
    return fallback;
  }
}

const BUILD_COMMIT = safeGit("git rev-parse --short HEAD", "unknown");
const BUILD_DATE = new Date().toISOString();

const babelLoaderOptions = {
  presets: [
    ["@babel/preset-env", {
      targets: {
        chrome: "60",
        firefox: "60",
        safari: "11"
      },
      bugfixes: true,
    }]
  ]
};

module.exports = {
  resolve: {
    fallback: {
      path: require.resolve("path-browserify"),
      fs: require.resolve("browserify-fs"),
      stream: require.resolve("stream-browserify"),
      crypto: require.resolve("crypto-browserify"),
      vm: require.resolve("vm-browserify")
    },
  },
  devtool: isProduction ? false : "source-map",
  entry: {
    app: "./src/entry/app.js",
  },
  output: {
    path: __dirname + "/src/build/bundles",
    filename: "[name].bundle.js",
  },
  performance: {
    hints: false,
  },
  watchOptions: {
    ignored: ["node_modules", "src/build/**/*"],
  },
  module: {
    rules: [
      {
        test: /\.wasm$/,
        type: "javascript/auto",
      },
      {
        test: /\.js$/,
        include: /node_modules/,
        loader: "strip-sourcemap-loader",
        // options: {
        //     // For `underscore` library, it can be `_.map map` or `_.map|map`
        //     exposes: "strip-sourcemap-loader",
        //   },
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: babelLoaderOptions,
        },
      },
      {
        test: /\.js$/,
        include: [sqlJsPath],
        use: {
          loader: "babel-loader",
          options: babelLoaderOptions,
        },
      },
    ],
  },
  plugins: [
    // new BundleAnalyzerPlugin(),
    new webpack.DefinePlugin({
      __BUILD_COMMIT__: JSON.stringify(BUILD_COMMIT),
      __BUILD_DATE__: JSON.stringify(BUILD_DATE),
    }),
    new WebpackNotifierPlugin({
      title: "ScratchJr",
      alwaysNotify: true,
    }),
    // new FilerWebpackPlugin(),
  ],
};
