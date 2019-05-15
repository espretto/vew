
var webpack = require('webpack')

exports.devServer = function ({ host, port }) {
  return {
    devServer: {
      host,
      port,
      stats: 'errors-only',
      inline: true, // trigger full refresh when HMR fails
      hotOnly: true,
      compress: true, // gzip compression
      historyApiFallback: true,
    },
    plugins: [
      new webpack.HotModuleReplacementPlugin(),
    ]
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

/*
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
       
*/