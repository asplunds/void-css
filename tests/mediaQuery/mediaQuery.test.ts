import VoidCSS from "../../index";
import { expect, test } from "@jest/globals";
import { buildDesc, read, stripNewLines } from "../utilts";


const compile = VoidCSS();

const name = "mediaQuery";

test(buildDesc(name), () => {
    expect(stripNewLines(compile(read(`./${name}/${name}.test.vcss`))?.static ?? ""))
        .toEqual(stripNewLines(read(`./${name}/${name}.test.css`)));
});