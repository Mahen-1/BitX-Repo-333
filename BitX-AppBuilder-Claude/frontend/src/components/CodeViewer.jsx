// frontend/src/components/CodeViewer.jsx
import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function CodeViewer({ code, error, isPartial }) {
  // code is a plain string that may contain multiple files (from Claude)
  return (
    <div className="w-full">
      <Tabs defaultValue="code" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="code">Code</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="code">
          <div className="w-full rounded border p-3 bg-slate-900 text-white">
            {error && (
              <div className="mb-2 text-red-300">
                Error: {error}
              </div>
            )}
            <pre className="whitespace-pre-wrap break-words text-sm">
              {code || (isPartial ? "Receiving partial code..." : "// No code yet")}
            </pre>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <div className="w-full rounded border p-3 bg-white text-black">
            {/* simple preview: show first 4000 chars or hint */}
            <div className="text-sm">
              {code ? (
                <div>
                  <strong>Preview (first 4000 chars):</strong>
                  <pre className="whitespace-pre-wrap break-words">{code.slice(0, 4000)}</pre>
                </div>
              ) : (
                <div className="text-muted">No preview available</div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
