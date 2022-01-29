import { Match } from "./tokens";
import { Config } from "./config";
import { Events, Extension } from "./extensions/extentions";
export type Token = ReturnType<typeof formalizeMatch>;

function formalizeMatch(start: number, match: string, token: Match, depth: number) {
    const { type: name, domain, renamed, attributes } = token;

    return {
        renamed,
        start,
        end: start + match.length,
        attributes,
        match,
        name,
        depth,
        domain,
    }
}

export default class Context {
    private _index = 0;
    private _tokens: Token[] = [];
    private _strippedTokens: Token[] = [];
    private _extensions: Extension[] = [];
    private _keyframes: Token[] = [];
    private readonly _config!: Config;
    public readonly classesCache = new Map<string, string>();
    public readonly css!: string;

    constructor(css: string, config: Config) {
        this.css = css;
        this._config = config;
    }
    get index(): number {
        return this._index;
    }
    get slice(): string {
        return this.css.substr(this.index);
    }
    get tokens() {
        return this._tokens;
    }
    get keyframes() {
        return this._keyframes;
    }
    get strippedTokens() {
        return this._strippedTokens;
    }
    get lastToken(): Token | undefined {
        // don't rename to _strippedTokens... it's a bad idea!
        return this._tokens[this._tokens.length - 1];
    }
    get extensions(): Extension[] {
        return this._extensions;
    }
    get config() {
        return this._config.conf;
    }

    register(extensions: Extension[]): this {
        this._extensions.push(...extensions);
        return this;
    }

    queryExtensions(event: Events, match: string, token?: Token): string {
        let newValue = match;
        for (const extension of this.extensions) {
            if (extension.listen.includes(event)) {
                newValue = extension.onEvent(event, newValue, token);
            }
        }
        return newValue;
    }

    tokenize(token: Match, depth: number) {
        const match = token?.match?.[0];

        if (typeof match !== "string") return this;
        void (this._index += match.length ?? 0);
        if (token.attributes?.includes("keyframes") && token.domain !== "void") {
            void this._tokens.push(formalizeMatch(this._index, match, token, depth));
            this._keyframes.push(formalizeMatch(this._index, match, token, depth));
            return this;
        }
        void this._tokens.push(formalizeMatch(this._index, match, token, depth));

        if (token.domain !== "void") return (
            void this._strippedTokens.push(formalizeMatch(this._index, match, token, depth)), this
        );


        return this;
    }
}

