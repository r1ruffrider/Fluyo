import { IsEmpty } from "class-validator";

export class CreatePortalSessionDto {
  @IsEmpty()
  customerId?: never;

  @IsEmpty()
  returnUrl?: never;
}
