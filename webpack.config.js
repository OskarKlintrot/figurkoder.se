var config = {
    entry: {
        js: [
          'babel-polyfill',
          './src/app.jsx'
        ],
        html: './index.html',
    },
    output: {
        path: __dirname,
        filename: 'bundle.js',
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loaders: [
                    'react-hot',
                    'babel?' + JSON.stringify({
                        presets: ["react", "es2015", "stage-1"],
                    })
                ],
            },
            {
                test: /\.jsx$/,
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

};


module.exports = config;