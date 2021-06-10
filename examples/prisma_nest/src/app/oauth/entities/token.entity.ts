import { DateInterval, OAuthToken } from "@jmondi/oauth2-server";
import { IsUUID, Length } from "class-validator";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryColumn,
} from "typeorm";

import { Client } from "~/app/oauth/entities/client.entity";
import { ENV } from "~/config/configuration";
import { generateRandomToken } from "~/lib/utils/random_token";
import { Scope } from "~/app/oauth/entities/scope.entity";
import { User } from "~/app/user/entities/user.entity";

@Entity("oauth_tokens")
export class Token implements OAuthToken {
  @PrimaryColumn("varchar", { length: 128 })
  @Length(43, 128)
  readonly accessToken: string;

  @Column()
  accessTokenExpiresAt: Date;

  @Column("varchar", { nullable: true, length: 128 })
  @Index()
  @Length(43, 128)
  refreshToken?: string;

  @Column({ nullable: true })
  refreshTokenExpiresAt?: Date;

  @ManyToOne(() => Client)
  @JoinColumn({ name: "clientId" })
  client: Client;

  @Index()
  @Column("uuid")
  clientId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: "CASCADE", onUpdate: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user?: User;

  @Index()
  @Column("uuid", { nullable: true })
  @IsUUID()
  userId?: string;

  @ManyToMany(() => Scope, { onDelete: "CASCADE", onUpdate: "CASCADE" })
  @JoinTable({
    name: "oauth_token_scopes",
    joinColumn: { name: "tokenAccessToken", referencedColumnName: "accessToken" },
    inverseJoinColumn: { name: "scopeId", referencedColumnName: "id" },
  })
  scopes: Scope[];

  @CreateDateColumn()
  createdAt: Date;

  constructor(data?: Partial<Token>) {
    this.setClient(data?.client);
    this.setRefreshToken(data?.refreshToken);
    this.setUser(data?.user);
    this.accessToken = data?.accessToken ?? generateRandomToken();
    this.accessTokenExpiresAt =
      data?.accessTokenExpiresAt ?? new DateInterval(ENV.oauth.authorizationServer.accessTokenDuration).getEndDate();
  }

  get isRevoked() {
    return Date.now() > this.accessTokenExpiresAt.getTime();
  }

  revoke() {
    this.accessTokenExpiresAt = new Date(0);
    this.refreshTokenExpiresAt = new Date(0);
  }

  private setClient(client?: Client) {
    if (client) {
      this.client = client;
      this.clientId = client?.id;
    }
  }

  private setUser(user?: User) {
    if (user) {
      this.user = user;
      this.userId = user?.id;
    }
  }

  private setRefreshToken(refreshToken?: string) {
    if (refreshToken) {
      this.refreshToken = refreshToken ?? generateRandomToken();
      this.refreshTokenExpiresAt = new DateInterval(ENV.oauth.authorizationServer.refreshTokenDuration).getEndDate();
    }
  }
}
