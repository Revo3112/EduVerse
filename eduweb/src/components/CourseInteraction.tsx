"use client";

import { useReadContract } from "thirdweb/react";
import { Lightbulb } from "lucide-react";
import { courseFactory } from "@/lib/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function CourseInteraction() {
  // Read total courses from CourseFactory contract using the correct function name
  const { data: totalCourses, isLoading } = useReadContract({
    contract: courseFactory,
    method: "function getTotalCourses() view returns (uint256)",
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">EduVerse Course Factory</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex flex-col space-y-1">
            <span className="text-sm font-medium text-foreground">Contract Address:</span>
            <Badge variant="secondary" className="font-mono text-xs w-fit">
              {courseFactory.address}
            </Badge>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-foreground">Total Courses:</span>
            <Badge variant="outline" className="font-semibold">
              {isLoading ? "Loading..." : totalCourses?.toString() || "0"}
            </Badge>
          </div>
        </div>

        <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertDescription>
            This component demonstrates reading data from your CourseFactory contract.
            You can expand this to include course creation, updates, and other interactions.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
