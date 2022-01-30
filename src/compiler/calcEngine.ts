

/** Calcify cache does not need to be tied to a context because the engine is pure and not
 * dependant on any state. */
 const cache = new Map<string, string>();
 const arithmetic = /[-+/*]/;
 
 
 /**
  * Wrap css arithmetic operations in calc
  */
 export default function calcify(input: string): string {
     
     if (!arithmetic.test(input)) return resolveForwardSlashes(input);
     if (cache.has(input)) return cache.get(input) as string;
 
     const terms = operands(input);
 
     // Here everything outside a function such as translateX are resolved
     const reduced = reduce(terms);
 
     // Resolve non calc functions such as translateX
     const resolved = reduced.map(term => {
         if (!arithmetic.test(term)) return term;
         const match = /^(?<name>[a-zA-Z]*)\((?<funcArgument>.*?)\)$/.exec(term);
         if (!match) return term;
         const {
             funcArgument,
             name
         } = match?.groups ?? {};
 
         if (funcArgument && !["calc", "var"].includes(name)) {
             const resolvedArgument = reduce(operands(funcArgument)).join("");
             if (!name) return resolvedArgument;
             console.log("yes")
             return `${name}(${resolvedArgument})`;
         }
         return term;
     }).join("");
 
     const slashResolved = resolveForwardSlashes(resolved);
 
     void cache.set(input, slashResolved);
 
     return slashResolved;
 }
 
 /**
  * This function handles the unfortunate scenario where particularly grid properties containing
  * forward slashes have to be remade.
  * 
  * `|` -> `/`
  * 
  * `\/` -> `/`
  * 
  * This transforming behavior can be ignored by preceding with a backslash, in which case the escaped
  * forward slash will be ignored by the compiler and can be used normally according to css specification.
  * 
  * unless escaped with backslash or as pipe character, forward slash characters will be treated as
  * arithmetic division operator.
  */
 function resolveForwardSlashes(value: string) {
     return value.replace(/(?<!\\)(?:\\\/|\|)/g, "/");
 }
 
 function reduce(terms: string[]): string[] {
     const operatorIndex = ((terms) => {
         //for (const [i, m] of terms.entries()) if (/^\s+\*\*\s+$/.test(m)) return i;
         for (const [i, m] of terms.entries()) if (/^\s+[\/\*]\s+$/.test(m)) return i;
         for (const [i, m] of terms.entries()) if (/^\s+[\+\-]\s+$/.test(m)) return i;
         return 0;
     })(terms);
 
     if (operatorIndex) {
         const [left, operator, right] = [terms[operatorIndex - 1], terms[operatorIndex], terms[operatorIndex + 1]];
         if (isOperand(left) && isOperand(right)) {
             return reduce([...terms.slice(0, operatorIndex - 1), `calc(${[left, operator, right].join("").replace("calc(", "(")})`, ...terms.slice(operatorIndex + 2)]);
         }
         return terms;
     } else {
         return terms;
     }
 }
 
 function isOperand(input: string | undefined): boolean {
     if (!input) return false;
 
     return /(?:\-\-|\$)[a-zA-Z0-9-_]+|\d*\.?-?\d+[a-zA-Z]*|^[a-zA-Z%]+\(/.test(input);
 }
 
 function operands(input: string) {
 
     const tokens = input.split(/((?:\-\-|\$)[a-zA-Z0-9-_]+|\s+(?:[\+\-\/\*]|\*\*)\s+|[a-zA-Z]+\(|\s+|-?\d*\.?\d+[a-zA-Z%]*|.)/g);
     const result: string[] = [];
     let resolvingParenthesis = false;
     let depth = 0;
     for (const token of tokens) {
         if (resolvingParenthesis && token) {
             result[result.length - 1] += token;
         } else if (token) {
             result.push(token);
         }
 
         if (/[a-zA-Z]*\(/.test(token)) {
             if (!resolvingParenthesis) {
                 resolvingParenthesis = true;
             } else {
                 depth++;
             }
         } else if (token === ")") {
 
             if (resolvingParenthesis && depth === 0) {
                 resolvingParenthesis = false;
             } else if (resolvingParenthesis) {
                 depth--;
             }
         }
     }
     return result;
 }