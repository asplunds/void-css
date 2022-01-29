import Context from "../context";
import chalk from "chalk";

export function createCompilationError(ctx: Context, error: ReturnType<typeof createErrorContext>) {
    return `\n${highlightFormattedArea(ctx.css.replace(/\t/g, "    "), error)}
    
${chalk.yellow(`${chalk.white(chalk.bgRed("Error during Void CSS compilation:"))} ${error.message
        .replace(/\[([^\]]+)\]/g, (_, g) => {
            return chalk.grey(`[`) + chalk.bold(chalk.cyan(g)) + chalk.grey(`]`);
        })
        .replace(/'(.*?)'/g, (_, g) => {
            return chalk.grey(`‘`) + chalk.bold(chalk.cyan(g)) + chalk.grey(`’`);
        })
        .replace(/(^.*?\.)/g, chalk.red("$1"))}`)}`;
}

/**
 * only an estimate, cannot faithfully guarantee correct resolution due to
 * spaces in property values
 */
export function resolveEndOfPropertyValue(slice: string): number {
    const property = slice.slice(0, /[a-zA-Z-]+:/.exec(slice)?.index ?? slice.length);
    const newLines = property.match(/\n/g);
    const lastNewLine = (newLines?.reduce<number>(t => t + (property.slice(t).match(/\n/)?.index ?? 0) + 1, 0) ?? 1) - 1;
    return lastNewLine || (slice.match(/\:\s*[a-zA-Z0-9_-]+/)?.length ?? 0);
}
export function createErrorContext(message: string, start: number, end: number) {
    return {
        message,
        start,
        end,
    }
}

export function resolveSelectorNameNotFound(slice: string) {
    return (/[^a-zA-Z0-9_-].*?(?=[{\n])/.exec(slice)?.[0].length || 0);
}

// These are used to avoid expensive reduce functions
const interpolationStartId = `START__!<!${Date.now()}!>!__`;
const interpolationEndId = `END__!<!${Date.now()}!>!__`;

function highlightFormattedArea(rawFile: string, { start, end }: ReturnType<typeof createErrorContext>) {
    const file = rawFile.slice(0, start) + interpolationStartId + rawFile.slice(start, end - start) + rawFile.slice(start);
    const n = 2;
    const affectedLines = {
        start: file.slice(0, start).match(/\n/g)?.length ?? 0,
        end: (file.slice(0, end).match(/\n/g)?.length ?? 0) + 1,
    }

    const lines = file.split(/\n/);
    const interpolRegex = new RegExp(`${interpolationStartId}|${interpolationEndId}`, "g");
    const slicedLines = lines.slice(Math.max(affectedLines.start - n, 0), affectedLines.end + n);
    const highestNumber = affectedLines.end + slicedLines.length - n - 1;

    let initial = 0;
    const finalLines = slicedLines
        .map((line, i) => {
            if (i === 0 && i + affectedLines.start - 1 < 1) {
                initial = 1 - (i + affectedLines.start - 1);
            }
            const numbering = `${" ".repeat(Math.max((highestNumber + "").length - (i + affectedLines.start + "").length, 0))}${i + affectedLines.start - 1 + initial} | `;
            const match = interpolRegex.exec(line);
            const composedLine = `  ${numbering}${line}`;
            if (!match) return composedLine;
            const newLine = line.replace(interpolRegex, start === end ? " " : "");
            const repeatTilde = Math.max(1, Math.min(newLine.length - match.index, end - start));
            if (match[0].includes("END") && repeatTilde === 1) return composedLine.replace(interpolRegex, start === end ? " " : "");
            return [
                `${chalk.red(">") + chalk.reset()} ${numbering}${newLine}`,
                new Array(numbering.length + match.index + 3).fill("").join(" ") + chalk.red("^") + chalk.red("~".repeat(repeatTilde - 1)),
            ];
        })
        .flat(2);

    return finalLines/* .filter(line => !/^\d*\|*\s*$/.test(line)) */.join("\n");
}