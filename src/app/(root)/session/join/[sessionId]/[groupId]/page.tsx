import DiscussionClient from './DiscussionClient';

type Params = Promise<{ 
  sessionId: string;
  groupId: string;
}>;

export default async function Discussion({ 
  params 
}: { 
  params: Params 
}) {
  const resolvedParams = await params;
  return (
    <DiscussionClient 
      sessionId={resolvedParams.sessionId} 
      groupId={resolvedParams.groupId} 
    />
  );
}