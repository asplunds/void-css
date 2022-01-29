import VoidCSS from "../../index";
import { expect, test } from "@jest/globals";
import { buildDesc, read, stripNewLines } from "../utilts";


const compile = VoidCSS();

const name = "exportClass";


test(buildDesc(name), () => {
   
    const compiled = compile(read(`./${name}/${name}.test.vcss`));

    expect(Object.keys(compiled?.classes ?? {})).toStrictEqual(["testClass"])

});