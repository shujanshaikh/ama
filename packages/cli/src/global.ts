import path from "path"
import { AMA_DIR } from "./constant"

export namespace Global {
    export namespace Path {
        export const data = path.join(AMA_DIR, 'data')
    }
}
