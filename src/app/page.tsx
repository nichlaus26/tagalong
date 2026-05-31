export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <h1 className="text-3xl font-bold text-center">TagAlong</h1>
      <p className="mt-3 text-lg text-zinc-600 text-center max-w-md">
        Discover and join casual, in-person activities near you.
      </p>
      <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
        <a
          href="/auth"
          className="block w-full rounded-lg bg-black px-4 py-3 text-center text-white font-medium hover:bg-zinc-800"
        >
          Get Started
        </a>
      </div>
    </div>
  );
}
