import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarClock } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import { getAvatarColor } from "@/lib/avatarColors";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

export default function GroupCard({ group }) {
  const navigate = useNavigate();

  const members = group.members ?? [];
  const actionableCount = Number(group.actionable_event_count ?? 0);
  const proposedCount = Number(group.proposed_event_count ?? 0);

  const visibleMembers = members.slice(0, 4);
  const hiddenMemberCount = Math.max(members.length - visibleMembers.length, 0);

  function handleOpenGroup() {
    navigate(`/groups/${group.id}`);
  }
  return (
    <Card
      role="button"
      label="group name"
      tabIndex={0}
      onClick={handleOpenGroup}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          handleOpenGroup();
        }
      }}
      className="group cursor-pointer rounded-xl border-[#E4E4E1] bg-white shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:border-[#E8492C]/40 hover:shadow-md"
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-xl font-semibold">{group.name}</CardTitle>

          <Badge
            variant={group.role === "owner" ? "default" : "outline"}
            className={
              group.role === "owner"
                ? "font-mono-ui bg-[#E8492C] text-[9px] uppercase tracking-wider text-white"
                : "font-mono-ui text-[9px] uppercase tracking-wider"
            }
          >
            {group.role}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <AvatarGroup>
            {visibleMembers.map((member) => (
              <Avatar key={member.id} className="h-8 w-8 border-2 border-white">
                <AvatarFallback
                  className={`${getAvatarColor(member.id)} font-semibold`}
                >
                  {member.initials ??
                    `${member.firstName?.[0] ?? ""}${
                      member.lastName?.[0] ?? ""
                    }`}
                </AvatarFallback>
              </Avatar>
            ))}

            {hiddenMemberCount > 0 && (
              <AvatarGroupCount className="h-8 w-8 text-[10px]">
                +{hiddenMemberCount}
              </AvatarGroupCount>
            )}
          </AvatarGroup>

          <span className=" text-[11px] text-muted-foreground">
            {group.member_count ?? members.length}{" "}
            {Number(group.member_count ?? members.length) === 1
              ? "member"
              : "members"}
          </span>
        </div>

        {actionableCount > 0 ? (
          <div className="rounded-lg bg-[#FBF2DF] px-4 py-3">
            <div className="flex items-center gap-2 text-[#966412]">
              <CalendarClock className="h-4 w-4" />

              <p className="text-sm font-semibold">
                {actionableCount}{" "}
                {actionableCount === 1 ? "event needs" : "events need"} your
                vote
              </p>
            </div>

            <p className="mt-1 text-xs text-[#7A5A21]">
              Open the group to review the latest proposals.
            </p>
          </div>
        ) : proposedCount > 0 ? (
          <div className="rounded-lg bg-[#E7F2EF] px-4 py-3">
            <p className="text-sm font-semibold text-[#0F6E5C]">
              You're caught up
            </p>

            <p className="mt-1 text-xs text-[#0F6E5C]/80">
              You have voted on all active proposals.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[#E4E4E1] px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">No active events</p>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              Open the group and suggest the first event.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
