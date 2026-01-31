import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/sign-in");
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-medium">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your account information and password
        </p>
      </div>
      <ProfileForm user={session.user} />
    </div>
  );
}
