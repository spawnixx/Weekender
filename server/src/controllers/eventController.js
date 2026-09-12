import { ExpressError } from "../middleware/expressError.js";
import { Event } from "../models/eventModel.js";

export async function createEvent(req, res, next) {
  try {
    const groupId = req.params.id;
    const proposedBy = req.user.id;
    const { ticketmasterId } = req.body;

    if (ticketmasterId) {
      const existing = await Event.findByTicketmasterId(
        groupId,
        ticketmasterId,
      );

      if (existing) {
        throw new ExpressError(
          "This Ticketmaster event is already in the group",
          409,
        );
      }
    }

    const newEvent = await Event.createEvent({
      ...req.body,
      groupId,
      proposedBy,
    });
    return res.status(201).json({
      event: newEvent,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getGroupEvents(req, res, next) {
  try {
    const { id } = req.params;
    const events = await Event.findByGroup(id);

    return res.json({
      events,
    });
  } catch (err) {
    return next(err);
  }
}

export async function voteEvent(req, res, next) {
  try {
    const { groupId, eventId } = req.params;
    const { vote } = req.body;

    const userId = req.user.id;

    if (typeof vote !== "boolean") {
      return next(new ExpressError("Vote must be true or false", 400));
    }
    const existingEvent = await Event.findByIdWithMembers(eventId, groupId);
    if (!existingEvent) {
      throw new ExpressError("Event not found", 404);
    }
    if (existingEvent.status !== "proposed") {
      throw new ExpressError("Voting is closed for this event", 409);
    }

    if (new Date(existingEvent.votingends) <= new Date()) {
      throw new ExpressError("The voting deadline has passed", 409);
    }

    const updatedVote = await Event.vote({
      eventId,
      userId,
      vote,
    });
    const updatedEvent = await Event.findByIdWithMembers(eventId, groupId);

    const votesFor = Number(updatedEvent.votes_for);
    const votesAgainst = Number(updatedEvent.votes_against);
    const totalVotes = votesFor + votesAgainst;
    const totalMembers = updatedEvent.members.length;

    let finalStatus = "proposed";

    if (totalVotes === totalMembers) {
      finalStatus = votesFor > totalMembers / 2 ? "confirmed" : "closed";

      await Event.updateStatus(eventId, finalStatus);
    }
    const finalEvent = await Event.findByIdWithMembers(eventId, groupId);

    return res.json({
      vote: updatedVote,
      event: finalEvent,
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateEvent(req, res, next) {
  try {
    const { eventId, groupId } = req.params;
    const existingEvent = await Event.findByIdWithMembers(eventId, groupId);

    if (!existingEvent) {
      throw new ExpressError("Event not found", 404);
    }

    if (existingEvent.status === "closed") {
      throw new ExpressError("Closed events cannot be edited", 409);
    }

    const proposedFields = [
      "title",
      "startDate",
      "endDate",
      "location",
      "description",
      "votingEnds",
    ];
    const confirmedFields = ["startDate", "endDate", "location", "description"];

    const allowedFields =
      existingEvent.status === "confirmed" ? confirmedFields : proposedFields;

    const submittedFields = Object.keys(req.body);

    const invalidFields = submittedFields.filter(
      (field) => !allowedFields.includes(field),
    );

    if (invalidFields.length > 0) {
      throw new ExpressError(
        `Cannot update these fields on a ${existingEvent.status} event: ${invalidFields.join(", ")}`,
        400,
      );
    }

    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([field]) =>
        allowedFields.includes(field),
      ),
    );

    const finalStartDate = updates.startDate
      ? new Date(updates.startDate)
      : new Date(existingEvent.startdate);

    const finalEndDate =
      updates.endDate === null
        ? null
        : updates.endDate
          ? new Date(updates.endDate)
          : existingEvent.enddate
            ? new Date(existingEvent.enddate)
            : null;

    if (finalEndDate && finalEndDate <= finalStartDate) {
      throw new ExpressError("End date must be after the start date", 400);
    }

    if (existingEvent.status === "proposed") {
      const finalVotingEnds = updates.votingEnds
        ? new Date(updates.votingEnds)
        : new Date(existingEvent.votingends);

      if (finalVotingEnds >= finalStartDate) {
        throw new ExpressError("Voting must end before the event begins", 400);
      }
    }

    const updatedEvent = await Event.updateEvent(eventId, groupId, updates);
    return res.json({
      event: updatedEvent,
    });
  } catch (err) {
    return next(err);
  }
}

export async function deleteEvent(req, res, next) {
  try {
    const { eventId, groupId } = req.params;
    const deletedEvent = await Event.deleteEvent(eventId, groupId);

    if (!deletedEvent) {
      throw new ExpressError("Event not found", 404);
    }

    return res.json({
      message: "Event deleted",
      eventId: deletedEvent.id,
    });
  } catch (err) {
    return next(err);
  }
}
