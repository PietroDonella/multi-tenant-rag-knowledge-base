import { ChatScreen } from "@/components/chat-panel";
import { getCurrentOrg } from "@/lib/tenant";

export default async function ChatPage() {
  const org = await getCurrentOrg();
  return <ChatScreen orgId={org?.orgId ?? null} orgName={org?.name ?? null} />;
}
