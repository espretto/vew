
var webpack = require('webpack')

exports.devServer = function ({ host, port, base }) {
  return {
    devServer: {
      host,
      port,
      stats: 'errors-only',
      inline: true, // trigger full refresh when HMR fails
      hotOnly: true,
      contentBase: base,
      historyApiFallback: true,
    },
    plugins: [
      new webpack.HotModuleReplacementPlugin(),
    ]
  }
}


exports.babelLoader = function ({ include, exclude, options }) {
  return {
    module: {
      rules: [
        {
          test: /\.js$/,
          loader: 'babel-loader?' + JSON.stringify(options),
          include,
          exclude
        },
      ],
    },
  }
}


exports.cssLoader = function () {
  return {
    module: {
      rules: [
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        }
      ]
    }
  }
}

exports.uglify = function () {
  return {
    plugins: [
      new webpack.optimize.UglifyJsPlugin({
        compress: {
          warnings: false
        },
        sourceMap: true
      }),
    ],
  }
}

exports.imgLoader = function () {
  return {
    module: {
      rules: [
        {
          test: /\.(png|jpg|gif|svg)$/,
          loader: 'file-loader',
          options: {
            name: '[name].[ext]?[hash]',
          },
        },
      ],
    },
  }
}

exports.fontLoader = function () {
  return {
    module: {
      rules: [
        {
          test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
          loader: 'file-loader',
          options: {
            name: '[name].[ext]?[hash]',
          },
        },
      ],
    },
  }
}
       
