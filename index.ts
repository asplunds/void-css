import { compileScope } from "./src/compiler/lexer";
import { Config, VoidCSSConfiguration } from "./src/config";
import { autoCalc, autoVar } from "./src/extensions/defaultExtensions";

function VoidCSS(config?: VoidCSSConfiguration) {
    const configInstance = new Config(config ?? {});

    return (css: string) =>
        compileScope(css, configInstance, [autoVar(), autoCalc()]);
}

/* const compile = VoidCSS();

const css = `

@media screen and (max-width: 992px) {
    @media screen and (max-width: 992px) {
        .test {
            background: green
        }
    }
}



`;

console.log(compile(css)?.static); */

export default VoidCSS;
