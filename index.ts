import { compileScope } from "./src/compiler/lexer";
import { Config, VoidCSSConfiguration } from "./src/config";
import { autoCalc, autoVar } from "./src/extensions/defaultExtensions";

function VoidCSS(config?: VoidCSSConfiguration) {
    const configInstance = new Config(config ?? {});

    return (css: string) => compileScope(css, configInstance, [autoVar(), autoCalc()]);
}


export default VoidCSS;