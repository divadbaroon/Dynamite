import GroupSelectionClient from './GroupSelectionClient';

type Params = Promise<{ sessionId: string }>;

export default async function GroupSelectionPage({ 
  params 
}: { 
  params: Params 
}) {
  const resolvedParams = await params;
  return (
    <GroupSelectionClient sessionId={resolvedParams.sessionId} />
  );
}