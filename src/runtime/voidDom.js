const initialState = {
    previousInput: null,
    dynamicStyles: [],
    counter: 0,
    previousClasses: null,
    usedClasses: [],
    usedStyleElements: [],
    initiated: false,
}
var state = JSON.parse(JSON.stringify(initialState));


function styler(...args) {
    return args.join(";");
}
function log(...args) {
    const debug = !!window.__voidCSSDebugEnabled;

    if (debug) {
        return void console.log(
            "« %cVoid %cCSS » [%cDebug%c]",
            styler("color: #ad83fc", "font-weight: bold", "font-size: 16px"),
            styler("color: #fff", "font-size: 16px"),
            styler("color: lightgreen"),
            styler(""),
            ...args,
        );
    }
}

const handler = {
    get: function (target, prop) {

        var exportedClass = target._getExportedClass(prop);

        if (!exportedClass && ["destroy", "_destroy"].includes(prop)) {
            return target.destroy;
        }

        if (exportedClass === null) {
            var action = "log";
            if (console.hasOwnProperty("warn")) {
                action = "warn";
            }
            console[action]([
                "[Void CSS] - Class '" + prop + "' is accessed but not exported from file '" + (filePath || "unknown") + "' ",
                "To export classes use the double dot (..) syntax prepended to the class name. ",
                "This is not a fatal error, only a warning."
            ].join("\n"));
            return "";
        } else {
            return exportedClass;
        }
    }
}

function ClassManager(classes) {
    this._exportedClasses = classes;
    this._getExportedClass = function (key) {
        if (!this._exportedClasses.hasOwnProperty(key)) {
            return null;
        }
        return this._exportedClasses[key] || "";
    }

    this.destroy = function () {
        void log("Stylesheet destroyed, state reset and styles removed. (for dev) hmr issue may occur, refresh the page");
        for (const element of state.usedStyleElements) {
            try {
                element.remove();
            } catch (e) {
                console.error("Something went wrong while destroying Void CSS", e);
            }
        }
        state = JSON.parse(JSON.stringify(initialState));
    }
}

function init() {
    void log("Initiated styles");
    const rID = resolveID("static", id);
    const style = document.getElementById(rID) || createStyleElement(rID);
    style.innerHTML = compiled.static;
    state.initiated = true;
}

function resolveID(...args) {
    return args.join("-");
}

function createStyleElement(id) {

    const style = document.createElement("style");
    const attributes = [
        ["vcss", ""],
        ["type", "text/css"],
        ["id", id],
    ];
    for (const [name, value] of attributes) {
        if (value !== false) {
            style.setAttribute(name, value);
        }
    }

    void state.usedStyleElements.push(style);
    void document.head.appendChild(style);

    return style;
}

function voidCSSAssembler(input) {
    void log("Assembler called", input);

    if (!state.initiated) {
        init();
    }

    if (input !== undefined && input.toString() !== "[object Object]") {
        const error = new TypeError(`Invalid Void CSS style input given, expected "undefined" or "Object" instead received "${input}".`);
        (console.error || console.log)(error);
        return new window.Proxy(new ClassManager(compiled.classes), handler);
    } else if (!compiled.dynamic.length) {
        return new window.Proxy(new ClassManager(compiled.classes), handler);
    }
    let classNames = compiled.classes;
    /* if (JSON.stringify(state.previousInput) === JSON.stringify(input))
        return new window.Proxy(new ClassManager(classNames), handler); */

    // cleanup must be before new classes are generated, otherwise new styles are removed
    window.requestAnimationFrame(() => {
        void cleanUnusedClasses();
    });

    for (const rule of compiled.dynamic) {

        if (rule.exportedClasses.length) {
            const { newClasses, combinedNewClasses, style } = updateDynamicStyle(rule, input, classNames);
            void state.usedClasses.push({
                classNames: Object.values(newClasses),
                style,
            });

            classNames = {
                ...classNames,
                ...combinedNewClasses,
            };
        } else {
            void updateGenericDynamicStyle(rule, input);
        }

    }

    state.previousInput = input;

    return new window.Proxy(new ClassManager(classNames), handler);
}

function cleanUnusedClasses() {
    for (const { classNames, style } of state.usedClasses) {
        const selector = classNames.reduce((t, c) => t + "." + c, "");
        try {
            const search = document.querySelector(selector);
            if (!search) {
                style.remove();
            }
        } catch (e) { console.error(e) }
    }
}

/** handles generic dynamic styles (no exported classes) */
function updateGenericDynamicStyle(rule, input) {
    void log("Updating generic dynamic rule: ", rule, "input: ", input);

    // Ensures that rule is only updated if new styles are available
    if (!input || !rule.dependencies.some(dependency => input.hasOwnProperty(dependency.slice(1)))) {
        return void log("Did not update generic dynamic rule because it has no new styles to consume.");
    }

    const localID = resolveID("dynamic-generic", rule.hash, id);
    const css = interpolateDynamicStyles(rule, input);
    const style = document.getElementById(localID) || createStyleElement(localID);
    void log("New generic dynamic styles: ", css);
    style.innerHTML = css;
}

/** handles dynamic styles with exported classes (trickier) */
function updateDynamicStyle(rule, input, existingClassNames) {

    const combinedNewClasses = {};
    const newClasses = {};
    let css = interpolateDynamicStyles(rule, input);

    for (const { newClassName, originalClassName } of rule.exportedClasses) {
        // TODO refactor to compile... why regex every time? 
        const replace = `v-${newClassName.match(/(?:vcss)?-([a-zA-Z0-9]+)$/)[1]}-${++state.counter}`;
        css = css.replace(new RegExp(newClassName, "g"), replace);
        const check = existingClassNames[originalClassName];
        const result = `${check || newClassName} ${replace}`;
        combinedNewClasses[originalClassName] = result;
        newClasses[originalClassName] = replace;
    }

    const style = createStyleElement(false);
    style.innerHTML = css;

    return {
        combinedNewClasses,
        newClasses,
        style,
    };
}

function interpolateDynamicStyles(rule, input) {
    if (!input) {
        return rule.css;
    }
    return rule.css.replace(new RegExp(rule.dependencies.join("|").replace(/\$/g, "\\$"), "g"), (match) => {
        return input[match.slice(1)] || "";
    });
}

function voidCSS() {
    void init();

    return voidCSSAssembler;
}