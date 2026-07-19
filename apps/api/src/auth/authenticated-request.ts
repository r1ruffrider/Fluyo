import type { AuthenticatedIdentity } from "@fluyo/shared";
import type { Request } from "express";

export interface AuthenticatedRequest extends Request {
  identity?: AuthenticatedIdentity;
}
