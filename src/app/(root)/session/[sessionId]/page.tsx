import { SessionContent } from "./SessionContent"

type Params = Promise<{ sessionId: string }>;

export default async function SessionPage({ 
  params 
}: { 
  params: Params 
}) {
  const resolvedParams = await params;
  return <SessionContent sessionId={resolvedParams.sessionId} />
}