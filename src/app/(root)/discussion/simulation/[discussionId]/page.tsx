import SimulatorPage from '@/components/Simulator/SimulatorPage'

type Params = Promise<{ discussionId: string }>;

export default async function Page({ 
  params 
}: { 
  params: Params 
}) {
  const resolvedParams = await params;
  return (
    <SimulatorPage discussionId={resolvedParams.discussionId} />
  );
}

