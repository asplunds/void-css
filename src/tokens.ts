export type Domains = "selector" | "style" | "void" | "flow";
export type Match = {
    type: string;
    renamed?: string;
    attributes?: string[];
    domain: Domains;
    match: RegExpMatchArray | null;
};

export type TokenMatcher = (input: string) => Match | undefined;

/**
 * Renames a token. Useful for borrowing logic while preserving the current grammar branch.
 *
 * **Note:** this doesn't actually change the name of token, it merely sets the
 * renamed property to the new name which the lexer understands.
 * @param tokenMatcher the token matcher to rename
 * @param renamed the new name
 * @returns renamed token matcher
 */
export function renameToken(
    tokenMatcher: (input: string) => Match,
    renamed: string,
    newDomain?: Domains
): TokenMatcher {
    return (input: string) => {
        const prev = tokenMatcher(input);
        return {
            ...prev,
            domain: newDomain ?? prev.domain,
            renamed,
        };
    };
}

export function renameTokens(
    tokenMatchers: ((input: string) => Match)[],
    renamed: string,
    newDomain?: Domains
): TokenMatcher[] {
    return tokenMatchers.map((tokenMatcher) => {
        return (input: string) => {
            const prev = tokenMatcher(input);
            return {
                ...prev,
                domain: newDomain ?? prev.domain,
                renamed,
            };
        };
    });
}

/**
 * Utility to borrow logic while still restricting syntax for the special keyframes case;
 * where for example, nested DOM (non-keyframe) selectors are not allowed.
 * @param token old token
 * @param type new name
 * @returns new token with keyframes attribute
 */
export function kf(...tokens: TokenMatcher[]): TokenMatcher[] {
    return attributeAdder("keyframes", tokens);
}

function attributeAdder(
    attribute: string,
    tokens: TokenMatcher[]
): TokenMatcher[] {
    return tokens.map((token) => {
        return (input: string) => {
            const match = token(input);
            if (!match) return undefined;
            return {
                ...match,
                attributes: [
                    ...new Set(["keyframes", ...(match.attributes ?? [])]),
                ],
            };
        };
    });
}

export function serializePropertyValues(match: RegExpMatchArray | null) {
    if (!match) return match;
    if (/[{};:]/g.test(match[0])) return null;
    return match;
}

export function ifOperator(input: string): Match {
    return {
        type: "ifOperator",
        domain: "flow",
        attributes: [],
        match: input.match(/^@if/),
    };
}
export function notOperator(input: string): Match {
    return {
        type: "notOperator",
        domain: "selector",
        attributes: [],
        match: input.match(/^:(?:not|has)/i),
    };
}
export function notOperatorParenthesis(input: string): Match {
    return {
        type: "notOperatorParenthesis",
        domain: "selector",
        attributes: [],
        match: input.match(/^\(/),
    };
}
export function notOperatorParenthesisEnd(input: string): Match {
    return {
        type: "notOperatorParenthesisEnd",
        domain: "selector",
        attributes: [],
        match: input.match(/^\)/),
    };
}

export function atSymbol(input: string): Match {
    return {
        type: "atSymbol",
        domain: "selector",
        attributes: ["atRule"],
        match: input.match(/^@/),
    };
}
export function keyframes(input: string): Match {
    return {
        type: "keyframes",
        domain: "selector",
        attributes: ["keyframes"],
        match: input.match(/^@keyframes/i),
    };
}
export function atKeyframes(input: string): Match {
    return {
        type: "atKeyframes",
        domain: "selector",
        attributes: ["keyframes"],
        match: input.match(/^@keyframes/i),
    };
}
export function keyframesSpecialNames(input: string): Match {
    return {
        type: "keyframesSpecialNames",
        domain: "selector",
        attributes: ["keyframes"],
        match: input.match(/^"initial"|^"None"/),
    };
}

/** basically a percentage, to or from */
export function keyframesSelector(input: string): Match {
    return {
        type: "keyframesSelector",
        domain: "selector",
        attributes: ["keyframes"],
        match: input.match(/^\d+%|^to|^from/i),
    };
}

// this intentionally does not include @import, @charset, @keyframes (look up) and @namespace
export function nestedAtRuleName(input: string): Match {
    return {
        type: "nestedAtRuleName",
        domain: "selector",
        attributes: ["atRule"],
        match: input.match(
            /^(?:color-profile|counter-style|document|font-face|font-feature-values|media|page|property|supports)/i
        ),
    };
}

