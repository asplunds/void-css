import { selectorName } from "./common";
import Token from "../utils/Token";

export default {
    class: {
        initiator: Token(/^\./, {
            name: "class.initiator",
            domain: "selector",
        }),
        name: Token(selectorName, {
            name: "class.name",
            domain: "selector",
        }),
    },
} as const;
