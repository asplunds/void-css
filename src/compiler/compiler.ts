import Context, { Token } from "../context";
import crypto from "crypto";

type Rule = {
    tokens: Token[];
    depth: number;
    selector: string;
    atRules?: string[];
    dynamic: boolean;
    dependencies?: string[];
    exportedClasses: {
        newClassName: string;
        originalClassName: string;
    }[];
}


const newLine = `\n`;


export default function compile(ctx: Context) {

    const abstractSyntaxTree = createTree(ctx, ctx.strippedTokens);
    //console.log(ctx.tokens);
    //console.log(JSON.stringify(abstractSyntaxTree, null, 2))

    return createCss(abstractSyntaxTree, ctx);
}

function createCss(tree: {
    rules: Rule[];
    classes: Record<string, string>;
}, ctx: Context) {
    let css = "";

    const dynamic: {
        css: string;
        dependencies: string[];
        hash: string;
        exportedClasses: {
            newClassName: string;
            originalClassName: string;
        }[];
    }[] = [];
    const queryExtensions = ctx.queryExtensions.bind(ctx);
    const compress = ctx.config.compressed;
    const shiftBy = compress ? "" : ctx.config.indentationStyle;

    function createScope(branch: Rule, _i: number): string {
        let css = "";
        const trimmedSelector = trimSelector(branch.selector);
        // shifts the entire rule if it's nested inside an at rule
        let shift = "";

        if (branch.atRules?.length) {
            for (const atRule of branch.atRules) {
                css += `${shift}${atRule}${compress ? "{" : ` {${newLine}`}`;
                if (!compress)
                    shift += shiftBy;
            }
        }

        css += shift + `${queryExtensions("selector", trimmedSelector)}${compress ? "{" : ` {${newLine}`}`;
        for (const [i, token] of branch.tokens.entries()) {
            if (token.name === "propertyName")
                css += shift + queryExtensions("propertyName", `${shiftBy}${token.match}`, token);
            else if (token.name === "propertyColon")
                css += `${token.match}`;
            else if (token.name === "propertyValue") {
                const omitSemiColon = compress && ![
                    branch.tokens[i + 1]?.name,
                    branch.tokens[i + 2]?.name,
                ].includes("propertyName");
                const value = queryExtensions("propertyValue", token.match.trim(), token);

                css += `${compress ? "" : " "}${value}${value.endsWith(";") || omitSemiColon ? "" : ";"}${compress ? "" : newLine}`;
            }
            if (i + 1 === branch.tokens.length)
                css += shift + `}${compress ? "" : newLine}`;
        }
        if (branch.atRules?.length) {
            for (let i = 0; i < branch.atRules.length; i++) {
                if (!compress)
                    shift = shift.slice(0, shift.length - shiftBy.length);
                css += `${shift}}${compress ? "" : newLine}`;
            }
        }
        return css;
    }
    const optimizedRules = ctx.config.mergeRulesWhenPossible ? optimizer(tree.rules) : tree.rules;
    treeIteration: for (const [i, branch] of optimizedRules.entries()) {
        if (!branch.selector) {
            continue treeIteration;
        }
        if (branch.dynamic) {
            const css = createScope(branch, i);
            void dynamic.push({
                exportedClasses: branch.exportedClasses || [],
                css,
                dependencies: branch.dependencies ?? [],
                // TODO: cache
                hash: normalizeBase64(crypto.createHash("sha1").update(css).digest("base64")),
            });
        } else {
            css += createScope(branch, i);
        }
    }

    if (ctx.keyframes.length)
        css += createKeyframesScope(ctx, ctx.keyframes);


    return {
        classes: tree.classes,
        dynamic,
        static: css.trim(),
    };
}


function createKeyframesScope(ctx: Context, tokens: Token[]) {
    const compress = ctx.config.compressed;

    let css: string = "";
    const shiftBy = compress ? "" : ctx.config.indentationStyle;
    const queryExtensions = ctx.queryExtensions.bind(ctx);

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const name = token.renamed || token.name;




        if (["atSymbol", "keyframes", "keyframesWhiteSpace", "atKeyframes"].includes(name)) {
            css += `${token.match}`;
        } else if (["keyframesName"].includes(name)) {
            css += `${token.match}${compress ? "" : " "}{${compress ? "" : newLine}`;
        } else if (["keyframesSelector"].includes(name)) {
            if (tokens[i - 1].domain !== "selector")
                css += shiftBy;
            css += `${token.match.trim()}`;
        } else if (["keyframesSeparator"].includes(name)) {
            css += `,${compress ? "" : " "}`;
        } else if (["keyframesBlock"].includes(name)) {
            css += `${compress ? "" : " "}{${compress ? "" : newLine}`;
        } else if (["keyframesBlockPropertyName"].includes(name)) {
            css += `${shiftBy + shiftBy}${token.match}:${compress ? "" : " "}`;
        } else if (["keyframesPropertyValue"].includes(name)) {
            const value = queryExtensions("propertyValue", token.match.trim(), token);
            const semiColon = compress && tokens[i + 1]?.match.toString() === "}" ? "" : ";";
            css += `${value}${semiColon}${compress ? "" : newLine}`;
        } else if (["keyframesBlockEnd"].includes(name)) {
            const match = token.match.trim();
            if (/}/.test(match)) {
                css += `${shiftBy}}${compress ? "" : newLine}`
            }
        } else if (["keyframesScopeEnd"].includes(name)) {
            const match = token.match.trim();
            if (/}/.test(match)) {
                css += `}${compress ? "" : newLine}`
            }
        }

        // handles empty keyframes
        /* if (["atSymbol", "atKeyframes"].includes(name)) {
           const endIndex = tokens.slice(i).findIndex(v => (v.renamed || v.name) === "keyframesScopeEnd")
           const propertyIndex = tokens.slice(i).findIndex(v => (v.renamed || v.name) === "keyframesBlockPropertyName")

           if (endIndex < propertyIndex) {
               i = endIndex;
               continue;
           }
       } */
    }
    return css;
}


