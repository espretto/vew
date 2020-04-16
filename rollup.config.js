
/**
 * produce fat-free javascript by tree-shaking and minification
 */
import { terser } from 'rollup-plugin-terser'
import resolve from '@rollup/plugin-node-resolve'
import babel from 'rollup-plugin-babel'

const { dependencies } = require('./package.json')
const external = Object.keys(dependencies || {})

export default {
  input: 'src/component.js',
  external,
  plugins: [
    resolve(),
    babel({
      exclude: 'node_modules/**'
    })
  ],
  output: [
    {
      file: 'dist/runtime.js',
      format: 'umd',
      name: 'Vew',
    },
    {
      file: 'dist/runtime.min.js',
      format: 'umd',
      name: 'Vew',
      plugins: [
        terser({
          compress: {
            ecma: 5,
            inline: 3,
            hoist_funs: true,
            hoist_props: true,
            sequences: false,
            toplevel: true,
            pure_funcs: ['isNative'],
            // make unofficial babel-plugin-transform-class work
            // top_retain: ['extend', 'create'],
            passes: 2,
            dead_code: true
          },
          output: {
            beautify: false,
            ascii_only: true,
            indent_level: 2,
            max_line_len: 8196,
            keep_quoted_props: true,
          },
          ecma: 5,
          toplevel: true,
          mangle: true,
          // make unofficial babel-plugin-transform-class work
          // mangle: { reserved: ['extend', 'create'] }
          ie8: true,
          safari10: true,
        })
      ]
    }
  ]
}
