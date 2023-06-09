const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const devMode = process.env.NODE_ENV !== "production";

module.exports = {
  externals: {
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ['babel-loader'],
      },
      {
        test: /\.css$/,
        use: [
          devMode ? 'style-loader' : MiniCssExtractPlugin.loader,
          'css-loader'
        ]
      },
      {
        test: /\.png$/,
        type: 'asset/resource'
      }
    ],
  },
  resolve: {
    extensions: ['*', '.js', '.jsx'],
  },
  entry: {
    index: {
      dependOn: 'songs',
      import: './src/index.jsx',
    },
    songs: './src/songs.json',
  },
  output: {
    path: path.resolve(__dirname, './public'),
    filename: '[name].js',
    assetModuleFilename: 'assets/[hash][ext][query]'
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
  },
  plugins: [].concat(devMode ? [] : [new MiniCssExtractPlugin()]),
};
