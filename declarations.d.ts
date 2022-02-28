declare module "*.vcss" {
    const content: (
        variables?: Record<
            string,
            | string
            | number
            | null
            | undefined
            | String
            | Number
            | Boolean
            | boolean
        >
    ) => Record<string, any>;
    export default content;
}
