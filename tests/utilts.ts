import fs from "fs";
import path from "path";

export function read(loc: string) {
    return fs.readFileSync(path.resolve("./tests/", loc), "utf-8");
}

export function stripNewLines(input: string): string {
    return input.replace(/[\n\r]+\s*/g, "\n");
}

export function buildDesc(name: string): string {
    return `${name} compilation`;
}