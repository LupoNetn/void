import { NestMiddleware, Injectable } from "@nestjs/common";
import { Request, Response, NextFunction } from "express"



@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        console.log("Request: ", req.method, req.url)
        next()
    }
}

