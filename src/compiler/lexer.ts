import { whiteSpace, Match, currentSelector, classNameInitiator, selectorName, idInitiator, wildcard, selectorChild, selectorCombinator, selectorSeparator, styleScope, renameToken, attributeSelectorCloseWithoutOperator, attributeSelectorModifier, attributeSelectorSingleQuoteInitiator, attributeSelectorDoubleQuoteInitiator, attributeSelectorSingleQuoteBody, attributeSelectorDoubleQuoteBody, attributeSelectorClose, attributeSelectorInitiator, styleScopeEnd, propertyName, valueSemiColon, propertyColon, propertyValueWithSemiColon, propertyValueWithoutSemiColon, TokenMatcher, inlineComment, renameTokens, blockComment, atSymbol, nestedAtRuleName, nestedAtRule, endStyleSheet, whiteSpaceOrNothing, exportClassName, colon, pseudoSelector, rootSelector, notOperatorParenthesis, notOperator, notOperatorParenthesisEnd, keyframes, requiredWhiteSpace, keyframesSpecialNames, keyframesSelector, kf, atKeyframes } from "../tokens";
import { Config } from "../config";
import Context from "../context";
import { createErrorContext, createCompilationError, resolveSelectorNameNotFound, resolveEndOfPropertyValue } from "../errors/errors";
import { Extension } from "../extensions/extentions";
import compile from "./compiler";


export function compileScope(css: string, config: Config, extensions: Extension[]) {

    const resolvedCSS = css.replace(/\r/g, "");

    const ctx = new Context(resolvedCSS, config)
        .register(extensions);

    return lex(ctx, expect(ctx.css, whiteSpaceOrNothing));
}

const globalTokens = [inlineComment, blockComment];



/**
 * Void CSS lexer — Tokenizes given Void CSS input and then, if valid, compiles it,
 * otherwise throws syntax error.
 * 
 * Recursive and declarative design. Each case on the main switch statement represents the next step
 * after the given (current token). Each self call of the lex function represents what the lexer should
 * expect after the current token. Using attributes which live on the function recursively (as an argument),
 * the lexer can call itself with possibly conditional expectations using helper functions such as `_if`. 
 *  
 * @param ctx Compile context
 * @param token Current token (unless beginning)
 * @param attributes Makes the lexer aware of its state
 * @returns compiled Void CSS. see `compile` function
 */
