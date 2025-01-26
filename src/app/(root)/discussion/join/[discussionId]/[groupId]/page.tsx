import DiscussionClient from '@/components/Discussion/discussion/DiscussionClient';

type Params = Promise<{ 
  discussionId: string;
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
      discussionId={resolvedParams.discussionId} 
      groupId={resolvedParams.groupId} 
    />
  );
}