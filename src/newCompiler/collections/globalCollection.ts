import tokens from "../tokens/mod";
import Collection from "./utils/Collection";
import Rule from "./utils/Rule";

export default Collection("globals", [
    Rule("void", [tokens.global.void.whitespace]),
]);
