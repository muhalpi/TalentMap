import Link from "next/link";
import { ArrowLeft, Building2, ShieldCheck } from "lucide-react";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next?.startsWith("/") ? next : "/";

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-8 text-foreground">
      <section className="w-full max-w-3xl rounded-xl border border-border bg-surface p-6 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-foreground/65 hover:text-accent"
        >
          <ArrowLeft size={16} />
          Console
        </Link>

        <header className="mt-6 border-b border-border pb-5">
          <p className="font-mono text-xs uppercase tracking-wide text-accent">
            TalentMap Session
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            Choose a seeded role
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground/65">
            This first-pass auth layer signs an HTTP-only session cookie and
            resolves the selected user from Neon on every protected request.
          </p>
        </header>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <form
            action="/api/session/login"
            method="post"
            className="rounded-xl border border-border bg-surface p-5"
          >
            <ShieldCheck className="text-accent" size={22} />
            <h2 className="mt-4 text-lg font-semibold">Internal Admin</h2>
            <p className="mt-2 text-sm leading-6 text-foreground/65">
              Opens the provisioning console using the seeded internal admin.
            </p>
            <input type="hidden" name="role" value="internal_admin" />
            <input type="hidden" name="next" value={safeNext} />
            <button
              type="submit"
              className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-full bg-accent px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgb(0_0_0/0.08)] hover:bg-accent-strong"
            >
              Continue as Admin
            </button>
          </form>

          <form
            action="/api/session/login"
            method="post"
            className="rounded-xl border border-border bg-surface p-5"
          >
            <Building2 className="text-accent" size={22} />
            <h2 className="mt-4 text-lg font-semibold">Client User</h2>
            <p className="mt-2 text-sm leading-6 text-foreground/65">
              Opens the tenant dashboard for the seeded Northstar client.
            </p>
            <input type="hidden" name="role" value="client" />
            <input type="hidden" name="next" value={safeNext} />
            <button
              type="submit"
              className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground/75 hover:border-accent hover:text-accent"
            >
              Continue as Client
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
