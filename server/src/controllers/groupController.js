import { ExpressError } from "../middleware/expressError.js";
import { Group } from "../models/groupModel.js";
import crypto from "crypto";

export async function getUserGroups(req, res, next) {
  try {
    const userId = req.user.id;
    const groups = await Group.findUserGroups(userId);

    return res.json({ groups });
  } catch (err) {
    next(err);
  }
}

export async function getGroup(req, res, next) {
  try {
    const { id } = req.params;
    const group = await Group.findById(id, req.user.id);

    if (!group) {
      return next(new ExpressError("Group not found", 404));
    }
    return res.json({ group });
  } catch (err) {
    next(err);
  }
}

export async function getInvitePreview(req, res, next) {
  try {
    const { inviteCode } = req.params;
    const group = await Group.findByInviteCode(inviteCode);

    if (!group) {
      return next(new ExpressError("Invalid invite link", 404));
    }
    return res.json({
      group: {
        id: group.id,
        name: group.name,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createGroup(req, res, next) {
  try {
    const { name } = req.body;
    const ownerId = req.user.id;
    if (!name) {
      return next(new ExpressError("All fields required", 400));
    }
    const newInvitecode = crypto
      .randomBytes(6)
      .toString("hex")
      .slice(0, 6)
      .toUpperCase();

    const newGroup = await Group.createGroupWithOwner({
      name,
      ownerId,
      inviteCode: newInvitecode,
    });

    return res.status(201).json({
      group: newGroup,
    });
  } catch (err) {
    return next(err);
  }
}

export async function joinByInviteCode(req, res, next) {
  try {
    const userId = req.user.id;
    const groupId = req.group.id;
    await Group.addMember(groupId, userId);

    return res.status(200).json({
      group: req.group,
    });
  } catch (err) {
    next(err);
  }
}

export async function getGroupMembers(req, res, next) {
  try {
    const members = await Group.getMembers(req.params.groupId);
    return res.json({ members });
  } catch (err) {
    return next(err);
  }
}

export async function removeMember(req, res, next) {
  try {
    const { groupId, userId } = req.params;
    const currentUserId = req.user.id;

    const currentMember = await Group.getMember(groupId, currentUserId);

    if (!currentMember) {
      throw new ExpressError("You are not a member of this group.", 403);
    }

    const isOwner = currentMember?.role === "owner";

    if (!isOwner && Number(userId) !== currentUserId) {
      throw new ExpressError(
        "Only the group owner can remove other members.",
        403,
      );
    }

    if (isOwner && Number(userId) === currentUserId) {
      throw new ExpressError("The group owner cannot leave the group.", 400);
    }

    const removedMember = await Group.removeMember(groupId, userId);

    if (!removedMember) {
      throw new ExpressError("Member not found in this group.", 404);
    }

    return res.json({
      message: "Member removed",
    });
  } catch (err) {
    return next(err);
  }
}

export async function deleteGroup(req, res, next) {
  try {
    const { groupId } = req.params;

    const deletedGroup = await Group.deleteGroup(groupId);

    if (!deletedGroup) {
      throw new ExpressError("Group not found", 404);
    }

    return res.json({
      message: "Group deleted successfully",
      group: deletedGroup,
    });
  } catch (err) {
    return next(err);
  }
}
