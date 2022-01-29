import varify from "../compiler/autoVarEngine";
import calcify from "../compiler/calcEngine";
import { Extension } from "./extentions";




export const autoVar = (): Extension => {
    return {
        listen: ["propertyValue"],
        onEvent: (event, match: string) => {
            return varify(match);
        }
    }
}

export const autoCalc = (): Extension => {
    return {
        listen: ["propertyValue"],
        onEvent: (event, match: string) => {
            return calcify(match);
        }
    }
}