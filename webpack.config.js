
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
  return path.join(__dirname, dir)
}

/* -----------------------------------------------------------------------------
 * configs
 */
const parts = require('./webpack.parts')
const pkg = readFileJSON('package.json')
const babelrc = readFileJSON('\.babelrc')

delete babelrc.comments // for lack of comments in json
Object.assign(babelrc, { cacheDirectory: './output/babelcache' })

const PATHS = {
  app: resolve('src'),
  build: resolve('build')
}

/* -----------------------------------------------------------------------------
 * common webpack configuration
 */
const commonConfig = merge([
  {
    entry: {
      vew: PATHS.app,
    },
    output: {
      path: PATHS.build,
      filename: '[name].js',
    }
  },
  parts.babelLoader({ include: [ PATHS.app ], exclude: /node_modules/, options: babelrc }),
  parts.cssLoader(),
  parts.imgLoader(),
  parts.fontLoader(),
])

/* -----------------------------------------------------------------------------
 * development webpack configuration
 */
const developmentConfig = merge([
  {
    entry: {
      vew: path.join(PATHS.app, 'index_hmr.js')
    },
    plugins: [
      new HtmlWebpackPlugin({
        title: 'Vew Playground',
        template: path.join(PATHS.app, 'index_hmr.ejs')
      }),
      new webpack.NamedModulesPlugin()
    ]
  },
  parts.devServer({
    host: process.env.HOST,
    port: process.env.PORT,
    base: PATHS.app
  })
])

/* -----------------------------------------------------------------------------
 * production webpack configuration
 */
const productionConfig = merge([
  parts.uglify()
])

module.exports = function(env) {
  process.env.BABEL_ENV=env
  switch (env) {
    case 'development': return merge(commonConfig, developmentConfig)
    case 'production' : return merge(commonConfig, productionConfig)
  }
}
