declare module "*.txt" {
    const content: string;
    export default content;
}

declare module "*.vcss" {
    const content: (variables: Record<string, string | number | null | undefined | String | Number>) => Record<string, string>;
    export default content;
}
declare module "*.void" {
    const content: (variables: Record<string, string | number | null | undefined | String | Number>) => Record<string, string>;
    export default content;
}