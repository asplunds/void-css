import path from "path";
import fs from "fs";
import { compileScope } from "../compiler/lexer";
const runtime = fs.readFileSync(path.join(__dirname, "./voidDom.js"), "utf-8");


export function clientDevelopment(compiled: ReturnType<typeof compileScope>, id: string, filePath: string) {
    return `(function() {
    var id = "vcss-${id}";
    var filePath = "${filePath.replace(/\\/g, "/")}";
    var compiled = ${JSON.stringify(compiled)}
    ${runtime}
    return voidCSS();
})();`;
}