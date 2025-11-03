"use client";

import { AlertTriangle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function GoldskyConfigError() {
  return (
    <div className="container mx-auto p-6">
      <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Goldsky Configuration Missing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-red-300 bg-red-100 dark:bg-red-900/20">
            <AlertDescription className="text-red-800 dark:text-red-300">
              <strong>Error:</strong> NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT is not configured.
            </AlertDescription>
          </Alert>

          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-200 mb-2">
                To fix this issue:
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-red-800 dark:text-red-300">
                <li>
                  Deploy your subgraph to Goldsky:
                  <pre className="mt-1 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs overflow-x-auto">
                    cd goldsky-indexer/subgraph-custom{"\n"}
                    ./deploy-analytics.sh
                  </pre>
                </li>
                <li>
                  Get your subgraph endpoint from{" "}
                  <a
                    href="https://app.goldsky.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 underline hover:text-red-600 dark:hover:text-red-400"
                  >
                    Goldsky Dashboard
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>
                  Create <code className="bg-red-200 dark:bg-red-900 px-1 rounded">.env.local</code> file:
                  <pre className="mt-1 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs overflow-x-auto">
                    NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT=https://api.goldsky.com/api/public/project_YOUR_PROJECT_ID/subgraphs/eduverse-subgraph/VERSION/gn
                  </pre>
                </li>
                <li>Restart the development server</li>
              </ol>
            </div>

            <div className="border-t border-red-300 pt-4">
              <h4 className="font-semibold text-red-900 dark:text-red-200 mb-2">
                Example .env.local:
              </h4>
              <pre className="p-3 bg-red-100 dark:bg-red-900/30 rounded text-xs overflow-x-auto text-red-800 dark:text-red-300">
{`# Goldsky Subgraph Endpoint
NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT=https://api.goldsky.com/api/public/project_clz8vzohs3w5h01wb5oblfk9i/subgraphs/eduverse-subgraph/1.5.0/gn

# Smart Contract Addresses
NEXT_PUBLIC_COURSE_FACTORY_ADDRESS=0x8596917Af32Ab154Ab4F48efD32Ef516D4110E72
NEXT_PUBLIC_COURSE_LICENSE_ADDRESS=0x2A2C04cb75b4fF8F80d6CE1dcDa5C3c59FDf8D17
NEXT_PUBLIC_PROGRESS_TRACKER_ADDRESS=0x2BA4c0AC2C9314810c0830c8F9B4CF03Ab96eb3c
NEXT_PUBLIC_CERTIFICATE_MANAGER_ADDRESS=0xA0db2F257608934b8A7806893B4a55a70d9F02f7

# Thirdweb Client ID
NEXT_PUBLIC_TEMPLATE_CLIENT_ID=your_thirdweb_client_id`}
              </pre>
            </div>

            <div className="flex items-start gap-2 p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded border border-yellow-300">
              <AlertTriangle className="h-4 w-4 text-yellow-700 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-yellow-800 dark:text-yellow-300">
                <strong>Note:</strong> You can copy <code className="bg-yellow-200 dark:bg-yellow-900 px-1 rounded">.env.example</code> to <code className="bg-yellow-200 dark:bg-yellow-900 px-1 rounded">.env.local</code> and fill in your values.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
