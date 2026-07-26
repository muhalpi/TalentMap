export default function LoadingTest() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f9fc] px-5 text-slate-950">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-[0_8px_30px_rgb(15_23_42/0.06)]">
        <span
          aria-hidden="true"
          className="mx-auto block size-7 animate-spin rounded-full border-2 border-blue-100 border-t-blue-600"
        />
        <p className="mt-4 text-sm font-medium text-slate-700">
          Preparing your assessment
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Securely resolving your assessment access…
        </p>
      </div>
    </main>
  );
}
