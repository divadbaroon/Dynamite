import JoinDiscussionClient from '@/components/Discussion/group/JoinDiscussionClient';

type Params = Promise<{ discussionId: string }>;

export default async function JoinDiscussion({ 
  params 
}: { 
  params: Params 
}) {
  const resolvedParams = await params;
  return (
    <JoinDiscussionClient discussionId={resolvedParams.discussionId} />
  );
}