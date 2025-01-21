import JoinSessionClient from '../../../../../components/Discussion/group/JoinSessionClient';

type Params = Promise<{ sessionId: string }>;

export default async function JoinSession({ 
  params 
}: { 
  params: Params 
}) {
  const resolvedParams = await params;
  return (
    <JoinSessionClient sessionId={resolvedParams.sessionId} />
  );
}