
var fs = require('fs')
var path = require('path')

function readFileJSON (filepath) {
  return JSON.parse(fs.readFileSync(filepath, { encoding: 'utf8' }))
}

var pkg = readFileJSON('package.json')
var babelrc = readFileJSON('\.babelrc')

Object.assign(babelrc, { cacheDirectory: './output/babelcache' })

module.exports = {

  context: path.join(__dirname, './src')

, entry: {
    js: './index.js'
  }

, output: {
    path: path.join(__dirname, './dist')
  , filename: pkg['main']
  }

, module: {
    loaders: [
      { test: /\.(js|jsx)$/
      , exclude: /node_modules/
      , loaders: [
          'babel-loader?' + JSON.stringify(babelrc)
        ]
      }
    ]
  }

, resolve: {
    extensions: ['', '.js', '.jsx']
  , modules: [
      path.resolve('./src')
    , 'node_modules'
    ]
  }
}
