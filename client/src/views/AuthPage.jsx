import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Compass, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";

export default function AuthPage() {
  const location = useLocation();

  const [activeTab, setActiveTab] = useState(
    location.state?.tab === "register" ? "register" : "login",
  );

  return (
    <main className="min-h-screen bg-[#FAFAF9] md:grid md:grid-cols-[44%_1fr]">
      <section className="hidden min-h-screen flex-col justify-between overflow-hidden bg-[#17171A] p-10 md:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8492C]">
            <Compass className="h-4 w-4 text-white" />
          </div>

          <span className="font-display text-xl font-semibold text-white">
            Weekender
          </span>
        </div>

        <div>
          <p className=" mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#E8492C]">
            Plan together
          </p>

          <h1 className="font-display max-w-md text-4xl font-medium leading-tight text-white lg:text-5xl">
            Somebody always has an idea. Vote on the good ones.
          </h1>

          <p className="mt-6 max-w-sm text-sm leading-6 text-[#9C9C96]">
            Suggest an event, let the group weigh in, and confirm what everyone
            is actually doing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {["Suggest", "Vote", "Confirm"].map((label, index) => (
            <div
              key={label}
              className=" flex items-center gap-2 rounded-full border border-[#3A3A38] px-3 py-2 text-[10px] uppercase tracking-wide text-[#D8D8D2]"
              style={{
                transform: `rotate(${(index - 1) * 4}deg)`,
              }}
            >
              <Check className="h-3 w-3 text-[#E8492C]" />
              {label}
            </div>
          ))}
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 md:hidden">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8492C]">
                <Compass className="h-4 w-4 text-white" />
              </div>

              <span className="font-display text-xl font-semibold">
                Weekender
              </span>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 rounded-lg bg-[#F1F0EC] p-1">
              <TabsTrigger
                value="login"
                className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Log in
              </TabsTrigger>

              <TabsTrigger
                value="register"
                className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Create account
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-8">
              <div className="mb-7">
                <h2 className="text-3xl font-semibold">Welcome back</h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Your groups are waiting for you.
                </p>
              </div>

              <LoginForm onRegisterClick={() => setActiveTab("register")} />
            </TabsContent>

            <TabsContent value="register" className="mt-8">
              <div className="mb-7">
                <h2 className="text-3xl font-semibold">Set up your account</h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Create an account and start planning with your group.
                </p>
              </div>

              <RegisterForm onLoginClick={() => setActiveTab("login")} />
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </main>
  );
}
