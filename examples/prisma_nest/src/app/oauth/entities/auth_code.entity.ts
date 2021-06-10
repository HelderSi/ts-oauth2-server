import { DateInterval, OAuthAuthCode } from "@jmondi/oauth2-server";
import { IsIn, IsOptional, IsUUID, Length } from "class-validator";
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

@Entity("oauth_auth_codes")
export class AuthCode implements OAuthAuthCode {
  @PrimaryColumn("varchar", { length: 128 })
  @Length(64, 128)
  code: string;

  @ManyToOne(() => User, { nullable: true, onDelete: "CASCADE", onUpdate: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user?: User;

  @Index()
  @Column("uuid", { nullable: true })
  @IsUUID()
  userId?: string;

  @ManyToOne(() => Client)
  @JoinColumn({ name: "clientId" })
  client: Client;

  @Index()
  @Column("uuid")
  @IsUUID()
  clientId: string;

  @Column({ nullable: true })
  redirectUri?: string;

  @Column("varchar", { nullable: true, length: 128 })
  codeChallenge?: string;

  @Column("varchar", { nullable: true, length: 128 })
  @IsOptional()
  @IsIn(["s256", "plain"])
  codeChallengeMethod?: string;

  @Column()
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToMany(() => Scope, { onDelete: "CASCADE", onUpdate: "CASCADE" })
  @JoinTable({
    name: "oauth_auth_code_scopes",
    joinColumn: { name: "authCodeCode", referencedColumnName: "code" },
    inverseJoinColumn: { name: "scopeId", referencedColumnName: "id" },
  })
  scopes: Scope[];

  revoke() {
    this.expiresAt = new Date(0);
  }

  constructor(data?: Partial<AuthCode>) {
    this.setClient(data?.client);
    this.setUser(data?.user);
    if (data?.scopes) this.scopes = data.scopes;
    this.code = data?.code ?? generateRandomToken();
    this.expiresAt = data?.expiresAt ?? new DateInterval(ENV.oauth.authorizationServer.authCodeDuration).getEndDate();
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

  get isExpired(): boolean {
    console.log(new Date(), this.expiresAt);
    return new Date() > this.expiresAt;
  }
}

export const addDays = (date: Date, days: number) => {
  date.setDate(date.getDate() + days);
  return date;
};
