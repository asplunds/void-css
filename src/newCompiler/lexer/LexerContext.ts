import { match, poke } from "./entrypoint";

type Match = ReturnType<typeof match>;
export default class LexerContext {
    private _cursor: number = 0;
    private _tokens: Match[] = [];
    constructor(private _input: string) {}

    tokenize(match: Match) {
        this._tokens.push(match);
        this._cursor += match!.content.length;
        console.log(match);
        return this;
    }

    get slice() {
        return this._input.slice(this._cursor);
    }
}
