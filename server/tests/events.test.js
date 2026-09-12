import request from "supertest";
import { describe, it, expect } from "vitest";

import { app } from "../src/app.js";
import { db } from "../src/db.js";

import { createTestUser } from "./helpers/userHelper.js";
import { createTestGroup } from "./helpers/groupHelper.js";
import { createTestEvent } from "./helpers/eventHelper.js";
import { Event } from "../src/models/eventModel.js";

describe("POST /groups/:id/events", () => {
  it("returns 401 when not authenticated", async () => {
    const owner = await createTestUser();
    const group = await createTestGroup(owner.id);

    const res = await request(app).post(`/groups/${group.id}/events`).send({
      title: "Concert",
      startDate: "2026-09-20T19:00:00.000Z",
      endDate: "2026-09-20T21:00:00.000Z",
      location: "Atlanta",
      description: "Test concert",
      votingEnds: "2026-09-15T19:00:00.000Z",
    });

    expect(res.status).toBe(401);
  });

  it("creates an event for an authenticated group member", async () => {
    const owner = await createTestUser({
      email: "owner@test.com",
    });

    const group = await createTestGroup(owner.id);

    const agent = request.agent(app);

    await agent.post("/users/login").send({
      email: "owner@test.com",
      password: "password123",
    });

    const res = await agent.post(`/groups/${group.id}/events`).send({
      title: "Concert",
      startDate: "2026-09-20T19:00:00.000Z",
      endDate: "2026-09-20T21:00:00.000Z",
      location: "Atlanta",
      description: "Test concert",
      votingEnds: "2026-09-15T19:00:00.000Z",
    });

    expect(res.status).toBe(201);

    expect(res.body.event).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        title: "Concert",
      }),
    );
  });
  it("stores the event under the correct group", async () => {
    const owner = await createTestUser({
      email: "owner@test.com",
    });

    const group = await createTestGroup(owner.id);

    const agent = request.agent(app);

    await agent.post("/users/login").send({
      email: "owner@test.com",
      password: "password123",
    });

    const res = await agent.post(`/groups/${group.id}/events`).send({
      title: "Concert",
      startDate: "2026-09-20T19:00:00.000Z",
      endDate: "2026-09-20T21:00:00.000Z",
      location: "Atlanta",
      description: "Test concert",
      votingEnds: "2026-09-15T19:00:00.000Z",
    });

    const eventId = res.body.event.id;

    const result = await db.query(
      `
        SELECT * 
        FROM events
        WHERE id = $1
        `,
      [eventId],
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].groupid).toBe(group.id);
  });

  it("stores the user who proposed the event", async () => {
    const owner = await createTestUser({
      email: "owner@test.com",
    });

    const group = await createTestGroup(owner.id);

    const agent = request.agent(app);

    await agent.post("/users/login").send({
      email: "owner@test.com",
      password: "password123",
    });

    const res = await agent.post(`/groups/${group.id}/events`).send({
      title: "Concert",
      startDate: "2026-09-20T19:00:00.000Z",
      endDate: "2026-09-20T21:00:00.000Z",
      location: "Atlanta",
      description: "Test concert",
      votingEnds: "2026-09-15T19:00:00.000Z",
    });

    const result = await db.query(
      `
      SELECT *
      FROM events
      WHERE id = $1
      `,
      [res.body.event.id],
    );

    expect(result.rows[0].proposed_by).toBe(owner.id);
  });
});
describe("Ticketmaster event creation", () => {
  it("returns 409 when the Ticketmaster event already exists in the group", async () => {
    const owner = await createTestUser({
      email: "owner@test.com",
    });

    const group = await createTestGroup(owner.id);

    await createTestEvent(group.id, owner.id, {
      ticketmasterId: "TM123",
    });

    const agent = request.agent(app);

    await agent.post("/users/login").send({
      email: "owner@test.com",
      password: "password123",
    });

    const res = await agent.post(`/groups/${group.id}/events`).send({
      title: "Duplicate Concert",
      startDate: "2026-09-20T19:00:00.000Z",
      endDate: null,
      location: "Atlanta",
      description: "Duplicate Ticketmaster event",
      votingEnds: "2026-09-15T19:00:00.000Z",
      ticketmasterId: "TM123",
    });

    expect(res.status).toBe(409);

    expect(res.body.error.message).toBe(
      "This Ticketmaster event is already in the group",
    );
  });
});

