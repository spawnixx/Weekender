import request from "supertest";
import { describe, it, expect } from "vitest";
import { app } from "../src/app.js";
import { createTestUser } from "./helpers/userHelper.js";
import { db } from "../src/db.js";

describe("POST /users/login", () => {
  it("returns 401 when email does not exist", async () => {
    const res = await request(app).post("/users/login").send({
      email: "doesnotexist@test.com",
      password: "password123",
    });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Invalid email or password");
  });

  it("returns 401 when the password is wrong", async () => {
    await createTestUser();

    const res = await request(app).post("/users/login").send({
      email: "john@test.com",
      password: "thisisnotthepassword",
    });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Invalid email or password");
  });

  it("returns 400 when email/password missing", async () => {
    const res = await request(app).post("/users/login").send({
      email: "john@test.com",
    });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Email and password required");
  });

  it("Logs in successfully", async () => {
    await createTestUser();
    const res = await request(app).post("/users/login").send({
      email: "john@test.com",
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBeDefined();
    expect(res.body.user.firstName).toBe("John");
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.headers["set-cookie"][0]).toContain("jwt=");
    expect(res.headers["set-cookie"][0]).toContain("HttpOnly");
  });
});

describe("POST /users/register", () => {
  const validUser = {
    firstName: "John",
    lastName: "Doe",
    email: "john@test.com",
    password: "password123",
  };
  it.each([["firstName"], ["lastName"], ["email"], ["password"]])(
    "returns 400 when %s is missing",
    async (missingField) => {
      const userData = { ...validUser };

      delete userData[missingField];

      const res = await request(app).post("/users/register").send(userData);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe("All fields are required");
    },
  );

  it("Returns 400 when email already in use", async () => {
    await createTestUser();
    const res = await request(app).post("/users/register").send({
      firstName: "John",
      lastName: "Doe",
      email: "john@test.com",
      password: "password123",
    });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Email already in use.");
  });
  it("Registers the user Successfully", async () => {
    const res = await request(app).post("/users/register").send(validUser);
    const verify = await db.query(
      `
        SELECT *
        FROM users
        WHERE email = $1  
        `,
      ["john@test.com"],
    );
    expect(res.status).toBe(201);
    expect(res.body.user).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        firstname: "John",
        lastname: "Doe",
        email: "john@test.com",
      }),
    );
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.headers["set-cookie"][0]).toContain("jwt=");
    expect(res.headers["set-cookie"][0]).toContain("HttpOnly");
    expect(verify.rows).toHaveLength(1);
    expect(verify.rows[0].password).not.toBe("password123");
  });
});

describe("GET /users/profile", () => {
  it("returns 401 when user is not authenticated", async () => {
    const res = await request(app).get("/users/profile");

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe(
      "Invalid or expired authentication token",
    );
  });
  it("returns the logged-in user", async () => {
    await createTestUser();

    const agent = request.agent(app);

    const loginRes = await agent.post("/users/login").send({
      email: "john@test.com",
      password: "password123",
    });

    expect(loginRes.status).toBe(200);

    const profileRes = await agent.get("/users/profile");

    expect(profileRes.status).toBe(200);

    expect(profileRes.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        firstname: "John",
        lastname: "Doe",
        email: "john@test.com",
      }),
    );
  });
});

describe("PATCH /users/profile", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(app).patch("/users/profile").send({
      firstName: "Jane",
    });

    expect(res.status).toBe(401);
  });
  it("updates identity fields", async () => {
    await createTestUser();

    const agent = request.agent(app);

    await agent.post("/users/login").send({
      email: "john@test.com",
      password: "password123",
    });

    const res = await agent.patch("/users/profile").send({
      firstName: "Johnny",
      lastName: "Doe",
      email: "johnny@test.com",
    });

    expect(res.status).toBe(200);

    const updatedUser = res.body;

    expect(updatedUser).toEqual(
      expect.objectContaining({
        firstname: "Johnny",
        lastname: "Doe",
        email: "johnny@test.com",
      }),
    );
  });

  it("rejects password change with wrong current password", async () => {
    await createTestUser();

    const agent = request.agent(app);

    await agent.post("/users/login").send({
      email: "john@test.com",
      password: "password123",
    });

    const res = await agent.patch("/users/profile").send({
      currentPassword: "wrongpassword",
      newPassword: "newpassword123",
    });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Current password is incorrect");
  });

  it("changes the password successfully", async () => {
    await createTestUser();

    const agent = request.agent(app);

    await agent.post("/users/login").send({
      email: "john@test.com",
      password: "password123",
    });

    const res = await agent.patch("/users/profile").send({
      currentPassword: "password123",
      newPassword: "newpassword123",
    });

    expect(res.status).toBe(200);

    const loginWithNewPassword = await request(app).post("/users/login").send({
      email: "john@test.com",
      password: "newpassword123",
    });

    expect(loginWithNewPassword.status).toBe(200);
  });
});
