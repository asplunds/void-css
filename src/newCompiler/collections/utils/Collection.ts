import Rule from "./Rule";

export default function Collection(name: string, rules: ReturnType<typeof Rule>[]) {
    return {
        name,
        rules,
    } as const;
}