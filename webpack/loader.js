const { default: VoidCSS } = require("../index.js");
const { clientDevelopment } = require("../src/runtime/runtime.js");

module.exports = function loader(source) {
    // Custom loader logic
    const id = this.resourcePath;
    const compiler = VoidCSS(this.getOptions());
    const compiled = (() => {

        try {
            const compiled = clientDevelopment(compiler(source), Buffer.from(id, "utf-8").toString("base64"), id)
            
            return `var updateDynamicStyles = ${compiled}
                    export default updateDynamicStyles;`;
        } catch (e) {
            console.error(e);
            return `
                export default function voidCssDisplayError() {
                    /* View console for detailed error */
                    var error = \`${e.toString().replace(/\x1B[[(?);]{0,2}(;?\d)*./g, '')}\`;
                    throw SyntaxError(\`Failed to compile Void CSS. See console for details.\nat ${id.replace(/\\/g, "/")}\`);

                    return {};
                }
            `;
        }
    })();

    return compiled;
}