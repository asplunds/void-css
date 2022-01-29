export type VoidCSSConfiguration = {
    /**
     * Setting this value to `true` will strip all unnecessary whitespace.
     * This option will make the output css less human readable.
     * 
     * This setting is recommended for production as it decreases the output
     * file size thereby improving load times
     * 
     * **Default**: `false`
     * 
     * **Compile speed**: *unaffected*
     * 
     * **Output file**: *smaller*
     */
    readonly compressed?: boolean;

    /**
     * Dictates which indentation style will be used for the output css.
     * Common values for this configuration is 2 spaces, 4 spaces or tab (`\t`) character.
     * **Note:** this setting is obsolete of the setting `compressed` is `true`.
     * 
     * **Default**: `"  "`
     * 
     * **Compile speed**: *unaffected*
     * 
     * **Output file**: *mostly unaffected*
     */
    readonly indentationStyle?: string;


    /**
     * A prefix to prepend to export class names. This value, if specified,
     * will be added *before* each exported class name.
     * 
     * **Default**: `"vcss"`
     * 
     * **Compile speed**: *unaffected*
     * 
     * **Output file**: `size increase` ∝ `<value> length`
     */
    readonly customExportedClassPrefix?: string;


    /**
     * Specifies the number of random characters appended to each class name.
     * A greater value corresponds to less chance of collisions, it's important
     * to note that a value of `5` is already astronomically unlikely to collide
     * it's therefore only recommended to decrease this value to improve performance
     * however, that is rarely necessary. Use at own discretion.
     * 
     * **Default**: `5`
     * 
     * **Compile speed**: `speed decrease` ∝ `<value>`
     * 
     * **Output file**: `size increase` ∝ `<value>`
     */
    readonly randomizedExportedClassNameLength?: number;

    /**
     * Merge rules with the same selectors and nested [at-rules](https://developer.mozilla.org/en-US/docs/Web/CSS/At-rule).
     * If set to `true` this option will ensure that rules and merged together when possible.
     * This improves legibility but hurts performance.
     * 
     * **Default**: `true`
     * 
     * **Compile speed**: `true` -> slower
     * 
     * **Output file**: `true` -> more readable and smaller
     */
    readonly mergeRulesWhenPossible?: boolean;

    /**
     * Specify a license/copyright notice at the top of the stylesheet.
     * 
     * **Default**: `""`
     * 
     * **Compile speed**: *unaffected*
     * 
     * **Output file**: `size increase` ∝ `<value> size`
     */
    readonly stylesheetLicenseNotice?: string;
}

type Concrete<Type> = {
    -readonly [Property in keyof Type]-?: Type[Property];
};

export class Config {
    private defaultConfig: Concrete<{ [Property in keyof VoidCSSConfiguration]: VoidCSSConfiguration[Property] }> = {
        compressed: false,
        indentationStyle: "  ",
        customExportedClassPrefix: "vcss",
        randomizedExportedClassNameLength: 5,
        mergeRulesWhenPossible: true,
        stylesheetLicenseNotice: "",
    };

    constructor (private inputConfig: VoidCSSConfiguration) {}

    get conf() {
        return {
            ...this.defaultConfig,
            ...this.inputConfig,
        }
    }
}