function lex(ctx: Context, token: Match | undefined, attributes?: {
    onError: ReturnType<typeof createErrorContext>;

    /** Requires enclosures to resolve such as a rule which resolve with '}' */
    enclosures: TokenMatcher[];

    /** The current css rule or "scope" depth (levels nested) */
    depth: number;

    /** The depth of the :not() syntax. Required since you can nest them */
    notOperatorDepth: number;
}): ReturnType<typeof compile> | undefined {
    const { lastToken, index, css: preTokenizedCSS } = ctx;
    if (!token?.match) {
        if (index !== preTokenizedCSS.length || 0 !== (attributes?.depth ?? 0)) {
            if (attributes?.onError) {
                throw new SyntaxError(createCompilationError(ctx, attributes.onError));
            } else {
                throw new SyntaxError("Something went wrong during compilation");
            }
        } else {
            return compile(ctx);
        }
    }
    const enclosures = attributes?.enclosures || [];

    const notOperatorDepth = attributes?.notOperatorDepth ?? 0;

    /** The depth refers to the css rule or "scope" nesting level */
    const depth = (attributes?.depth ?? 0) + (() => {
        // The only way to descend a depth is to close it with the `}` token `styleScopeEnd`
        const descend = lastToken?.name === "styleScopeEnd";
        if (descend) return -1;

        // If the previous token isn't a selector and the current one is,
        // it must mean that a new scope is defined.
        const ascend = lastToken?.domain !== "selector" && token.domain === "selector";
        if (ascend) return 1;

        return 0;
    })();

    const { slice, css } = ctx.tokenize(token, depth);
    const resolvedType = token?.renamed || token.type;
    const globals = renameTokens(globalTokens, resolvedType);

    switch (resolvedType) {
        case "skip":
            const [start, end] = [ctx.index, ctx.index + resolveSelectorNameNotFound(slice)] as const;
            const section = css.substring(start, end);
            const hint = enclosures.length === 0 && /&/.test(section) ?
                "Root level selectors cannot contain current selector ('&')." :
                /^\s*(?:~|>|\+|\|\|)/.test(section) ?
                    "Root level selectors cannot begin with a selector combinator ('~', '>', '+', '||'). Did you forget to add left side selector combinator operand?" :
                    "Instead found invalid or missing selector.";
            return lex(
                ctx,
                expect(slice, ...globals, atSymbol, whiteSpace, ...enclosures, ..._if(enclosures.length === 0, [rootSelector]), ..._if(depth > 0, [currentSelector]), attributeSelectorInitiator, classNameInitiator, selectorName, idInitiator, wildcard, notOperator),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: [css selector]. " + hint,
                        start,
                        end,
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "notOperator":
            return lex(
                ctx,
                expect(slice, ...globals, notOperatorParenthesis),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: '('.",
                        ctx.index,
                        ctx.index + resolveSelectorNameNotFound(slice),
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "notOperatorParenthesis":
            return lex(
                ctx,
                expect(slice, ...globals, ..._if(enclosures.length === 0, [rootSelector]), ..._if(depth > 0, [currentSelector]), notOperator, attributeSelectorInitiator, classNameInitiator, selectorName, idInitiator, wildcard),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: [selector].",
                        ctx.index,
                        ctx.index + 1,
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth: notOperatorDepth + 1,
                },
            );
        case "notOperatorParenthesisEndWhiteSpace":
        case "notOperatorParenthesisEnd":
            const newDepth = notOperatorDepth - (resolvedType === "notOperatorParenthesisEnd" ? 1 : 0);
            return lex(
                ctx,
                expect(slice, ...globals, renameToken(whiteSpace, "notOperatorParenthesisEndWhiteSpace"), ..._if(enclosures.length === 0, [rootSelector]), ..._if(depth > 0, [currentSelector]), ..._if(newDepth > 0, [notOperatorParenthesisEnd]), colon, selectorSeparator, styleScope, attributeSelectorInitiator, classNameInitiator, selectorName, idInitiator, wildcard),
                {
                    onError: createErrorContext(
                        newDepth === 0 ?
                            "Unexpected token. Expected: [selector]." :
                            "Unexpected token. Expected: ')' or [selector].",
                        ctx.index,
                        ctx.index + 1,
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth: newDepth,
                },
            );
        case "atSymbol":
            return lex(
                ctx,
                expect(slice, ...globals, ...kf(keyframes), nestedAtRuleName),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: 'color-profile', 'counter-style', 'document', 'font-face', 'font-feature-values', 'keyframes', 'media', 'page', 'property' or 'supports'. It's possible that this list is outdated, if so please make an issue on the repository.",
                        ctx.index,
                        ctx.index + resolveSelectorNameNotFound(slice),
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "atKeyframes":
        case "keyframes":
            return lex(
                ctx,
                expect(slice, ...globals, ...kf(renameToken(selectorChild, "keyframesWhiteSpace"))),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: [whitespace].",
                        ctx.index,
                        ctx.index + resolveSelectorNameNotFound(slice),
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "keyframesWhiteSpace":
            return lex(
                ctx,
                expect(slice, ...globals, ...kf(renameToken(selectorName, "keyframesName"), keyframesSpecialNames)),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: [keyframes name].",
                        ctx.index,
                        ctx.index + resolveSelectorNameNotFound(slice),
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "keyframesSpecialNames":
        case "keyframesNameWhiteSpace":
        case "keyframesName":
            if (resolvedType === "keyframesName" && ["None", "initial"].includes(token.match.toString())) {
                return lex(
                    ctx,
                    expect(slice, ...globals),
                    {
                        onError: createErrorContext(
                            `Invalid keyframes name. A keyframes name cannot be '${token.match}' as per "CSS Animations Level 2" w3c specification. You can wrap '${token.match}' in double quotes ('"') like this: '"${token.match}"' to still use this name.`,
                            Math.max(ctx.index - token.match.toString().length, 0),
                            ctx.index,
                        ),
                        enclosures,
                        depth,
                        notOperatorDepth,
                    },
                );
            }
            return lex(
                ctx,
                expect(slice, ...globals, ...kf(renameToken(selectorChild, "keyframesNameWhiteSpace"), renameToken(styleScope, "keyframesScope"))),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: '{'.",
                        ctx.index,
                        ctx.index + resolveSelectorNameNotFound(slice),
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "keyframesScopeWhitespace":
        case "keyframesScope":
            return lex(
                ctx,
                expect(slice, ...globals, ...kf(renameToken(whiteSpace, "keyframesScopeWhitespace"), keyframesSelector, renameToken(styleScopeEnd, "keyframesScopeEnd"))),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: [percentage selector], 'to', 'from' or '}'.",
                        ctx.index,
                        ctx.index + resolveSelectorNameNotFound(slice),
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "keyframesBlockEndWhitespace":
        case "keyframesBlockEnd":
            return lex(
                ctx,
                expect(slice, ...kf(renameToken(whiteSpace, "keyframesBlockEndWhitespace"), renameToken(styleScopeEnd, "keyframesScopeEnd"), keyframesSelector)),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: [keyframes selector] or '}'.",
                        ctx.index,
                        ctx.index + 1,
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "keyframesScopeEnd":
            return lex(
                ctx,
                expect(slice, ...kf(renameToken(whiteSpace, "keyframesScopeEnd")), ..._if(depth > 0, [styleScopeEnd]), currentSelector, propertyName, attributeSelectorClose, selectorName, idInitiator, classNameInitiator, atSymbol, whiteSpaceOrNothing),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: [css].",
                        ctx.index,
                        ctx.index + 1,
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "keyframesSelector":
            return lex(
                ctx,
                expect(slice, ...globals, ...kf(renameToken(whiteSpace, "keyframesSelector"), renameToken(selectorSeparator, "keyframesSeparator"), renameToken(styleScope, "keyframesBlock"))),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: ',' or '{'.",
                        ctx.index,
                        ctx.index + resolveSelectorNameNotFound(slice),
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "keyframesSeparator":
            return lex(
                ctx,
                expect(slice, ...globals, ...kf(renameToken(whiteSpace, "keyframesSeparator"), keyframesSelector)),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: [percentage selector], 'to' or 'from'.",
                        ctx.index,
                        ctx.index + resolveSelectorNameNotFound(slice),
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "keyframesBlockWhitespace":
        case "keyframesBlock":
            return lex(
                ctx,
                expect(slice, ...globals, ...kf(renameToken(whiteSpace, "keyframesBlockWhitespace"), renameToken(propertyName, "keyframesBlockPropertyName"), renameToken(styleScopeEnd, "keyframesBlockEnd"))),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: [property name] or '}'.",
                        ctx.index,
                        ctx.index + resolveSelectorNameNotFound(slice),
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "keyframesBlockPropertyName":
            return lex(
                ctx,
                expect(slice, ...globals, ...kf(renameToken(whiteSpace, "keyframesBlockPropertyName"), renameToken(propertyColon, "keyframesPropertyColon"))),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: ':'.",
                        ctx.index,
                        ctx.index + resolveSelectorNameNotFound(slice),
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "keyframesPropertyColon":
            return lex(
                ctx,
                expect(slice, ...globals, ...kf(renameToken(whiteSpace, "keyframesPropertyColon"), ...renameTokens([propertyValueWithSemiColon, propertyValueWithoutSemiColon], "keyframesPropertyValue"))),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: [property value]. Did you forget ';'?",
                        ctx.index,
                        ctx.index + resolveSelectorNameNotFound(slice),
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "keyframesPropertyValue": {
            const hasSemiColon = false; // todo: fix
            return lex(
                ctx,
                expect(slice, ...globals, ...kf(renameToken(whiteSpace, "keyframesPropertyValue"), renameToken(valueSemiColon, "keyframesValueSemiColon"), renameToken(styleScopeEnd, "keyframesBlockEnd"))),
                {
                    onError: createErrorContext(
                        hasSemiColon ?
                            "Unexpected token. Expected: '}'." :
                            "Unexpected token. Expected: ';' or '}'.",
                        ctx.index,
                        ctx.index + resolveSelectorNameNotFound(slice),
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        }
        case "keyframesValueSemiColon":
            return lex(
                ctx,
                expect(slice, ...globals, ...kf(renameToken(whiteSpace, "keyframesValueSemiColon"), renameToken(propertyName, "keyframesBlockPropertyName"), renameToken(styleScopeEnd, "keyframesBlockEnd"))),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: [property name] or '}'.",
                        ctx.index,
                        ctx.index + resolveSelectorNameNotFound(slice),
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "nestedAtRuleName":
            return lex(
                ctx,
                expect(slice, ...globals, nestedAtRule),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: [at rule]",
                        ctx.index,
                        ctx.index + resolveEndOfPropertyValue(slice),
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "nestedAtRule":
            return lex(
                ctx,
                expect(slice, ...globals, styleScope),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: '{'.",
                        ctx.index,
                        ctx.index + resolveEndOfPropertyValue(slice),
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "idInitiator":
            return lex(
                ctx,
                expect(slice, ...globals, selectorName),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: ID name.",
                        ctx.index,
                        ctx.index + resolveSelectorNameNotFound(slice),
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "currentSelectorWhiteSpace":
        case "currentSelector":
            return lex(
                ctx,
                expect(slice, ...globals, ...renameTokens([whiteSpace], "currentSelectorWhiteSpace", "selector"), notOperator, selectorChild, classNameInitiator, colon, selectorName, selectorCombinator, selectorSeparator, styleScope, wildcard),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: ' ', '>', '+', '||', '.', ':', '::', '[...]', ',' or '{' directly proceeding current selector ('&').",
                        ctx.index,
                        ctx.index + resolveSelectorNameNotFound(slice),
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "attributeSelectorInitiator":
            return lex(
                ctx,
                expect(slice, ...globals, renameToken(selectorName, "attributeSelectorName")),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: attribute name",
                        ctx.index,
                        ctx.index + resolveSelectorNameNotFound(slice),
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "attributeSelectorName":
            return lex(
                ctx,
                expect(slice, ...globals, attributeSelectorCloseWithoutOperator, attributeSelectorModifier),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: '=', '!=', '|=', '~=', '^=', '$=' or '*='",
                        ctx.index,
                        ctx.index + 1,
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "attributeSelectorModifier":
            return lex(
                ctx,
                expect(slice, ...globals, attributeSelectorSingleQuoteInitiator, attributeSelectorDoubleQuoteInitiator),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: \"'\" or '\"'",
                        ctx.index,
                        ctx.index + resolveSelectorNameNotFound(slice),
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "attributeSelectorSingleQuoteInitiator":
            return lex(
                ctx,
                expect(slice, ...globals, attributeSelectorSingleQuoteBody),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: \"'\"",
                        ctx.index,
                        ctx.index + 1,
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "attributeSelectorDoubleQuoteInitiator":
            return lex(
                ctx,
                expect(slice, ...globals, attributeSelectorDoubleQuoteBody),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: '\"'",
                        ctx.index,
                        ctx.index + 1,
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "attributeSelectorDoubleQuoteBody":
        case "attributeSelectorSingleQuoteBody":
            return lex(
                ctx,
                expect(slice, ...globals, attributeSelectorClose),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: 'i]', 'I]', 's]', 'S]', or ']'.",
                        ctx.index,
                        ctx.index + resolveSelectorNameNotFound(slice),
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "attributeSelectorClose":
            return lex(
                ctx,
                expect(slice, ...globals, renameToken(whiteSpace, "attributeSelectorClose"), ..._if(notOperatorDepth > 0, [notOperatorParenthesisEnd]), notOperator, selectorCombinator, wildcard, classNameInitiator, colon, selectorName, idInitiator, selectorSeparator, attributeSelectorInitiator, styleScope),
                {
                    onError: createErrorContext(
                        notOperatorDepth === 0 ?
                            "Unexpected token. Expected: [css selector] or '{'" :
                            "Unexpected token. Expected: ')', [css selector] or '{'",
                        ctx.index,
                        ctx.index + resolveSelectorNameNotFound(slice),
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "classNameInitiator":
            return lex(
                ctx,
                expect(slice, ...globals, exportClassName, renameToken(selectorName, "className")),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: class name or ','.",
                        ctx.index,
                        ctx.index + resolveSelectorNameNotFound(slice),
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "exportClassName":
            return lex(
                ctx,
                expect(slice, ...globals, renameToken(selectorName, "className")),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: class name.",
                        ctx.index,
                        ctx.index + resolveSelectorNameNotFound(slice),
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "wildcard":
            return lex(
                ctx,
                expect(slice, ...globals, notOperator, styleScope, colon, selectorChild, selectorSeparator, selectorCombinator),
                {
                    onError: createErrorContext(
                        "Unexpected token directly proceeding universal selector (*). Expected: '{' or [css selector]. ",
                        ctx.index,
                        ctx.index + (/\s/.exec(slice)?.index || 1),
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "combinator":
            const previousIsCombinator = ctx.strippedTokens?.[ctx.strippedTokens.length - 2]?.name === "combinator";
            const combinatorHint = previousIsCombinator ? "Combinators ('~', '>', '+', '||') cannot directly follow previous combinator. " : "";

            return lex(
                ctx,
                expect(slice, ...globals, ...renameTokens([whiteSpace], "combinator", "selector"), notOperator, selectorName, idInitiator, attributeSelectorInitiator, classNameInitiator, wildcard),
                {
                    onError: createErrorContext(
                        `Unexpected token proceeding selector combinator. Expected: [combinator operand]. ${combinatorHint}Did you forgot a [combinator operand] after the selector combinator?`,
                        ctx.index,
                        ctx.index + 1,
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "rootSelector":
            return lex(
                ctx,
                expect(slice, ...globals, renameToken(whiteSpace, "rootSelector"), styleScope, selectorCombinator),
                {
                    onError: createErrorContext(
                        "Unexpected token in selector after root selector. Expected: ',' or '{'.",
                        ctx.index,
                        ctx.index + (/\s/.exec(slice)?.index || 1),
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "className":
        case "selectorName":
            return lex(
                ctx,
                expect(slice, ...globals, notOperator, ..._if(notOperatorDepth > 0, [notOperatorParenthesisEnd]), attributeSelectorInitiator, colon, styleScope, selectorChild, selectorSeparator, classNameInitiator, selectorCombinator),
                {
                    onError: createErrorContext(
                        "Unexpected token in selector. Expected: '{' or [css selector].",
                        ctx.index,
                        ctx.index + 1,
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "selectorSeparator":
            if (notOperatorDepth !== 0) {
                return lex(
                    ctx,
                    expect(slice, ...globals),
                    {
                        onError: createErrorContext(
                            `Unexpected selector separator ','. Selector branching is not valid inside ':not(...)' and ':has(...)' operators. Did you forget '${")".repeat(Math.max(1, notOperatorDepth))}'?`,
                            Math.max(0, ctx.index - 1),
                            ctx.index,
                        ),
                        enclosures,
                        depth,
                        notOperatorDepth,
                    },
                );
            }
            return lex(
                ctx,
                expect(slice, ...globals, ..._if(enclosures.length === 0, [rootSelector]), currentSelector, classNameInitiator, selectorName, idInitiator),
                {
                    onError: createErrorContext(
                        "Unexpected token following selector separator (','). Expected: [css selector].",
                        ctx.index,
                        ctx.index + 1,
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "selectorChild":
            return lex(
                ctx,
                expect(slice, ...globals, styleScope, attributeSelectorInitiator, selectorSeparator, selectorName, classNameInitiator, idInitiator, wildcard, selectorCombinator),
                {
                    onError: createErrorContext(
                        "Unexpected token in selector. Expected: '{' or [css selector].",
                        ctx.index,
                        ctx.index + 1,
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                });
        case "styleScopeWhiteSpace":
        case "styleScope":
            if (notOperatorDepth !== 0) {
                return lex(
                    ctx,
                    expect(slice, ...globals),
                    {
                        onError: createErrorContext(
                            "Unexpected token in style scope. Expected: ')'. Did you forget to end your ':not(...)' or ':has(...)' operator?",
                            Math.max(0, ctx.index - 1),
                            ctx.index,
                        ),
                        enclosures,
                        depth,
                        notOperatorDepth,
                    },
                );
            }
            return lex(
                ctx,
                expect(slice, ...globals, renameToken(whiteSpace, "styleScopeWhiteSpace"), selectorCombinator, atSymbol, styleScopeEnd, propertyName, selectorName, attributeSelectorClose, wildcard, idInitiator, classNameInitiator, currentSelector),
                {
                    onError: createErrorContext(
                        "Unexpected token in style scope. Expected: '}', [css selector] or [css property].",
                        ctx.index,
                        ctx.index + 1,
                    ),
                    enclosures: [...(resolvedType === "styleScope" ? [styleScopeEnd] : []), ...enclosures],
                    depth,
                    notOperatorDepth,
                },
            );
        case "styleScopeEnd":
            return lex(
                ctx,
                // add non ending condition?
                expect(slice, renameToken(whiteSpace, "styleScopeEnd"), ..._if(depth > 0, [styleScopeEnd]), currentSelector, propertyName, attributeSelectorClose, selectorName, idInitiator, classNameInitiator, atSymbol, whiteSpaceOrNothing),
                {
                    onError: createErrorContext(
                        "Unexpected token. Undefined behavior." + (depth),
                        ctx.index,
                        ctx.index + 1,
                    ),
                    enclosures: enclosures.slice(1),
                    depth,
                    notOperatorDepth,
                },
            );
        case "colon":
            return lex(ctx, expect(slice, ...globals, renameToken(pseudoSelector, "selectorName")),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: pseudo selector. This error often occurs when you forget a selector.",
                        ctx.index,
                        ctx.index + resolveSelectorNameNotFound(slice),
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "propertyName":
            return lex(ctx, expect(slice, ...globals, renameToken(whiteSpace, "propertyName"), propertyColon),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: [property name].",
                        ctx.index,
                        ctx.index + 1,
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "propertyColon":
            const errorStartEstimate = resolveEndOfPropertyValue(slice) + ctx.index;
            return lex(
                ctx,
                expect(slice, ...globals, propertyValueWithSemiColon, propertyValueWithoutSemiColon),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: [property value].",
                        errorStartEstimate,
                        errorStartEstimate,
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "propertyValue":
            return lex(ctx,
                expect(slice, ...globals, styleScopeEnd, valueSemiColon),
                {
                    onError: createErrorContext(
                        "Unexpected token. Expected: ';' or '}'.",
                        ctx.index,
                        ctx.index + 1,
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        case "valueSemiColon":
            return lex(
                ctx,
                expect(slice, ...globals, renameToken(whiteSpace, "valueSemiColon"), atKeyframes, selectorCombinator, currentSelector, notOperator, valueSemiColon, propertyName, styleScopeEnd, classNameInitiator, idInitiator, selectorName),
                {
                    onError: createErrorContext(
                        "Unexpected token in style scope. Expected: '}'.",
                        ctx.index,
                        ctx.index + 1,
                    ),
                    enclosures,
                    depth,
                    notOperatorDepth,
                },
            );
        default:
            throw new SyntaxError("Something internally went wrong during the lexical analysis. This error indicates one or more token matchers are not recognized by the lexer.");
    }

}

function stripComments(css: string) {
    return css.replace(/\/\/.*/gm, "");
}


/**
 * Conditionally expect tokens
 * @param condition 
 * @param tokens token matchers which will be outputted given condition is truthy
 * @returns Empty array or input array of token matcher(s)
 */
function _if(condition: boolean | null | undefined, tokens: TokenMatcher[]): TokenMatcher[] {
    return condition ? tokens : [];
}

/**
 * Expect tokens in a css slice
 * @param css slice of the css from where matching should begin
 * @param args tokens to expect in the css slice
 * @returns Whether a token was successfully matched or not. First token to match will break the search
 */
function expect(css: string, ...args: TokenMatcher[]): Match | undefined {
    for (const arg of args) {
        const poke = arg(css);
        if (poke?.match) return poke;
    }
    return void 0;
}
