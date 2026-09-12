import { db } from "../db.js";

export class Event {
  static async createEvent(eventData) {
    const {
      groupId,
      title,
      startDate,
      endDate,
      location,
      latitude,
      longitude,
      googleMapsApiId,
      ticketmasterId,
      eventImageUrl,
      description,
      votingEnds,
      proposedBy,
    } = eventData;
    const res = await db.query(
      `
        INSERT INTO events (
        groupId,
        title,
        startDate,
        endDate,
        location,
        latitude,
        longitude,
        googleMapsApiId,
        ticketmasterId,
        eventImageUrl,
        description,
        votingEnds,
        proposed_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        RETURNING *
        `,
      [
        groupId,
        title,
        startDate,
        endDate,
        location,
        latitude,
        longitude,
        googleMapsApiId,
        ticketmasterId,
        eventImageUrl,
        description,
        votingEnds,
        proposedBy,
      ],
    );
    return res.rows[0];
  }

  static async findById(id) {
    const res = await db.query(
      `
        SELECT *
        FROM events
        WHERE id = $1
        `,
      [id],
    );
    return res.rows[0];
  }

  static async findByIdWithMembers(eventId, groupId) {
    const res = await db.query(
      `
    SELECT
      e.*,

      COUNT(ev.userid) FILTER (WHERE ev.vote = TRUE) AS votes_for,
      COUNT(ev.userid) FILTER (WHERE ev.vote = FALSE) AS votes_against,


      CASE
        WHEN proposer.id IS NULL THEN NULL
        ELSE json_build_object(
          'id', proposer.id,
          'firstName', proposer.firstname,
          'lastName', proposer.lastname,
          'name', proposer.firstname || ' ' || proposer.lastname
        )
      END AS proposer,


      json_agg(
        json_build_object(
          'id', u.id,
    'name', u.firstname || ' ' || u.lastname,
    'initials', LEFT(u.firstname,1) || LEFT(u.lastname,1),
    'vote', ev.vote
        )
        ORDER BY u.firstname
      ) AS members

    FROM events e

    JOIN group_members gm
      ON gm.group_id = e.groupid

    JOIN users u
      ON u.id = gm.user_id

      LEFT JOIN users proposer
    ON proposer.id = e.proposed_by

    LEFT JOIN event_votes ev
      ON ev.eventid = e.id
      AND ev.userid = u.id

    WHERE e.id = $1
    AND e.groupid = $2

    GROUP BY e.id, proposer.id
    `,
      [eventId, groupId],
    );

    return res.rows[0];
  }

  static async findByGroup(groupId) {
    const res = await db.query(
      `
          SELECT
      e.*,

      COUNT(ev.userid) FILTER (WHERE ev.vote = TRUE) AS votes_for,
      COUNT(ev.userid) FILTER (WHERE ev.vote = FALSE) AS votes_against,

      CASE
        WHEN proposer.id IS NULL THEN NULL
        ELSE json_build_object(
          'id', proposer.id,
          'firstName', proposer.firstname,
          'lastName', proposer.lastname,
          'name', proposer.firstname || ' ' || proposer.lastname
        )
      END AS proposer,

      json_agg(
        json_build_object(
          'id', u.id,
    'name', u.firstname || ' ' || u.lastname,
    'initials', LEFT(u.firstname,1) || LEFT(u.lastname,1),
    'vote', ev.vote
        )
        ORDER BY u.firstname
      ) AS members

    FROM events e

    JOIN group_members gm
      ON gm.group_id = e.groupid

    JOIN users u
      ON u.id = gm.user_id

    LEFT JOIN users proposer
    ON proposer.id = e.proposed_by

    LEFT JOIN event_votes ev
      ON ev.eventid = e.id
     AND ev.userid = u.id

    WHERE e.groupid = $1

    GROUP BY e.id, proposer.id

    ORDER BY e.startdate;
            `,
      [groupId],
    );
    return res.rows;
  }

  static async findByTicketmasterId(groupId, ticketmasterId) {
    const result = await db.query(
      `
    SELECT *
    FROM events
    WHERE groupid = $1
      AND ticketmasterid = $2
    `,
      [groupId, ticketmasterId],
    );

    return result.rows[0] ?? null;
  }

  static async vote({ eventId, userId, vote }) {
    const res = await db.query(
      `
    INSERT INTO event_votes (
      eventid,
      userid,
      vote
    )
    VALUES ($1, $2, $3)

    ON CONFLICT (eventid, userid)
    DO UPDATE SET vote = EXCLUDED.vote

    RETURNING *
    `,
      [eventId, userId, vote],
    );

    return res.rows[0];
  }

  static async updateStatus(eventId, status) {
    const res = await db.query(
      `
    UPDATE events
    SET status = $1
    WHERE id = $2
    RETURNING *
    `,
      [status, eventId],
    );
    return res.rows[0];
  }

  static async closeExpiredEvents() {
    await db.query(
      `
   WITH expired_events AS (
      SELECT
        e.id,
        COUNT(ev.userid) FILTER (
          WHERE ev.vote = TRUE
        ) AS votes_for,
        COUNT(DISTINCT gm.user_id) AS total_members

      FROM events e

      JOIN group_members gm
        ON gm.group_id = e.groupid

      LEFT JOIN event_votes ev
        ON ev.eventid = e.id
        AND ev.userid = gm.user_id

      WHERE e.status = 'proposed'
        AND e.votingends <= NOW()

      GROUP BY e.id
    )

    UPDATE events e
    SET status = CASE
      WHEN expired.votes_for::DECIMAL
        / NULLIF(expired.total_members, 0) > 0.5
      THEN 'confirmed'::event_status
      ELSE 'closed'::event_status
    END

    FROM expired_events expired
    WHERE e.id = expired.id
    `,
    );
  }
  static async updateEvent(eventId, groupId, updates) {
    const { title, startDate, endDate, description, votingEnds, location } =
      updates;

    const result = await db.query(
      `
    UPDATE events
    SET
      title = COALESCE($1, title),
      startdate = COALESCE($2, startdate),
      enddate = COALESCE($3, enddate),
      description = COALESCE($4, description),
      votingends = COALESCE($5, votingends),
      location = COALESCE($6, location)
    WHERE id = $7
      AND groupid = $8
    RETURNING *
    `,
      [
        title,
        startDate,
        endDate,
        description,
        votingEnds,
        location,
        eventId,
        groupId,
      ],
    );

    return result.rows[0];
  }

  static async deleteEvent(eventId, groupId) {
    const result = await db.query(
      `
    DELETE FROM events
    WHERE id = $1
      AND groupid = $2
    RETURNING id
    `,
      [eventId, groupId],
    );

    return result.rows[0];
  }
}
