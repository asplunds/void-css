import VoidCSS from "../../../index";
import fs from "fs";
import { clientDevelopment } from "../../runtime/runtime";

export default function viteVoidCSS(...args: Parameters<typeof VoidCSS>) {
  const compiler = VoidCSS(...args);


  const plugin = {
    name: "void-css-plugin",
    async configResolved(config: any) {
      void config;
    },
    handleHotUpdate(context: any) {
      return void context;
    },
    load(id: string): any {
      if (/\.vcss(?:\?import)?$/.test(id)) {
        const content = fs.readFileSync(id, "utf8");
        return `
            var updateDynamicStyles = ${clientDevelopment(compiler(content), Buffer.from(id, "utf-8").toString("base64"), id)}
            export default updateDynamicStyles;
          `;
      }
    },
  }

  return plugin;
}