
var babel = require('rollup-plugin-babel')
var babelrc = require('babelrc-rollup').default

var pkg = require('./package.json')
var external = Object.keys(pkg.dependencies || {})

module.exports = {

  entry: 'src/index.js'
  
, plugins: [
    babel(babelrc())
  ]

, external: external

, targets: [
    { dest: pkg['main']
    , format: 'iife'
    , moduleName: 'Vew'
    //, sourceMap: true
    }
  , { dest: pkg['jsnext:main']
    , format: 'es'
      // sourceMap: true
    }
  ]
};
