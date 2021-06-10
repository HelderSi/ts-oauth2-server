import { Injectable, NestMiddleware } from "@nestjs/common";
import { FastifyRequest, FastifyReply } from "fastify";

import { UserRepository } from "~/lib/database/repositories/user.repository";
import { fromFastifyAuthHeaderAsBearerToken } from "~/app/auth/strategies/jwt.strategy";
import { AccessTokenJWTPayload } from "~/app/auth/dto/refresh_token.dto";
import { TokenService } from "~/app/auth/services/token.service";

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly userRepository: UserRepository, private readonly tokenService: TokenService) {}

  async use(req: FastifyRequest, res: FastifyReply, next: any) {
    const accessToken = fromFastifyAuthHeaderAsBearerToken(req);

    if (typeof accessToken !== "string") {
      next();
      return;
    }

    try {
      const decoded: AccessTokenJWTPayload = await this.tokenService.verifyToken<AccessTokenJWTPayload>(accessToken);
      const user = await this.userRepository.findById(decoded.userId, { include: { roles: true, permissions: false } });
      if (Number(decoded.tokenVersion) === Number(user.tokenVersion)) {
        req.user = user;
      }
    } catch (e) {
      console.log(e);
    }

    next();
  }
}
