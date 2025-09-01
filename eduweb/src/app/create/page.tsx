import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, Upload, FileText } from "lucide-react"

export default function CreateCoursePage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Create Course</h1>
        <p className="text-muted-foreground">
          Share your knowledge and start earning by creating courses on EduVerse
        </p>
      </div>

      {/* Course Creation Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Course Details</CardTitle>
              <CardDescription>
                Provide the basic information about your course
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Course Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Advanced Smart Contract Development"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Course Description</Label>
                <textarea
                  id="description"
                  placeholder="Describe what students will learn in your course..."
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                    <option value="">Select a category</option>
                    <option value="blockchain">Blockchain</option>
                    <option value="defi">DeFi</option>
                    <option value="nft">NFT</option>
                    <option value="development">Development</option>
                    <option value="trading">Trading</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="level">Difficulty Level</Label>
                  <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                    <option value="">Select difficulty</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Course Price (ETH)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.001"
                  placeholder="0.002"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Course Content</CardTitle>
              <CardDescription>
                Add sections and lessons to your course
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Add Course Content</h3>
                <p className="text-muted-foreground mb-4">
                  Upload videos, documents, and other materials for your course
                </p>
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Section
                </Button>
              </div>

              {/* Sample Section */}
              <div className="space-y-2">
                <h4 className="font-semibold">Section 1: Introduction</h4>
                <div className="ml-4 space-y-2">
                  <div className="flex items-center gap-2 p-2 border rounded">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Lesson 1: Course Overview</span>
                    <Badge variant="secondary" className="ml-auto">Video</Badge>
                  </div>
                  <div className="flex items-center gap-2 p-2 border rounded">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Lesson 2: Prerequisites</span>
                    <Badge variant="secondary" className="ml-auto">Text</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Publishing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                Save Draft
              </Button>
              <Button variant="outline" className="w-full">
                Preview Course
              </Button>
              <Button variant="secondary" className="w-full">
                Publish Course
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Course Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">Quality Standards</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>High-quality video content (720p minimum)</li>
                  <li>Clear audio without background noise</li>
                  <li>Well-structured course outline</li>
                  <li>Practical examples and exercises</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">Content Policy</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Original content only</li>
                  <li>No copyrighted materials</li>
                  <li>Educational focus required</li>
                  <li>Professional presentation</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Earnings Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Course Price:</span>
                  <span>0.002 ETH</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Platform Fee (2%):</span>
                  <span>0.00004 ETH</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Your Earnings:</span>
                  <span>0.00196 ETH</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
