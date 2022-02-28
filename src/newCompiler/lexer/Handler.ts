import Collection from "../collections/utils/Collection";
import { visit } from "./entrypoint";
import LexerContext from "./LexerContext";

export default function Handler(
    collection: ReturnType<typeof Collection>,
    onMatch: (params: {
        ctx: LexerContext;
        self: ReturnType<typeof Handler>[];
    }) => ReturnType<typeof visit>
) {
    return {
        collection,
        onMatch,
    } as const;
}
