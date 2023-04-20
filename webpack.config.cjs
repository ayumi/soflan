const path = require('path');

module.exports = {
  externals: {
    // react: 'React',
    // 'react-dom': 'ReactDOM',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ['babel-loader'],
      },
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
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
  },
};
