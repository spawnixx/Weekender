import { useAuth } from "@/context/AuthContext";
import { getAvatarColor } from "@/lib/avatarColors";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import IdentityForm from "@/components/auth/IdentityForm";
import PasswordForm from "@/components/auth/PasswordForm";

function Profile() {
  const { user } = useAuth();

  const firstName = user?.firstName ?? user?.firstname ?? "";

  const lastName = user?.lastName ?? user?.lastname ?? "";

  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
  return (
    <>
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
        <div>
          <p className=" text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Account
          </p>

          <h1 className="mt-2 text-3xl font-semibold">Profile settings</h1>
        </div>

        <section className="flex items-center gap-4 rounded-xl border bg-background px-5 py-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback
              className={`${getAvatarColor(
                user?.id ?? 0,
              )} text-base font-semibold`}
            >
              {initials || "U"}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-semibold">
                {firstName} {lastName}
              </h2>
            </div>

            <p className="mt-1 truncate text-sm text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </section>

        <section className="rounded-xl border bg-background p-6">
          <IdentityForm />
        </section>

        <section className="rounded-xl border bg-background p-6">
          <PasswordForm />
        </section>
      </main>
    </>
  );
}

export default Profile;
