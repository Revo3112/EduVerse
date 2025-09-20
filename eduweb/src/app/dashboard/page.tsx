import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, BookOpen, GraduationCap, Users, TrendingUp, Award } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white">
          Welcome to EduVerse
        </h1>
        <p className="text-muted-foreground">
          Your unified Web3 education dashboard - Learn, Teach, and Earn
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Courses Enrolled
            </CardTitle>
            <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">12</div>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              +2 from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
              Courses Created
            </CardTitle>
            <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">5</div>
            <p className="text-xs text-green-600 dark:text-green-400">
              +1 from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
              Certificates Earned
            </CardTitle>
            <Award className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">8</div>
            <p className="text-xs text-purple-600 dark:text-purple-400">
              +3 from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">
              ETH Earned
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">0.156</div>
            <p className="text-xs text-orange-600 dark:text-orange-400">
              +0.023 from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Continue Learning
            </CardTitle>
            <CardDescription>
              Pick up where you left off in your learning journey
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div className="space-y-1">
                <p className="font-medium">Advanced Solidity Development</p>
                <p className="text-sm text-muted-foreground">Progress: 75%</p>
              </div>
              <Badge variant="secondary">In Progress</Badge>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div className="space-y-1">
                <p className="font-medium">DeFi Protocol Design</p>
                <p className="text-sm text-muted-foreground">Progress: 45%</p>
              </div>
              <Badge variant="secondary">In Progress</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Teaching Overview
            </CardTitle>
            <CardDescription>
              Monitor your courses and student engagement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div className="space-y-1">
                <p className="font-medium">Blockchain Fundamentals</p>
                <p className="text-sm text-muted-foreground">156 students enrolled</p>
              </div>
              <Badge variant="default">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div className="space-y-1">
                <p className="font-medium">Smart Contract Security</p>
                <p className="text-sm text-muted-foreground">89 students enrolled</p>
              </div>
              <Badge variant="default">Active</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your latest interactions on the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-4 p-4 rounded-lg bg-muted/50">
              <Award className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">Certificate Earned</p>
                <p className="text-sm text-muted-foreground">
                  Completed &quot;Advanced DeFi Strategies&quot; course
                </p>
                <p className="text-xs text-muted-foreground">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-4 p-4 rounded-lg bg-muted/50">
              <BookOpen className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">Course Section Added</p>
                <p className="text-sm text-muted-foreground">
                  Added new section to &quot;Blockchain Fundamentals&quot;
                </p>
                <p className="text-xs text-muted-foreground">1 day ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-4 p-4 rounded-lg bg-muted/50">
              <Users className="h-5 w-5 text-green-500 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">New Student Enrollment</p>
                <p className="text-sm text-muted-foreground">
                  23 new students enrolled in your courses this week
                </p>
                <p className="text-xs text-muted-foreground">3 days ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
