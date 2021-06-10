import { IsEmail } from "class-validator";
import { Field, InputType } from "@nestjs/graphql";

@InputType()
export class LoginInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  password: string;

  @Field()
  rememberMe: boolean;
}
