import { HttpException, Injectable, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import type { Request } from "express";
import { Profile, Strategy } from "passport-github";
import { VerifyCallback } from "passport-google-oauth20";
import { ENV } from "~/config/configuration";
import { User } from "~/app/user/entities/user.entity";

import { UserRepo } from "~/app/user/repositories/repositories/user.repository";

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, "github") {
  private readonly logger: Logger;

  constructor(private readonly userRepository: UserRepo) {
    super({
      passReqToCallback: true,
      clientID: ENV.oauth.github.clientId,
      clientSecret: ENV.oauth.github.clientSecret,
      callbackURL: "http://localhost:3000/oauth2/github/callback",
      scope: ["email", "profile"],
    });
    this.logger = new Logger(this.constructor.name);
  }

  async validate(
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    const { emails } = profile;
    const email = emails?.[0].value;
    let user: User;

    if (!email) throw new HttpException("Unauthorized no email", 401);

    try {
      user = await this.userRepository.findByEmail(email);
      if (!user.oauthGithubIdentifier) {
        user.oauthGithubIdentifier = profile.id;
        await this.userRepository.save(user);
      }
    } catch (e) {
      user = await User.create({
        email,
        createdIP: req.ip,
      });
      user.isEmailConfirmed = true;
      user.oauthGithubIdentifier = profile.id;
      user = await this.userRepository.save(user);
    }

    await this.userRepository.incrementLastLogin(user, req.ip);

    done(undefined, user);
  }
}
