export default function PipelinePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Sales Pipeline</h1>
      <div className="grid grid-cols-4 gap-4">
        {["New Lead", "Qualified", "Proposal", "Closed"].map((stage) => (
          <div key={stage} className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold border-b pb-2 mb-2">{stage}</h3>
            <div className="space-y-2">
              <div className="bg-blue-50 p-2 rounded text-sm">Deal #123</div>
              <div className="bg-blue-50 p-2 rounded text-sm">Deal #456</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
