export default function Token(
    regex: RegExp,
    context: {
        name: string;
        domain: string;
        attributes?: string[];
    }
) {
    return {
        regex,
        ...context,
    } as const;
}
