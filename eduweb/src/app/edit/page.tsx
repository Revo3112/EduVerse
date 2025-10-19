"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCourseDetails } from "@/services/courseContract.service";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useActiveAccount } from "thirdweb/react";

/**
 * ===================================================================
 * EDIT COURSE PAGE (QUERY PARAMETER ROUTING)
 * ===================================================================
 *
 * This page allows instructors to edit their existing courses.
 * It uses query parameters (?courseId=123) instead of dynamic routing.
 *
 * ROUTING APPROACH:
 * - URL Pattern: /edit?courseId=123
 * - Accessed via: router.push(`/edit?courseId=${courseId}`)
 * - Benefits:
 *   * Simpler folder structure (no [courseId] dynamic segment)
 *   * Easier to add additional query params in the future
 *   * Consistent with user's preference for non-dynamic routes
 *
 * BUSINESS LOGIC (Instructor Flow):
 * 1. Instructor navigates from myCourse page via edit action
 * 2. System extracts courseId from URL query parameters
 * 3. System loads course data from blockchain using getCourseDetails()
 * 4. Form is pre-populated with existing values
 * 5. Instructor can modify:
 *    - Course metadata (title, description, thumbnail, category, difficulty)
 *    - Price per month
 *    - Active status (publish/unpublish)
 *    - Sections (add, update, delete)
 * 6. On submit, calls prepareUpdateCourseTransaction()
 * 7. Blockchain transaction updates course data
 * 8. Goldsky indexer picks up CourseUpdated event
 *
 * SMART CONTRACT ALIGNMENT:
 * - Uses CourseFactory.updateCourse() function
 * - Matches exact parameter types and validation rules
 * - Category/Difficulty converted to uint8 enums
 * - Price validated (0 < price <= 1 ETH)
 * - String length validation (title 200, description 1000, etc.)
 *
 * GOLDSKY INDEXER COMPATIBILITY:
 * Event: CourseUpdated(uint256 indexed courseId, address indexed updater,
 *                       uint256 newPrice, uint256 oldPrice, bool isActive)
 * - Tracks all course modifications
 * - Enables price history analytics
 * - Monitors active/inactive status changes
 * - Supports revenue projection calculations
 *
 * TODO IMPLEMENTATION CHECKLIST:
 * [ ] Load course data on mount using getCourseDetails()
 * [ ] Verify user is course creator (course.creator === activeAccount.address)
 * [ ] Pre-populate form with existing course data
 * [ ] Implement section management (add/update/delete sections)
 * [ ] Add form validation matching smart contract rules
 * [ ] Integrate prepareUpdateCourseTransaction() for submission
 * [ ] Add loading states and error handling
 * [ ] Support IPFS uploads for new/updated thumbnails and videos
 * [ ] Display price in both ETH and IDR
 * [ ] Add confirmation dialog for major changes
 *
 * RECOMMENDED APPROACH:
 * 1. Copy form structure from /app/create/page.tsx
 * 2. Add useEffect to load course data on mount
 * 3. Replace prepareCreateCourseTransaction with prepareUpdateCourseTransaction
 * 4. Add authorization check (only course creator can edit)
 * 5. Handle section updates (existing sections + new sections)
 * 6. Update submit handler to handle partial updates
 * ===================================================================
 */

interface CourseData {
  title: string;
  description: string;
  thumbnailCID: string;
  creator: string;
  creatorName: string;
  pricePerMonth: bigint;
  category: string;
  difficulty: string;
  isActive: boolean;
  totalRevenue: bigint;
  createdAt: bigint;
}

