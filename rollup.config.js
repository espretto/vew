
/**
 * produce fat-free javascript by tree-shaking and minification
 */

var babel = require('rollup-plugin-babel')
var babelrc = require('babelrc-rollup').default

var pkg = require('./package.json')
var external = Object.keys(pkg.dependencies || {})

var ccBanner =
[ '/** @define {boolean} */'
, 'var DEBUG = true;'
// , 'var DEBUG = false;'
].join('\n')

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
    , banner: ccBanner
    // , sourceMap: true
    }
  , { dest: pkg['jsnext:main']
    , format: 'es'
      // sourceMap: true
    }
  ]
};
