
/**
 * Replaces --variable?fallback with var(--variable, fallback).
 * fallback is optional.
 * Nesting is supported.
 * 
 * @param match css property
 * @returns transformed property
 */
export default function varify(match: string): string {
    return match.replace(/(?<!var\s*\()(?<name>--[a-zA-Z0-9-_]+)(?:\?(?<fallback>(?:[^\s])+))?/g, (_, ...groups) => {
        const [name, fallback] = groups as [string, string | undefined];
        const resolved = /^--/.test(fallback ?? "") ? varify(fallback ?? "") : fallback;
        return `var(${name}${fallback ? `, ${resolved}` : ""})`
    });
}