/** This removes non css friendly characters from base64 string */
function normalizeBase64(input: string) {
    return input
        .replace(/\+|=/g, "-")
        .replace(/\//g, "_");
}

function optimizer(rules: Rule[]): Rule[] {
    const optimizedRules: Rule[] = [];

    for (const [i, rule] of rules.entries()) {

        // Checking only last may seem naïve however, only last can be checked because of
        // specificity requirements. Deep checking for merges is not appropriate because of this.
        const last = rules?.[i - 1];
        if (last &&
            rule.atRules?.join(" ") === last.atRules?.join(" ") &&
            last.selector === rule.selector &&
            last.dynamic === rule.dynamic &&
            last.dependencies?.join(" ") === rule.dependencies?.join(" ")
        ) {
            rules[i - 1].tokens.push(...rule.tokens);
        } else {
            optimizedRules.push(rule);
        }
    }
    return optimizedRules;
}

function createTree(ctx: Context, tokens: Token[]): {
    rules: Rule[];
    classes: Record<string, string>;
} {

    const rules: Rule[] = [];
    const classes: Record<string, string> = {};
    function iterate(tokens: Token[], depth: number, parent = "", atRules: string[] = []) {
        // This flag is not necessary, it's the most performance way of detecting whether or not
        // the scope is useless (no properties) => omit.
        let hasBody = false;
        let currentSelector = "";
        let currentAtRule = "";
        let currentAtRules: string[] = atRules ?? []; // handles things like @media (formally nested at rules, see tokens.ts)
        const dynamicRules: Rule[] = [];
        const cTokens: Token[] = [];
        const children: number[] = [];
        const exportedClasses: {
            newClassName: string;
            originalClassName: string;
        }[] = [];
        tokenIteration: for (const [i, token] of tokens.entries()) {
            /** future optimization: don't push selectors */
            function register(token: Token) {
                if (token.name === "exportClassName") return void 0;
                void cTokens.push(token);
            }
            if (depth === token.depth) {
                if (token.renamed === "className" && tokens?.[i - 1]?.name === "exportClassName") {
                    const newClassName = generateNewClassName(token.match, ctx.config.randomizedExportedClassNameLength, ctx);
                    void exportedClasses.push({
                        newClassName,
                        originalClassName: camelCaseClassName(token.match),
                    });
                    classes[camelCaseClassName(token.match)] = newClassName;
                    void register({
                        ...token,
                        match: newClassName,
                    });
                } else {
                    void register(token);
                }

                if (token.name === "propertyValue") {
                    const isDynamic = /\$[a-zA-Z0-9-_]+/.test(token.match);

                    if (isDynamic) {
                        // extract the three most recent, this will be `background: red;` as in ["background", ":", "red;"]
                        const tokens = cTokens.splice(-3);
                        const dependencies = token.match.match(/\$[a-zA-Z0-9-_]+/g) ?? [];
                        const selector = interpolateParent(currentSelector, parent);
                        const existingRule = dynamicRules.findIndex(rule => {
                            return rule.selector === selector && rule.dependencies?.join(" ") === dependencies.join(" ") && rule.atRules?.join(" ") === atRules.join(" ");
                        });
                        const rule = {
                            selector,
                            depth,
                            tokens,
                            atRules: currentAtRules,
                            dynamic: true,
                            dependencies,
                            exportedClasses,
                        };
                        if (existingRule === -1)
                            void dynamicRules.push(rule);
                        else
                            void dynamicRules[existingRule].tokens.push(...rule.tokens);
                    } else {
                        hasBody = true;
                    }
                } else if (token.domain === "selector") {
                    // last token is used instead of iterating token because it may have changed beforehand
                    const last = cTokens[cTokens.length - 1];
                    if (token.attributes?.includes("atRule") /* && depth === token.depth */) {
                        currentAtRule += token.match;
                    } else if (!["exportClassName"].includes(token.name)) {
                        currentSelector += normalizeSelectorToken(last);
                    }
                } else if (token.name === "styleScopeEnd") {
                    break tokenIteration;
                }
                if (token.domain !== "selector") {
                    if (currentAtRule) currentAtRules.push(currentAtRule);
                    currentAtRule = "";
                }
            } else if (token.depth === depth + 1 && token.domain === "selector" && tokens?.[i - 1]?.domain !== "selector") {
                void children.push(i);
            }
        }

        const selector = interpolateParent(currentSelector, parent);
        if (hasBody)
            void rules.push({
                selector,
                depth,
                atRules: currentAtRules,
                tokens: cTokens,
                dynamic: false,
                exportedClasses,
            });
        void rules.push(...dynamicRules);
        for (const child of children) {
            void iterate(tokens.slice(child), depth + 1, selector, currentAtRules.map(v => v.trim()));
        }

    }
    void iterate(tokens, 0);

    return {
        rules,
        classes,
    };

}

function camelCaseClassName(className: string) {
    return className.replace(/[_-]+([a-zA-Z0-9])|[_-]+$/g, (_, m) => m?.toUpperCase() ?? "");
}

function normalizeSelectorToken(selectorToken: Token): string {
    switch (selectorToken.name) {
        case "combinator":
            return `${selectorToken.match} `;
        default:
            return selectorToken.match;
    }
}

function interpolateParent(selector: string, parents: string): string {

    return parents.split(/\s*,\s*/g).map(parent => {
        return selector.split(/\s*,\s*/g)
            .map(selector => {
                if (/&/.test(selector)) return selector.replace(/&/g, trimSelector(parent));
                else return `${parent} ${selector}`;
            })
            .join(", ")
    }).join(", ");
}

function generateRandomString(length: number) {
    const base = "ABCDEFGHJIKLMNOPQRSTUVWXYZabcdefghjiklmnopqrstuvwxyz0123456789";
    let string = "";
    do {
        string += base[~~(Math.random() * base.length)];
    } while (string.length !== length);
    return string;
}

function generateNewClassName(seed: string, length: number, ctx: Context) {
    if (ctx.classesCache.has(seed)) return ctx.classesCache.get(seed) as string;
    let name: string;
    const customPrefix = ctx.config.customExportedClassPrefix;
    const hasCustomPrefix = !/vcss|void/i.test(customPrefix);
    const prefix = `${hasCustomPrefix ? `${customPrefix}-vcss` : "vcss"}`
    do {
        name = `${seed}-${prefix}-${generateRandomString(length)}`;
    } while ([...ctx.classesCache.values()].find(v => v === name));
    void ctx.classesCache.set(seed, name);
    return name;
};

function trimSelector(selector: string) {
    return selector
        .replace(/\s+/g, " ")
        .replace(/^\s+|\s+(?=,)|\s$/gm, "");
}
