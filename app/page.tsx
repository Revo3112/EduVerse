"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Search, Youtube, BookOpen } from "lucide-react"


interface Course {
  id: number
  title: string
  instructor: string
  type: "Free" | "Paid"
  thumbnail: string
  chapters?: number
  isYoutube?: boolean
}

export default function Page() {
  const [activeTab, setActiveTab] = useState("all")

  const courses: Course[] = [
    {
      id: 1,
      title: "Car Rental NextJS",
      instructor: "Tubeguruji",
      type: "Free",
      thumbnail: "/placeholder.svg?height=200&width=400",
      isYoutube: true,
    },
    {
      id: 2,
      title: "React Native Home Service App",
      instructor: "Tubeguruji",
      type: "Paid",
      thumbnail: "/placeholder.svg?height=200&width=400",
      chapters: 18,
    },
    {
      id: 3,
      title: "NextJs Business Listing App",
      instructor: "Tubeguruji",
      type: "Free",
      thumbnail: "/placeholder.svg?height=200&width=400",
      isYoutube: true,
    },
    {
      id: 4,
      title: "React Native Hospital Appointment",
      instructor: "Tubeguruji",
      type: "Free",
      thumbnail: "/placeholder.svg?height=200&width=400",
      chapters: 21,
    },
  ]

  const tabs = [
    { id: "all", label: "All" },
    { id: "react", label: "React.Js" },
    { id: "next", label: "Next.Js" },
    { id: "tailwind", label: "Tailwind CSS" },
    { id: "firebase", label: "Firebase" },
    { id: "google-map", label: "Google Map" },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/placeholder.svg?height=50&width=50"
              alt="TubeGuriji"
              width={50}
              height={50}
              className="rounded-full"
            />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="search"
                placeholder="Search Course"
                className="w-[400px] bg-white border border-gray-200 rounded-md pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
          <button className="px-4 py-2 text-purple-500 border border-purple-500 rounded-md hover:bg-purple-50">
            Login
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md ${
                activeTab === tab.id
                  ? "bg-purple-500 text-white"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-purple-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Course Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {courses.map((course) => (
            <Link href="#" key={course.id}>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-purple-500 hover:shadow-md transition-all">
                <Image
                  src={course.thumbnail || "/placeholder.svg"}
                  alt={course.title}
                  width={400}
                  height={200}
                  className="w-full object-cover"
                />
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{course.title}</h3>
                  <p className="text-gray-500 text-sm">{course.instructor}</p>
                  <div className="flex items-center justify-between mt-4">
                    <span className={`text-sm ${course.type === "Free" ? "text-green-500" : "text-purple-500"}`}>
                      {course.type}
                    </span>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      {course.isYoutube ? (
                        <>
                          <Youtube className="h-4 w-4" />
                          Watch on Youtube
                        </>
                      ) : (
                        <>
                          <BookOpen className="h-4 w-4" />
                          {course.chapters} Chapters
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}

