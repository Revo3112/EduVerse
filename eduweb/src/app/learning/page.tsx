import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PlayCircle, CheckCircle, Award, Clock } from "lucide-react"

export default function LearningPage() {
  const enrolledCourses = [
    {
      id: 1,
      title: "Advanced Solidity Development",
      instructor: "Prof. Bob Wilson",
      progress: 75,
      totalLessons: 48,
      completedLessons: 36,
      nextLesson: "Gas Optimization Techniques",
      status: "In Progress",
      timeSpent: "28 hours"
    },
    {
      id: 2,
      title: "DeFi Protocol Design",
      instructor: "Sarah Chen",
      progress: 45,
      totalLessons: 32,
      completedLessons: 14,
      nextLesson: "Liquidity Pool Implementation",
      status: "In Progress",
      timeSpent: "18 hours"
    },
    {
      id: 3,
      title: "Blockchain Fundamentals",
      instructor: "Dr. Alice Johnson",
      progress: 100,
      totalLessons: 24,
      completedLessons: 24,
      nextLesson: null,
      status: "Completed",
      timeSpent: "16 hours"
    }
  ]

  const recentActivity = [
    {
      type: "lesson_completed",
      title: "Smart Contract Security Patterns",
      course: "Advanced Solidity Development",
      timestamp: "2 hours ago",
      icon: CheckCircle
    },
    {
      type: "quiz_passed",
      title: "Module 3 Quiz: Gas Optimization",
      course: "Advanced Solidity Development",
      timestamp: "1 day ago",
      icon: Award
    },
    {
      type: "lesson_started",
      title: "Yield Farming Strategies",
      course: "DeFi Protocol Design",
      timestamp: "2 days ago",
      icon: PlayCircle
    }
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">My Learning</h1>
        <p className="text-muted-foreground">
          Track your progress and continue your Web3 education journey
        </p>
      </div>

      {/* Learning Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Courses in Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">
              Keep going!
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Courses Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">
              Great achievement!
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Study Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">62h</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Enrolled Courses */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Enrolled Courses</h2>
        <div className="grid gap-4">
          {enrolledCourses.map((course) => (
            <Card key={course.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{course.title}</CardTitle>
                    <CardDescription>by {course.instructor}</CardDescription>
                  </div>
                  <Badge
                    variant={course.status === 'Completed' ? 'default' : 'secondary'}
                    className={course.status === 'Completed' ? 'bg-green-500' : ''}
                  >
                    {course.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress: {course.completedLessons}/{course.totalLessons} lessons</span>
                    <span>{course.progress}%</span>
                  </div>
                  <Progress value={course.progress} className="w-full" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {course.timeSpent}
                    </div>
                  </div>

                  {course.nextLesson ? (
                    <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Continue: {course.nextLesson.length > 20 ?
                        course.nextLesson.substring(0, 20) + '...' :
                        course.nextLesson}
                    </Button>
                  ) : (
                    <Button variant="outline">
                      <Award className="h-4 w-4 mr-2" />
                      View Certificate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Activity</h2>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {recentActivity.map((activity, index) => {
                const Icon = activity.icon
                return (
                  <div key={index} className="flex items-start space-x-4">
                    <Icon className={`h-5 w-5 mt-0.5 ${
                      activity.type === 'lesson_completed' ? 'text-green-500' :
                      activity.type === 'quiz_passed' ? 'text-yellow-500' :
                      'text-blue-500'
                    }`} />
                    <div className="space-y-1 flex-1">
                      <p className="font-medium">{activity.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.course}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.timestamp}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
