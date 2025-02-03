interface HeaderContentProps {
  task: string | null;
  scenario: string | null;
}

export function HeaderContent({ task, scenario }: HeaderContentProps) {
  return (
    <>
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Task</h3>
        <p className="text-sm text-gray-600">
          {task || 'No task provided'}
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Scenario</h3>
        <p className="text-sm text-gray-600">
          {scenario || 'No scenario provided'}
        </p>
      </section>
    </>
  );
}