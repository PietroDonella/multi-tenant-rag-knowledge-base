import { AuthForm } from "@/components/auth-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") ? params.next : "/dashboard";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <p className="text-sm font-semibold tracking-[0.18em] text-[var(--accent)] uppercase">Acervo</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Entre na base da sua empresa</h1>
      <AuthForm nextPath={next} />
    </main>
  );
}
