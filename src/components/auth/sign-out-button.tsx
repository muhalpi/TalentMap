import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <form action="/api/session/logout" method="post">
      <button
        type="submit"
        className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-blue-50/78 hover:bg-white/[0.07] hover:text-white"
      >
        <LogOut size={17} strokeWidth={1.8} />
        Sign out
      </button>
    </form>
  );
}