export default function EditCoursePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeAccount = useActiveAccount();

  const [loading, setLoading] = useState(true);
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Extract courseId from query parameters
  const courseId = searchParams.get('courseId');

  useEffect(() => {
    async function loadCourseData() {
      if (!courseId) {
        toast.error("Missing course ID", {
          description: "No course ID provided in URL",
        });
        router.push("/myCourse");
        return;
      }

      try {
        setLoading(true);

        // Fetch course data from blockchain
        const course = await getCourseDetails(BigInt(courseId));

        if (!course) {
          toast.error("Course not found", {
            description: "The requested course does not exist",
          });
          router.push("/myCourse");
          return;
        }

        // Check if user is the course creator
        if (activeAccount?.address && course.creator.toLowerCase() === activeAccount.address.toLowerCase()) {
          setIsAuthorized(true);
          setCourseData(course);
        } else {
          toast.error("Unauthorized", {
            description: "You are not authorized to edit this course",
          });
          router.push("/myCourse");
          return;
        }
      } catch (error) {
        console.error("Failed to load course:", error);
        toast.error("Failed to load course", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        router.push("/myCourse");
      } finally {
        setLoading(false);
      }
    }

    if (activeAccount?.address) {
      loadCourseData();
    }
  }, [courseId, activeAccount?.address, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading course data...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized || !courseData) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push("/myCourse")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Courses
          </Button>

          <div>
            <h1 className="text-3xl font-bold text-foreground">Edit Course</h1>
            <p className="text-muted-foreground mt-2">
              Update your course details and content
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Course Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Current Course Data:</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li><strong>Course ID:</strong> {courseId}</li>
                  <li><strong>Title:</strong> {courseData.title}</li>
                  <li><strong>Description:</strong> {courseData.description}</li>
                  <li><strong>Creator:</strong> {courseData.creatorName}</li>
                  <li><strong>Category:</strong> {courseData.category}</li>
                  <li><strong>Difficulty:</strong> {courseData.difficulty}</li>
                  <li><strong>Price:</strong> {(Number(courseData.pricePerMonth) / 1e18).toFixed(4)} ETH</li>
                  <li><strong>Status:</strong> {courseData.isActive ? "Active" : "Inactive"}</li>
                  <li><strong>Total Revenue:</strong> {(Number(courseData.totalRevenue) / 1e18).toFixed(4)} ETH</li>
                </ul>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                  🚧 Edit Form Under Development
                </h4>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  The full edit form is currently being implemented. This page will include:
                </p>
                <ul className="list-disc list-inside text-sm text-yellow-800 dark:text-yellow-200 mt-2 space-y-1">
                  <li>Form pre-populated with current course data</li>
                  <li>Update course metadata (title, description, thumbnail)</li>
                  <li>Modify price and category/difficulty</li>
                  <li>Manage sections (add, update, delete)</li>
                  <li>Toggle active/inactive status</li>
                  <li>IPFS integration for new uploads</li>
                </ul>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-2">
                  <strong>Implementation Guide:</strong> Copy form structure from
                  <code className="mx-1 px-1 bg-yellow-100 dark:bg-yellow-900 rounded">
                    /app/create/page.tsx
                  </code>
                  and replace create functions with update functions.
                </p>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => router.push("/myCourse")}>
                  Cancel
                </Button>
                <Button disabled>
                  Save Changes (Coming Soon)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Implementation Notes */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">
              📋 Implementation Checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">✅ Completed:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Course data loading from blockchain</li>
                  <li>Authorization check (only creator can edit)</li>
                  <li>Navigation from myCourse page</li>
                  <li>Service functions (prepareUpdateCourseTransaction, prepareDeleteCourseTransaction)</li>
                  <li>✨ Query parameter routing (/edit?courseId=123)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">🔄 Pending:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Form implementation (mirror create page)</li>
                  <li>Section management interface</li>
                  <li>IPFS upload for new media</li>
                  <li>Validation and error handling</li>
                  <li>Real-time price conversion (ETH to IDR)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">🔗 Smart Contract Functions Used:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><code>getCourseDetails(courseId)</code> - Read course data</li>
                  <li><code>prepareUpdateCourseTransaction()</code> - Update course</li>
                  <li><code>prepareBatchAddSectionsTransaction()</code> - Add new sections</li>
                  <li><code>updateCourseSection()</code> - Update existing section</li>
                  <li><code>deleteCourseSection()</code> - Remove section</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">🎯 Routing Implementation:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>URL Pattern:</strong> /edit?courseId=123</li>
                  <li><strong>Navigation:</strong> router.push(`/edit?courseId=$&#123;courseId&#125;`)</li>
                  <li><strong>Parameter Extraction:</strong> useSearchParams().get(&apos;courseId&apos;)</li>
                  <li><strong>Benefits:</strong> Non-dynamic route structure as requested</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
