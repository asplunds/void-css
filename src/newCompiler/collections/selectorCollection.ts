import tokens from "../tokens/mod";
import Collection from "./utils/Collection";
import Rule from "./utils/Rule";

export default Collection("selectors", [
    Rule("class", [
        tokens.selector.class.initiator,
        tokens.selector.class.name,
    ]),
]);
