import { HttpException, Injectable, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import type { FastifyRequest } from "fastify";
import { Profile, Strategy, VerifyCallback } from "passport-google-oauth20";

import { ENV } from "~/config/environments";
import { User } from "~/entities/user.entity";
import { UserRepository } from "~/lib/database/repositories/user.repository";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  private readonly logger: Logger;

  constructor(private readonly userRepository: UserRepository) {
    super({
      passReqToCallback: true,
      clientID: ENV.oauth.google.clientId,
      clientSecret: ENV.oauth.google.clientSecret,
      callbackURL: ENV.oauth.google.callbackURL,
      scope: ["email", "profile"],
    });
    this.logger = new Logger(this.constructor.name);
  }

  async validate(
    req: FastifyRequest,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    const { name, emails } = profile;
    this.logger.debug(profile);
    this.logger.debug(req.query);
    this.logger.debug(req.body);
    const email = emails?.[0].value;
    let user: User;

    if (!email) throw new HttpException("Unauthorized no email", 401);

    try {
      user = await this.userRepository.findByEmail(email);
      if (!user.oauthGoogleIdentifier) {
        user.oauthGoogleIdentifier = profile.id;
        await this.userRepository.update(user);
      }
    } catch (e) {
      user = await User.create({
        email,
        firstName: name?.givenName,
        lastName: name?.familyName,
        createdIP: req.ip,
      });
      user.isEmailConfirmed = !!profile._json.email_verified; // @this value is... sketchy to say the least
      user.oauthGoogleIdentifier = profile.id;
      user = await this.userRepository.create(user);
    }

    await this.userRepository.incrementLastLogin(user.id, req.ip);

    done(undefined, user);
  }
}
