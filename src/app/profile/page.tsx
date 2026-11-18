import { listCities } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { logout } from "@/app/actions/auth";
import { ProfileForm, PasswordForm } from "@/components/profile-forms";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser("/profile");
  const cities = await listCities();
  return (
    <div className="mx-auto max-w-2xl px-5 pt-12 lg:pt-20">
      <h1 className="text-6xl leading-[0.95] sm:text-7xl">Profile</h1>
      <p className="mt-2 text-dim">Your city decides which groups we show you first.</p>
      <section className="card mt-8 p-6">
        <h2 className="mb-5 text-xl">Your details</h2>
        <ProfileForm user={user} cities={cities} />
      </section>
      <section className="card mt-5 p-6">
        <h2 className="mb-5 text-xl">Password</h2>
        <PasswordForm />
      </section>
      <form action={logout} className="mt-6">
        <button className="btn btn-danger">Sign out</button>
      </form>
    </div>
  );
}
