"use client";

import React from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';

interface ManifestDiffViewerProps {
  oldManifest: string;
  newManifest: string;
}

export const ManifestDiffViewer: React.FC<ManifestDiffViewerProps> = ({ oldManifest, newManifest }) => {
  return (
    <div className="w-full bg-white rounded-md shadow p-4 dark:bg-gray-800">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Manifest Changes</h2>
      <ReactDiffViewer
        oldValue={oldManifest}
        newValue={newManifest}
        splitView={true}
        useDarkTheme={false}
        leftTitle="Current Version"
        rightTitle="New Version"
        showDiffOnly={false}
      />
    </div>
  );
};
