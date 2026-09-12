CREATE TABLE users (
    id SERIAL PRIMARY KEY,

    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,

    email TEXT UNIQUE NOT NULL,

    password TEXT NOT NULL
);

CREATE TABLE groups (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
 
    owner_id INTEGER NOT NULL REFERENCES users(id),

    invite_code CHAR(6) NOT NULL UNIQUE
    
);

CREATE INDEX idx_groups_owner_id
ON groups (owner_id);

CREATE TYPE member_role AS ENUM (
    'owner',
    'member'
);

CREATE TABLE group_members (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  role member_role NOT NULL DEFAULT 'member',
  
  PRIMARY KEY (user_id, group_id)
);

CREATE INDEX idx_group_members_group_id
ON group_members (group_id);


CREATE TYPE event_status AS ENUM (
    'proposed',
    'confirmed',
    'closed'
);
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    groupId INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,

    title TEXT NOT NULL,

    startDate TIMESTAMP,
    endDate TIMESTAMP,

    location TEXT,
    latitude NUMERIC,
    longitude NUMERIC,

    googleMapsApiId VARCHAR,
    ticketmasterId VARCHAR,

    eventImageUrl TEXT,
    description TEXT,

    votingEnds TIMESTAMP,

    proposed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,

    status event_status NOT NULL DEFAULT 'proposed'
);

CREATE UNIQUE INDEX unique_group_ticketmaster_event
ON events (groupid, ticketmasterid)
WHERE ticketmasterid IS NOT NULL;

CREATE INDEX idx_events_group_id
ON events (group_id);

CREATE INDEX idx_events_proposed_by
ON events (proposed_by);

CREATE TABLE event_votes (
    eventId INTEGER REFERENCES events(id) ON DELETE CASCADE,
    userId INTEGER REFERENCES users(id) ON DELETE CASCADE,
    vote BOOLEAN NOT NULL,

    PRIMARY KEY (eventId, userId)
);

CREATE INDEX idx_event_votes_user_id
ON event_votes (user_id);