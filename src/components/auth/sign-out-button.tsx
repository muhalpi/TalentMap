export function SignOutButton() {
  return (
    <form action="/api/session/logout" method="post">
      <button
        type="submit"
        className="inline-flex h-10 w-full items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground/75 shadow-[0_1px_2px_rgb(0_0_0/0.03)] hover:border-accent hover:text-accent"
      >
        Sign out
      </button>
    </form>
  );
}
