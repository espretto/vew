
const fs = require('fs')
const path = require('path')
const merge = require('webpack-merge')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')

/* -----------------------------------------------------------------------------
 * helpers
 */
function readFileJSON (filepath) {
  return JSON.parse(fs.readFileSync(filepath, { encoding: 'utf8' }))
}

function resolve (dir) {
  return path.resolve(__dirname, dir)
}

/* -----------------------------------------------------------------------------
 * configs
 */
const parts = require('./webpack.parts')
const pkg = readFileJSON('package.json')
const babelrc = readFileJSON('\.babelrc')

Object.assign(babelrc, { cacheDirectory: '.tmp/babel' })

const PATHS = {
  source: resolve('src'),
  test: resolve('test'),
  public: resolve('dist')
}

/* -----------------------------------------------------------------------------
 * common webpack configuration
 */
const commonConfig = merge([
  {
    entry: {
      vew: './src/index.js'
    },
    output: {
      path: PATHS.public,
      filename: '[name].js',
    },
    resolve: {
      extensions: ['.js'],
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          include: [ PATHS.source, PATHS.test ],
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: babelrc
          }
        }
      ]
    },
    plugins: []
  }
])

/* -----------------------------------------------------------------------------
 * development webpack configuration
 */
const TerserPlugin = require('terser-webpack-plugin')
const developmentConfig = merge([
  {
    mode: 'development',
    entry: {
      vew: path.join(PATHS.test, 'repl.js')
    },
    devtool: 'source-map', // 'eval', 'source-map', 'nosources-source-map'
    plugins: [
      new HtmlWebpackPlugin({
        title: 'Vew Playground',
        template: path.join(PATHS.test, 'repl.ejs')
      }),
      new webpack.NamedModulesPlugin()
    ],
    optimization: {
      minimize: false,
      minimizer: [
        new TerserPlugin({
          cache: '.tmp/terser-webpack-plugin/',
          terserOptions: {
            compress: {
              sequences: false,
              pure_funcs: ['isNative'],
              toplevel: true,
              top_retain: ['extend', 'create'],
              passes: 2
            },
            output: {
              ecma: 5,
              beautify: true,
              ascii_only: true,
              indent_level: 2,
              max_line_len: 8196,
              keep_quoted_props: true,
            },
            mangle: {
              reserved: ['extend', 'create']
            },
            ie8: true,
            safari10: true,
          }
        })
      ],
      usedExports: true,
      concatenateModules: true,
    }
  },
  parts.cssLoader(), 
  parts.devServer({ host: process.env.HOST, port: process.env.PORT })
])

/* -----------------------------------------------------------------------------
 * production webpack configuration
 */
const productionConfig = merge([
  {
    mode: 'production',
    entry: {
      runtime: path.join(PATHS.source, 'component.js'),
      buildtime: path.join(PATHS.source, 'template.js')
    },
    output: {
      filename: '[name].min.js',
    },
    optimization: {
      minimize: false,
      minimizer: [
        new TerserPlugin({
          cache: '.tmp/terser-webpack-plugin/',
          terserOptions: {
            compress: {
              sequences: false,
            },
            output: {
              ecma: 5,
              ascii_only: true,
              max_line_len: 8196,
              keep_quoted_props: true,
            },
            ie8: true,
            safari10: true,
          }
        })
      ]
    }
  }
])

module.exports = function(env) {
  process.env.BABEL_ENV=env
  switch (env) {
    case 'development': return merge(commonConfig, developmentConfig)
    case 'production' : return merge(commonConfig, productionConfig)
  }
}
