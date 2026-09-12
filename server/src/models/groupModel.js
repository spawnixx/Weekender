import { db } from "../db.js";

export class Group {
  static async createGroup({ name, ownerId, inviteCode }) {
    const res = await db.query(
      `
            INSERT INTO groups (name, owner_id, invite_code)
            VALUES ($1,$2,$3)
            RETURNING *
            `,
      [name, ownerId, inviteCode],
    );
    return res.rows[0];
  }

  static async createGroupWithOwner({ name, ownerId, inviteCode }) {
    const client = await db.connect();

    try {
      await client.query("BEGIN");
      const groupResult = await client.query(
        `
        INSERT INTO groups (name, owner_id, invite_code)
        VALUES ($1, $2, $3)
        RETURNING *
      `,
        [name, ownerId, inviteCode],
      );

      const newGroup = groupResult.rows[0];

      await client.query(
        `
        INSERT INTO group_members (group_id, user_id, role)
        VALUES ($1, $2, 'owner')
      `,
        [newGroup.id, ownerId],
      );

      await client.query("COMMIT");

      return newGroup;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async findById(groupId, userId) {
    const res = await db.query(
      `
      SELECT
        g.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', u.id,
              'firstName', u.firstName,
              'lastName', u.lastName,
              'email', u.email,
              'role', members.role
            )
            ORDER BY
              CASE WHEN members.role = 'owner' THEN 0 ELSE 1 END,
              u.firstName,
              u.lastName
          ) FILTER (WHERE u.id IS NOT NULL),
          '[]'::json
        ) AS members
      FROM groups g

      JOIN group_members requester
        ON requester.group_id = g.id
        AND requester.user_id = $2

      LEFT JOIN group_members members
        ON members.group_id = g.id

      LEFT JOIN users u
        ON u.id = members.user_id

      WHERE g.id = $1

      GROUP BY g.id
    `,
      [groupId, userId],
    );

    return res.rows[0];
  }
  static async findByInviteCode(inviteCode) {
    const res = await db.query(
      `
      SELECT *
      FROM groups
      WHERE invite_code = $1 
      `,
      [inviteCode],
    );
    return res.rows[0];
  }

  static async findUserGroups(userId) {
    const res = await db.query(
      `
       SELECT
      g.*,
      gm_current.role,

      COUNT(DISTINCT gm.user_id)::INTEGER AS member_count,

      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'id', u.id,
            'firstName', u.firstname,
            'lastName', u.lastname,
            'initials',
              LEFT(u.firstname, 1) ||
              LEFT(u.lastname, 1)
          )
        ) FILTER (WHERE u.id IS NOT NULL),
        '[]'
      ) AS members,

      COUNT(DISTINCT e.id)
        FILTER (
          WHERE e.status = 'proposed'
            AND ev.userid IS NULL
        )::INTEGER AS actionable_event_count,

      COUNT(DISTINCT e.id)
        FILTER (
          WHERE e.status = 'proposed'
        )::INTEGER AS proposed_event_count

    FROM groups g

    JOIN group_members gm_current
      ON gm_current.group_id = g.id
      AND gm_current.user_id = $1

    LEFT JOIN group_members gm
      ON gm.group_id = g.id

    LEFT JOIN users u
      ON u.id = gm.user_id

    LEFT JOIN events e
      ON e.groupid = g.id

    LEFT JOIN event_votes ev
      ON ev.eventid = e.id
      AND ev.userid = $1

    GROUP BY
      g.id,
      gm_current.role

    ORDER BY g.name;
      `,
      [userId],
    );
    return res.rows;
  }

  static async addOwner(groupId, userId) {
    const res = await db.query(
      `
      INSERT INTO group_members (group_id, user_id, role)
      VALUES ($1, $2, 'owner')
      RETURNING *
      `,
      [groupId, userId],
    );
    return res.rows[0];
  }

  static async addMember(groupId, userId) {
    const res = await db.query(
      `
          INSERT INTO group_members (group_id, user_id)
          VALUES ($1,$2)
          ON CONFLICT (user_id, group_id) DO NOTHING
          RETURNING *
          `,
      [groupId, userId],
    );
    return res.rows[0];
  }

  static async memberCheck(groupId, userId) {
    const res = await db.query(
      `
      SELECT 1
      FROM group_members
      WHERE group_id = $1 AND user_id = $2
      `,
      [groupId, userId],
    );
    return res.rows.length > 0;
  }
  static async getMembers(groupId) {
    const result = await db.query(
      `
      SELECT
        u.id,
        u.firstName,
        u.lastName,
        u.email,
        gm.role
      FROM group_members AS gm
      JOIN users AS u
        ON u.id = gm.user_id
      WHERE gm.group_id = $1
      ORDER BY
        CASE WHEN gm.role = 'owner' THEN 0 ELSE 1 END,
        u.firstName,
        u.lastName
    `,
      [groupId],
    );

    return result.rows;
  }

  static async getMember(groupId, userId) {
    const result = await db.query(
      `
    SELECT
      u.id,
      u.firstName,
      u.lastName,
      u.email,
      gm.role
    FROM group_members AS gm
    JOIN users AS u
      ON u.id = gm.user_id
    WHERE gm.group_id = $1
      AND gm.user_id = $2
    `,
      [groupId, userId],
    );

    return result.rows[0] ?? null;
  }

  static async removeMember(groupId, userId) {
    const res = await db.query(
      `
    DELETE FROM group_members
    WHERE group_id = $1 AND user_id = $2
    RETURNING user_id
    `,
      [groupId, userId],
    );
    return res.rows[0];
  }

  static async deleteGroup(groupId) {
    const result = await db.query(
      `
    DELETE FROM groups
    WHERE id = $1
    RETURNING *
    `,
      [groupId],
    );

    return result.rows[0];
  }
}
