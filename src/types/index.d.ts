declare global {
    module "*.vcss" {
        const content: (variables: Record<string, string | number | null | undefined | String | Number>) => Record<string, string>;
        export default content;
    }
    module "*.void" {
        const content: (variables: Record<string, string | number | null | undefined | String | Number>) => Record<string, string>;
        export default content;
    }
}