// this token is lazy however parsing every nested rule is expensive and unyielding,
// for future reference this would be valuable to implement but as of writing this it's not.
export function nestedAtRule(input: string): Match {
    return {
        type: "nestedAtRule",
        domain: "selector",
        attributes: ["atRule"],
        match: input.match(/^.*?(?={)/),
    };
}

/**
 * Capture only whitespace start to finish indicating end of stylesheet
 */
export function endStyleSheet(input: string): Match {
    return {
        type: "skip",
        domain: "void",
        match: input.match(/^\s+$/),
    };
}

export function rootSelector(input: string): Match {
    return {
        type: "rootSelector",
        domain: "selector",
        match: input.match(/^:root/),
    };
}

export function inlineComment(input: string): Match {
    return {
        type: "inlineComment",
        domain: "void",
        match: input.match(/^\/\/.*/),
    };
}

export function blockComment(input: string): Match {
    return {
        type: "blockComment",
        domain: "void",
        match: input.match(/^\/\*[\S\s]*?\*\//),
    };
}

export function whiteSpace(input: string): Match {
    return {
        type: "skip",
        domain: "void",
        match: input.match(/^[\s\n\r]+/),
    };
}

export function colon(input: string): Match {
    return {
        type: "colon",
        domain: "selector",
        match: input.match(/^::?/),
    };
}
export function pseudoSelector(input: string): Match {
    return {
        type: "pseudoSelector",
        domain: "selector",
        match: input.match(/^[a-zA-Z-]+/),
    };
}

export function whiteSpaceOrNothing(input: string): Match {
    return {
        type: "skip",
        domain: "void",
        match: input.match(/^[\s\n\r]*/),
    };
}

export function classNameInitiator(input: string): Match {
    return {
        type: "classNameInitiator",
        domain: "selector",
        match: input.match(/^\./),
    };
}
export function exportClassName(input: string): Match {
    return {
        type: "exportClassName",
        domain: "selector",
        match: input.match(/^\./),
    };
}
export function idInitiator(input: string): Match {
    return {
        type: "idInitiator",
        domain: "selector",
        match: input.match(/^#/),
    };
}
export function selectorSeparator(input: string): Match {
    return {
        type: "selectorSeparator",
        domain: "selector",
        match: input.match(/^,\s*/),
    };
}
export function selectorChild(input: string): Match {
    return {
        type: "selectorChild",
        domain: "selector",
        match: input.match(/^\s+/),
    };
}
export function selectorName(input: string): Match {
    return {
        type: "selectorName",
        domain: "selector",
        match: input.match(/^[a-zA-Z0-9_-]+/),
    };
}
export function styleScope(input: string): Match {
    return {
        type: "styleScope",
        domain: "style",
        match: input.match(/^{/),
    };
}
export function requiredWhiteSpace(input: string): Match {
    return {
        type: "requiredWhiteSpace",
        domain: "void",
        match: input.match(/^\s+/),
    };
}
export function styleScopeEnd(input: string): Match {
    return {
        type: "styleScopeEnd",
        domain: "style",
        match: input.match(/^\s*}/),
    };
}
/**
 * Problematic token because it conflicts with selector name.
 * The implemented solution here is using a positive look ahead,
 * however there's poor browser support for it. Unclear how this
 * will behave in for example safari or older browser versions...
 */
export function propertyName(input: string): Match {
    return {
        type: "propertyName",
        domain: "style",
        match: input.match(/^[a-zA-Z0-9-_]+(?=:)/),
    };
}
export function propertyColon(input: string): Match {
    return {
        type: "propertyColon",
        domain: "style",
        match: input.match(/^:/),
    };
}
export function propertyValueWithSemiColon(input: string): Match {
    return {
        type: "propertyValue",
        domain: "style",
        match: serializePropertyValues(input.match(/(.|\r|\n)*?(?=;)/)),
    };
}
export function propertyValueWithoutSemiColon(input: string): Match {
    return {
        type: "propertyValue",
        domain: "style",
        match: serializePropertyValues(input.match(/(.|\r|\n)*?(?=})/)),
    };
}
export function valueSemiColon(input: string): Match {
    // todo: rename to Semicolon
    return {
        type: "valueSemiColon",
        domain: "style",
        match: input.match(/^;/),
    };
}

export function attributeSelectorInitiator(input: string): Match {
    return {
        type: "attributeSelectorInitiator",
        domain: "selector",
        match: input.match(/^\[/),
    };
}
export function attributeSelectorModifier(input: string): Match {
    return {
        type: "attributeSelectorModifier",
        domain: "selector",
        match: input.match(/^\s*[!|~^$*]{0,1}=/),
    };
}
export function attributeSelectorSingleQuoteInitiator(input: string): Match {
    return {
        type: "attributeSelectorSingleQuoteInitiator",
        domain: "selector",
        match: input.match(/^\s*'/),
    };
}
export function attributeSelectorSingleQuoteBody(input: string): Match {
    return {
        type: "attributeSelectorSingleQuoteBody",
        domain: "selector",
        match: input.match(/^.*?(?:[^\\]+?')|^'/),
    };
}
export function attributeSelectorDoubleQuoteInitiator(input: string): Match {
    return {
        type: "attributeSelectorDoubleQuoteInitiator",
        domain: "selector",
        match: input.match(/^\s*"/),
    };
}
export function attributeSelectorDoubleQuoteBody(input: string): Match {
    return {
        type: "attributeSelectorDoubleQuoteBody",
        domain: "selector",
        match: input.match(/^.*?(?:[^\\]+?")|^"/),
    };
}
export function attributeSelectorClose(input: string): Match {
    return {
        type: "attributeSelectorClose",
        domain: "selector",
        match: input.match(/^\s*[iIsS]{0,1}\]/),
    };
}
export function attributeSelectorCloseWithoutOperator(input: string): Match {
    return {
        type: "attributeSelectorClose",
        domain: "selector",
        match: input.match(/^\s*\]/),
    };
}

export function selectorCombinator(input: string): Match {
    return {
        type: "combinator",
        domain: "selector",
        match: input.match(/(^>|^~|^\+|^\|\|)/),
    };
}

export function wildcard(input: string): Match {
    return {
        type: "wildcard",
        domain: "selector",
        match: input.match(/^\*/),
    };
}

export function currentSelector(input: string): Match {
    return {
        type: "currentSelector",
        domain: "selector",
        match: input.match(/^&/),
    };
}
