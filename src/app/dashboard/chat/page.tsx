import { ChatPanel } from "@/components/chat-panel";
import { getCurrentOrg } from "@/lib/tenant";

export default async function ChatPage() {
  const org = await getCurrentOrg();

  return (
    <main className="mx-auto flex h-screen max-w-3xl flex-col px-8 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Chat</h1>
      <p className="mt-1 mb-4 text-sm text-stone-600">
        A rota <code>/api/chat</code> incorpora o <code>org_id</code> de {org?.name ?? "nenhuma organização"} na busca vetorial.
      </p>
      <ChatPanel orgName={org?.name ?? null} />
    </main>
  );
}
