type Params = Promise<{ sessionId: string }>;

export default async function MonitorPage({ 
  params 
}: { 
  params: Params 
}) {
  const resolvedParams = await params;
  return (
    <div>
      {/* Empty for now */}
      <p>Monitor page for session: {resolvedParams.sessionId}</p>
    </div>
  );
}