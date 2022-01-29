import VoidCSS from "../../index";
import { expect, test } from "@jest/globals";
import { buildDesc, read, stripNewLines } from "../utilts";


const compile = VoidCSS();

const name = "className";

test(buildDesc(name), () => {
    expect(stripNewLines(compile(read("./className/className.test.vcss"))?.static ?? ""))
        .toEqual(stripNewLines(read("./className/className.test.css")));
});