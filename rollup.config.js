
/**
 * produce fat-free javascript by tree-shaking and minification
 */
import { terser } from 'rollup-plugin-terser'
import resolve from '@rollup/plugin-node-resolve'
import babel from 'rollup-plugin-babel'

const { dependencies } = require('./package.json')
const external = Object.keys(dependencies || {})

function createConfig ({ input, output }) {

  console.assert(output.endsWith('.js'))
  const minified = output.slice(0, -3) + '.min.js'
  const extensions = ['.js', '.ts']

  return {
    input,
    external,
    plugins: [
      resolve({
        jsnext: true,
        extensions,
      }),
      babel({
        exclude: 'node_modules/**',
        extensions,
      })
    ],
    output: [
      {
        file: output,
        format: 'umd',
        name: 'Vew',
      },
      {
        file: minified,
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
}

export default [
  createConfig({
    input: 'src/component.ts',
    output: 'dist/runtime.js'
  }),
  createConfig({
    input: 'src/template.ts',
    output: 'dist/buildtime.js'
  }),
  createConfig({
    input: 'src/index.ts',
    output: 'dist/vew.js'
  })
]
