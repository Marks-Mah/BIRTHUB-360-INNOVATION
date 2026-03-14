import { ManifestDiffViewer } from '../../components/manifest-diff-viewer';
import { Button } from '../../components/button';
import { ArrowLeft, Check, X, Copy, Download } from 'lucide-react';
import Link from 'next/link';

export default function MigrationsReviewPage() {
  const oldManifest = `version: "1.0.0"
name: "Sales Agent"
description: "Core sales agent responsible for lead generation."
tools:
  - "crm_search"
  - "email_sender"
capabilities:
  max_tokens: 2048`;

  const newManifest = `version: "2.0.0"
name: "Sales Agent"
description: "Core sales agent responsible for lead generation and scoring."
tools:
  - "crm_search"
  - "email_sender"
  - "http_request"
capabilities:
  max_tokens: 4096
  vision: true`;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Migration Review</h2>
          <p className="text-muted-foreground">
            Review changes between the current and proposed agent manifests before applying the migration.
          </p>
        </div>
        <div className="flex items-center space-x-2">
           <Link href="/">
             <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
             </Button>
           </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
          <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
             <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Status</h3>
             <div className="text-2xl font-bold text-yellow-600 mt-2">Pending Review</div>
          </div>
          <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
             <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Target Version</h3>
             <div className="text-2xl font-bold mt-2">v2.0.0</div>
          </div>
          <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
             <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Impact Level</h3>
             <div className="text-2xl font-bold text-red-600 mt-2">High (Breaking)</div>
          </div>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow mb-8 overflow-hidden">
        <div className="p-6">
           <ManifestDiffViewer oldManifest={oldManifest} newManifest={newManifest} />
        </div>
        <div className="flex items-center justify-end p-6 border-t bg-muted/50 gap-4">
             <Button variant="outline">
                <Copy className="mr-2 h-4 w-4" />
                Copy Diff
             </Button>
             <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download Manifest
             </Button>
             <div className="flex-1"></div>
             <Button variant="destructive">
                <X className="mr-2 h-4 w-4" />
                Reject
             </Button>
             <Button className="bg-green-600 hover:bg-green-700 text-white">
                <Check className="mr-2 h-4 w-4" />
                Approve Migration
             </Button>
        </div>
      </div>
    </div>
  );
}
