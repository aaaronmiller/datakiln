export default function ResultsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Results</h2>
      </div>
      <div className="grid gap-4">
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Workflow Results</h3>
          <p className="text-muted-foreground">No results available yet. Run some workflows to see results here.</p>
        </div>
      </div>
    </div>
  )
}