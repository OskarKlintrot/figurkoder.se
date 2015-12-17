var config = {
    entry: {
        js: [
          'babel-polyfill',
          './src/app/app.jsx'
        ],
        html: './index.html',
    },
    output: {
        path: __dirname,
        filename: 'app.js',
    },
    module: {
        preLoaders: [
            {
                test: /\.(js|jsx)$/,
                loader: 'eslint-loader',
                exclude: /node_modules/,
            },
        ],
        loaders: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                loaders: [
                    'react-hot',
                    'babel?' + JSON.stringify({
                        presets: ["react", "es2015", "stage-1"],
                    })
                ],
            },
            {
                test: /\.html$/,
                loader: "file?name=[name].[ext]",
            },
        ],
    },
    resolve: {
        extensions: ['', '.js', '.jsx'],
        root: __dirname,
    },
    devtool: 'source-map',
    eslint: {
        configFile: '.eslintrc'
    },
};
module.exports = config;
