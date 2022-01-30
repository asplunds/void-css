import { compileScope } from "./src/compiler/lexer";
import { Config, VoidCSSConfiguration } from "./src/config";
import { autoCalc, autoVar } from "./src/extensions/defaultExtensions";

function VoidCSS(config?: VoidCSSConfiguration) {
    const configInstance = new Config(config ?? {});

    return (css: string) => compileScope(css, configInstance, [autoVar(), autoCalc()]);
}

/* const compile = VoidCSS();

const css = `
body {
    test {
        color: red;
    }

    :not(:last-child) {
        color: green
    }
    * {

    }
}


`

console.log(compile(css)?.static); */

export default VoidCSS;