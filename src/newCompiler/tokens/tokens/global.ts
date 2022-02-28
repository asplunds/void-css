import { selectorName } from "./common";
import Token from "../utils/Token";

export default {
    void: {
        whitespace: Token(/^\s+/, {
            name: "global.whitespace",
            domain: "global",
            attributes: ["void"],
        }),
    },
} as const;
