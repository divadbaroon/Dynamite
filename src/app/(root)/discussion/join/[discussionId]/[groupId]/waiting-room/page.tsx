import WaitingRoomClient from '@/components/Discussion/waitingroom/WaitingRoomClient';

type Params = Promise<{ 
  discussionId: string;
  groupId: string;
}>;

export default async function WaitingRoom({ 
  params 
}: { 
  params: Params 
}) {
  const resolvedParams = await params;
  return (
    <WaitingRoomClient 
      discussionId={resolvedParams.discussionId} 
      groupId={resolvedParams.groupId} 
    />
  );
}