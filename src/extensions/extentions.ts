import { Token } from "../context";

export type Events = "selector" | "propertyName" | "propertyValue";

export type Extension = {
    listen: Events[];
    onEvent: (event: Events, match: string, token?: Token) => string;
}
