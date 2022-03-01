import collections from "../collections/mod";
import Collection from "../collections/utils/Collection";
import Rule from "../collections/utils/Rule";
import Token from "../tokens/utils/Token";
import Handler from "./Handler";
import LexerContext from "./LexerContext";

lex(`

.hey

`);

export default function lex(input: string) {
    const res = visit(new LexerContext(input), [
        Handler(collections.globals, ({ ctx, self }) => visit(ctx, self)),
        Handler(collections.selectors, ({ ctx, self }) =>
            visit(ctx, [
                Handler(collections.globals, ({ ctx }) => visit(ctx, self)),
                Handler(collections.selectors, () => void 0),
            ])
        ),
    ]);
}

export function visit(
    ctx: LexerContext,
    handlers: ReturnType<typeof Handler>[]
): void /* change */ {
    for (const handler of handlers) {
        const poked = poke(ctx, handler.collection);

        if (poked)
            return commit(ctx, poked.rule, (ctx: LexerContext) =>
                handler.onMatch({
                    ctx,
                    self: handlers,
                })
            );
    }
}

export function commit<T>(
    ctx: LexerContext,
    rule: ReturnType<typeof Rule>,
    cb: (ctx: LexerContext) => T
) {
    for (const token of rule.tokens) {
        const matched = match(ctx, token);

        if (!matched) console.error("oops", token);
        else ctx.tokenize(matched);
    }
    return cb(ctx);
}

export function poke(
    ctx: LexerContext,
    collection: ReturnType<typeof Collection>
) {
    for (const rule of collection.rules) {
        const token = rule.tokens[0];

        const matched = match(ctx, token);
        if (matched) return { matched, rule, collection };
    }
    return null;
}

export function match(ctx: LexerContext, token: ReturnType<typeof Token>) {
    const match = ctx.slice.match(token.regex);

    if (match)
        return {
            content: match.toString(),
            token,
        } as const;
    return null;
}
