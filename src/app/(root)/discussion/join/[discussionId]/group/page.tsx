import GroupSelectionClient from './GroupSelectionClient';

type Params = Promise<{ discussionId: string }>;

export default async function GroupSelectionPage({ 
  params 
}: { 
  params: Params 
}) {
  const resolvedParams = await params;
  return (
    <GroupSelectionClient discussionId={resolvedParams.discussionId} />
  );
}