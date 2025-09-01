import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Filter, BookOpen, Star, Clock, Users } from "lucide-react"

export default function CoursesPage() {
  const courses = [
    {
      id: 1,
      title: "Blockchain Fundamentals",
      description: "Learn the basics of blockchain technology and cryptocurrency",
      instructor: "Dr. Alice Johnson",
      price: "0.001 ETH",
      rating: 4.8,
      students: 1245,
      duration: "8 weeks",
      level: "Beginner",
      category: "Blockchain"
    },
    {
      id: 2,
      title: "Advanced Solidity Development",
      description: "Master smart contract development with advanced patterns",
      instructor: "Prof. Bob Wilson",
      price: "0.003 ETH",
      rating: 4.9,
      students: 856,
      duration: "12 weeks",
      level: "Advanced",
      category: "Development"
    },
    {
      id: 3,
      title: "DeFi Protocol Design",
      description: "Build decentralized finance protocols from scratch",
      instructor: "Sarah Chen",
      price: "0.004 ETH",
      rating: 4.7,
      students: 634,
      duration: "10 weeks",
      level: "Intermediate",
      category: "DeFi"
    },
    {
      id: 4,
      title: "NFT Marketplace Development",
      description: "Create your own NFT marketplace with full functionality",
      instructor: "Mike Rodriguez",
      price: "0.002 ETH",
      rating: 4.6,
      students: 923,
      duration: "6 weeks",
      level: "Intermediate",
      category: "NFT"
    }
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Browse Courses</h1>
        <p className="text-muted-foreground">
          Discover and enroll in Web3 courses from expert instructors
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="shrink-0">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {courses.map((course) => (
          <Card key={course.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <Badge variant="secondary" className="mb-2">
                  {course.category}
                </Badge>
                <Badge variant={course.level === 'Beginner' ? 'default' : course.level === 'Intermediate' ? 'secondary' : 'destructive'}>
                  {course.level}
                </Badge>
              </div>
              <CardTitle className="text-lg leading-tight">
                {course.title}
              </CardTitle>
              <CardDescription className="line-clamp-2">
                {course.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                by {course.instructor}
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  {course.rating}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {course.students.toLocaleString()}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {course.duration}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-lg font-bold text-primary">
                  {course.price}
                </div>
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Enroll
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load More */}
      <div className="flex justify-center pt-6">
        <Button variant="outline" size="lg">
          Load More Courses
        </Button>
      </div>
    </div>
  )
}
