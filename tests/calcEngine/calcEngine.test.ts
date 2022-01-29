import { expect, test } from "@jest/globals";
import calcify from "../../src/compiler/calcEngine";



const tests = [
    ["1 \\/ 2", "1 / 2"],
    ["1 | 2", "1 / 2"],
    ["red", "red"],
    ["transition 30ms background ease-in-out", "transition 30ms background ease-in-out"],
    ["10px + 20vh", "calc(10px + 20vh)"],
    ["3 * (2 - 10px)", "calc(3 * (2 - 10px))"],
    ["rotateZ(20deg + .5turn) skew(30deg * --rotate)", "rotateZ(calc(20deg + .5turn)) skew(calc(30deg * --rotate))"],
    ["calc(10px + 20vh)", "calc(10px + 20vh)"],
    ["min(10px - 30px, 40%) + 30px", "calc(min(10px - 30px, 40%) + 30px)"],
    ["10px + 20vh * (20px - 30px * 4 + 44px - 20%)", "calc(10px + (20vh * (20px - 30px * 4 + 44px - 20%)))"],
];

test("calc engine", () => {

    for (const [input, output] of tests) {
        expect(output).toBe(calcify(input));
    }

    // test cache
    for (const [input, output] of tests) {
        expect(calcify(input)).toBe(output);
    }

});