describe("POST /groups/:groupId/events/:eventId/vote", () => {
  it("returns 401 when not authenticated", async () => {
    const owner = await createTestUser();
    const group = await createTestGroup(owner.id);
    const event = await createTestEvent(group.id, owner.id);

    const res = await request(app)
      .post(`/groups/${group.id}/events/${event.id}/vote`)
      .send({
        vote: true,
      });

    expect(res.status).toBe(401);
  });
  it("allows a group member to vote yes", async () => {
    const owner = await createTestUser({
      email: "owner@test.com",
    });
    const member = await createTestUser({
      email: "member@test.com",
    });
    const group = await createTestGroup(owner.id);

    await db.query(
      `
      INSERT INTO group_members
        (group_id, user_id)
      VALUES
        ($1, $2)
      `,
      [group.id, member.id],
    );

    const event = await createTestEvent(group.id, owner.id);

    const agent = request.agent(app);

    await agent.post("/users/login").send({
      email: "member@test.com",
      password: "password123",
    });

    const res = await agent
      .post(`/groups/${group.id}/events/${event.id}/vote`)
      .send({
        vote: true,
      });

    expect(res.status).toBe(200);

    const result = await db.query(
      `
      SELECT *
      FROM event_votes
      WHERE eventid = $1
        AND userid = $2
      `,
      [event.id, member.id],
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].vote).toBe(true);
  });
  it("allows a user to change their vote", async () => {
    const owner = await createTestUser({
      email: "owner@test.com",
    });
    const member = await createTestUser({
      email: "member@test.com",
    });

    const group = await createTestGroup(owner.id);

    await db.query(
      `
      INSERT INTO group_members (group_id, user_id, role)
      VALUES ($1, $2, 'member')
    `,
      [group.id, member.id],
    );

    const event = await createTestEvent(group.id, owner.id);

    const agent = request.agent(app);

    await agent.post("/users/login").send({
      email: "owner@test.com",
      password: "password123",
    });

    await agent.post(`/groups/${group.id}/events/${event.id}/vote`).send({
      vote: true,
    });

    const res = await agent
      .post(`/groups/${group.id}/events/${event.id}/vote`)
      .send({
        vote: false,
      });

    expect(res.status).toBe(200);

    const result = await db.query(
      `
      SELECT *
      FROM event_votes
      WHERE eventid = $1
        AND userid = $2
      `,
      [event.id, owner.id],
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].vote).toBe(false);
  });
  it("deletes an event", async () => {
    const owner = await createTestUser({
      email: "owner@test.com",
    });

    const group = await createTestGroup(owner.id);

    const event = await createTestEvent(group.id, owner.id);

    const agent = request.agent(app);

    await agent.post("/users/login").send({
      email: "owner@test.com",
      password: "password123",
    });

    const res = await agent.delete(`/groups/${group.id}/events/${event.id}`);

    expect(res.status).toBe(200);

    const result = await db.query(
      `
    SELECT *
    FROM events
    WHERE id = $1
    `,
      [event.id],
    );

    expect(result.rows).toHaveLength(0);
  });
  it("closes an expired event without a majority", async () => {
    const owner = await createTestUser({
      email: "owner@test.com",
    });

    const group = await createTestGroup(owner.id);
    const event = await createTestEvent(group.id, owner.id);

    await db.query(
      `
      UPDATE events
      SET votingends = NOW() - INTERVAL '1 minute'
      WHERE id = $1
    `,
      [event.id],
    );

    await Event.closeExpiredEvents();

    const result = await db.query(
      `
      SELECT status
      FROM events
      WHERE id = $1
    `,
      [event.id],
    );

    expect(result.rows[0].status).toBe("closed");
  });
  it("rejects a vote when voting has expired", async () => {
    const owner = await createTestUser({
      email: "owner@test.com",
    });

    const group = await createTestGroup(owner.id);
    const event = await createTestEvent(group.id, owner.id);
    const agent = request.agent(app);

    await db.query(
      `
      UPDATE events
      SET votingends = NOW() - INTERVAL '1 minute'
      WHERE id = $1
    `,
      [event.id],
    );

    await agent.post("/users/login").send({
      email: "owner@test.com",
      password: "password123",
    });

    const res = await agent
      .post(`/groups/${group.id}/events/${event.id}/vote`)
      .send({
        vote: true,
      });

    expect(res.status).toBe(409);
  });
});
