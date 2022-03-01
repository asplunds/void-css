import Token from "../../tokens/utils/Token";

export default function Rule(
    name: string,
    tokens: ReturnType<typeof Token>[],
) {
    return {
        name,
        tokens,
    } as const;
}
