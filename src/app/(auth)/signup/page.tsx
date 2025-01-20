import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { signup, login } from "../../(auth)/login/actions";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function Signup({
  searchParams,
}: {
  searchParams: { message: string };
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return redirect("/");
  }

  return (
    <section className="h-[calc(55vh-57px)] flex justify-center items-center">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription>
            Create an account to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form id="signup-form" className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <span className="text-xs text-muted-foreground">
                  Min. 6 characters
                </span>
              </div>
              <Input
                minLength={6}
                name="password"
                id="password"
                type="password"
                required
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
              </div>
              <Input
                minLength={6}
                name="confirmPassword"
                id="confirmPassword"
                type="password"
                required
              />
            </div>
            {searchParams.message && (
              <div className="text-sm font-medium text-destructive">
                {searchParams.message}
              </div>
            )}
            <Button formAction={signup} className="w-full">
              Sign Up
            </Button>
          </form>
          <div className="text-center text-sm">
            Already have an account?{" "}
            <button formAction={login} form="signup-form" className="underline">
              Login
            </button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}