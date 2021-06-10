import { Module } from "@nestjs/common";
import nunjucks from "nunjucks";

import { EmailModule } from "~/app/email/email.module";
import { LoggerModule } from "~/lib/logger/logger.module";
import { QueueModule } from "~/app/queue/queue.module";
import { SendEmailProcessor } from "~/app/queue/processors/email/send_email.processor";
import { DatabaseModule } from "~/lib/database/database.module";
import { ENV } from "~/config/environments";

@Module({
  imports: [EmailModule, LoggerModule, QueueModule, DatabaseModule],
  providers: [SendEmailProcessor],
})
export class QueueWorkerModule {
  constructor() {
    nunjucks.configure(ENV.templatesDir, {
      autoescape: true,
    });
  }
}
