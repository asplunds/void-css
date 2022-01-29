module.exports = function (context, options) {
    return {
        name: 'void-css-plugin',
        configureWebpack(config, isServer, utils) {

            return {
                module: {
                    rules: [
                        {
                            test: /\.(void|vcss)(\?[^\s]*)?$/,
                            use: [
                                {
                                    loader: "void-css/webpack/loader.js",
                                    options,
                                }
                            ],
                        },
                    ],
                }
            };
        },
    };
};