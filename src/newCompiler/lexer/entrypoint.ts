import collections from "../collections/mod";
import Collection from "../collections/utils/Collection";
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
            return handler.onMatch({ ctx: ctx.tokenize(poked), self: handlers })
    }
}

export function poke(ctx: LexerContext, collection: ReturnType<typeof Collection>) {
    for (const rule of collection.rules) {
        const token = rule.tokens[0];

        const match = ctx.slice.match(token.regex);
        if (match)
            return {
                content: match.toString(),
                rule,
                collection,
            } as const;
    }
}
