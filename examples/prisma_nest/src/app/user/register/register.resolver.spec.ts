import { TestingModule } from "@nestjs/testing";
import { validate } from "class-validator";
import faker from "faker";

import { EmailConfirmationRepository } from "~/lib/database/repositories/email_confirmation.repository";
import { UserRepository } from "~/lib/database/repositories/user.repository";
import { createTestingModule } from "~test/app_testing.module";
import { generateUser } from "~test/generators/generateUser";
import { mockContext } from "~test/mock_application";
import { emails } from "~test/mock_email_service";
import { UserModule } from "~/app/user/user.module";
import { RegisterInput } from "~/app/user/register/register.input";
import { RegisterResolver } from "~/app/user/register/register.resolver";

describe("register.resolver", () => {
  let moduleRef: TestingModule;
  let userRepository: UserRepository;
  let context: any;

  beforeEach(async () => {
    moduleRef = await createTestingModule({ imports: [UserModule] });
    context = mockContext();
    userRepository = moduleRef.get<UserRepository>(UserRepository);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  describe("register function", () => {
    test("valid register input is validated correctly", async () => {
      // arrange
      const validInput = new RegisterInput();
      validInput.email = faker.internet.exampleEmail();

      // act
      const validationErrors = await validate(validInput);

      // assert
      expect(validationErrors.length).toBe(0);
    });

    test("invalid register input has errors thrown", async () => {
      // arrange
      const validInput = new RegisterInput();
      validInput.email = "invalid@email";

      // act
      const validationErrors = await validate(validInput);

      // assert
      expect(validationErrors.length).toBe(1);
    });

    test.only("duplicate user id is denied", async () => {
      // arrange
      const resolver = moduleRef.get<RegisterResolver>(RegisterResolver);
      const input = new RegisterInput();
      input.id = "b031765a-a950-4a0d-92dd-ecd12788f3a6n";
      input.email = faker.internet.exampleEmail();
      await userRepository.create(await generateUser(input));

      // act
      const result = resolver.register(input, context);

      // assert
      await expect(result).rejects.toThrowError("duplicate id for user");
    });

    test("duplicate user emails is denied", async () => {
      // arrange
      const resolver = moduleRef.get<RegisterResolver>(RegisterResolver);
      const input = new RegisterInput();
      input.email = faker.internet.exampleEmail();
      await userRepository.create(await generateUser(input));

      // act
      const result = resolver.register(input, context);

      // assert
      await expect(result).rejects.toThrowError("duplicate emails for user");
    });

    test("user is registered with emails confirmation", async () => {
      // arrange
      const resolver = moduleRef.get<RegisterResolver>(RegisterResolver);
      const input = new RegisterInput();
      input.email = faker.internet.exampleEmail();

      // act
      const result = await resolver.register(input, context);

      // assert
      const emailConfirmationRepository = moduleRef.get<EmailConfirmationRepository>(EmailConfirmationRepository);
      const emailConfirmation = await emailConfirmationRepository.findByEmail(input.email);
      expect(result).toBeTruthy();
      expect(result.id).toBe(emailConfirmation.user.id);
      expect(result.email).toBe(input.email.toLowerCase());
      expect(result.isEmailConfirmed).toBeFalsy();
      expect(emails.length).toBe(1);
      expect(emails[0].to).toBe(input.email.toLowerCase());
      expect(emails[0].context!.url).toBe(`http://localhost/verify_email?e=${result.email}&u=${emailConfirmation.id}`);
    });
  });

  describe("resentConfirmEmail", () => {
    test("resend emails function works", async () => {
      // arrange
      const resolver = moduleRef.get<RegisterResolver>(RegisterResolver);
      const input = new RegisterInput();
      input.email = faker.internet.exampleEmail();
      await resolver.register(input, context);

      // act
      const result = await resolver.resendConfirmEmail(input.email);

      // assert
      expect(result).toBe(true);
      expect(emails.length).toBe(2);
      expect(emails[0].template).toBe("auth/register");
      expect(emails[1].template).toBe("auth/register");
    });

    test("resend emails throws for invalid user", async () => {
      // arrange
      const resolver = moduleRef.get<RegisterResolver>(RegisterResolver);

      // act
      const result = resolver.resendConfirmEmail("user-does-not-exist@example.com");

      // assert
      await expect(result).rejects.toThrow(new RegExp("No EmailConfirmationToken found"));
      expect(emails.length).toBe(0);
    });
  });
});
