import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { OrganizationJwtPayload } from "../interfaces/jwt-payload.interface.js";


export const CurrentOrg = createParamDecorator(
  (data: keyof OrganizationJwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const org = request.organization;

    if (!org) {
      return null;
    }

    return data ? org[data] : org;
  }
)