"use client"

import React, { useCallback, useState } from 'react'
import Image from 'next/image'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { User, Video, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils' // Pastikan Anda memiliki utilitas ini

// Tipe Data Event (tidak ada perubahan)
interface TimelineEvent {
  id: number
  date: string
  day: string
  time: string
  title: string
  description: string
  organizer: {
    name: string
    avatar: string
  }
  location: string
  isVirtual: boolean
  status: 'Invited' | 'Going'
  attendees: {
    avatar: string
    name: string
  }[]
  extraAttendees: number
  coverImage: string
}

// Mock Data Event (tidak ada perubahan)
const mockEvents: TimelineEvent[] = [
  {
    id: 1,
    date: 'Sep 19',
    day: 'Friday',
    time: '8:00 PM',
    title: "Boss Phil's Talks : LinkedIn Cheat Codes with Mancer",
    description: 'Join us for an exclusive talk with Mancer on mastering LinkedIn for career growth. Learn the cheat codes to optimize your profile, network effectively, and land your dream job.',
    organizer: { name: 'Phii', avatar: 'https://i.pravatar.cc/32?u=phii' },
    location: 'Virtual',
    isVirtual: true,
    status: 'Invited',
    attendees: [
      { avatar: 'https://i.pravatar.cc/32?u=a', name: 'User A' },
      { avatar: 'https://i.pravatar.cc/32?u=b', name: 'User B' },
      { avatar: 'https://i.pravatar.cc/32?u=c', name: 'User C' }
    ],
    extraAttendees: 44,
    coverImage: '/images/event-1.png'
  },
  {
    id: 2,
    date: 'Sep 13',
    day: 'Saturday',
    time: '2:00 PM',
    title: 'Jakarta, Indonesia',
    description: 'A cultural event celebrating the vibrant arts and culinary scene of Jakarta. Featuring live music, traditional food stalls, and art installations from local artists.',
    organizer: { name: 'Chef Fran', avatar: 'https://i.pravatar.cc/32?u=fran' },
    location: 'JURA Kemanggisan',
    isVirtual: false,
    status: 'Going',
    attendees: [
      { avatar: 'https://i.pravatar.cc/32?u=d', name: 'User D' },
      { avatar: 'https://i.pravatar.cc/32?u=e', name: 'User E' },
      { avatar: 'https://i.pravatar.cc/32?u=f', name: 'User F' }
    ],
    extraAttendees: 199,
    coverImage: '/images/event-2.png'
  },
  {
    id: 3,
    date: 'Sep 12',
    day: 'Friday',
    time: '8:00 PM',
    title: 'Web3 Career AMA with Rizzky Onboard',
    description: 'Ask Me Anything session with Web3 expert Rizzky Onboard. Dive deep into the future of decentralized internet, career opportunities in blockchain, and tips for breaking into the industry.',
    organizer: { name: 'Phii', avatar: 'https://i.pravatar.cc/32?u=phii' },
    location: 'Virtual',
    isVirtual: true,
    status: 'Invited',
    attendees: [
      { avatar: 'https://i.pravatar.cc/32?u=g', name: 'User G' },
      { avatar: 'https://i.pravatar.cc/32?u=h', name: 'User H' },
      { avatar: 'https://i.pravatar.cc/32?u=i', name: 'User I' }
    ],
    extraAttendees: 80,
    coverImage: '/images/event-3.png'
  }
]

//================================================================//
// *** KOMPONEN TIMELINE ITEM YANG TELAH DISEMPURNAKAN *** //
//================================================================//
interface TimelineItemProps {
  event: TimelineEvent
  isLast: boolean
  onClick: () => void
}

const TimelineItem: React.FC<TimelineItemProps> = ({ event, isLast, onClick }) => {
  return (
    // Menggunakan flexbox untuk struktur utama per baris
    <div className="relative flex">
      {/* Kolom 1: Tanggal (rata kanan, lebar tetap, dan padding untuk jarak) */}
      <div className="w-28 flex-shrink-0 text-right pr-8 pt-1">
        <p className="font-semibold text-white">{event.date}</p>
        <p className="text-sm text-gray-400">{event.day}</p>
      </div>

      {/* Kolom 2: Titik dan Garis Penghubung (sebagai jangkar tengah) */}
      <div className="relative w-5 flex-shrink-0 flex justify-center">
        {/* Garis Putus-putus */}
        {!isLast && (
          <div
            className="absolute w-px top-5 h-full" // `top-5` untuk mulai di bawah titik
            style={{
              left: '50%', // Selalu di tengah kolom ini
              transform: 'translateX(-50%)', // Trik untuk penyejajaran horizontal sempurna
              backgroundImage: 'linear-gradient(to bottom, #4A5568 4px, transparent 4px)',
              backgroundSize: '1px 12px',
            }}
          />
        )}
        {/* Titik Timeline */}
        <div className="relative z-10 h-3 w-3 mt-[7px] rounded-full bg-gray-500 border-2 border-[#121212]" />
      </div>

      {/* Kolom 3: Kartu Konten Acara */}
      <div className="flex-1 pb-10 pl-8">
        <Card
          onClick={onClick}
          className="bg-[#1C1C1C] border border-gray-800 shadow-md transition-all hover:border-gray-700 cursor-pointer"
        >
          <CardContent className="p-4">
            <div className="flex flex-col gap-2">
              <p className="text-xs text-gray-400">{event.time}</p>
              <h3 className="text-md font-bold text-white leading-tight">{event.title}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <User className="w-4 h-4" />
                <span>By {event.organizer.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                {event.isVirtual ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                <span>{event.location}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <Badge
                className={cn(
                  'text-xs font-semibold px-2.5 py-0.5',
                  event.status === 'Going'
                    ? 'bg-green-900/50 text-green-300 border border-green-700/50'
                    : 'bg-blue-900/50 text-blue-300 border border-blue-700/50'
                )}
              >
                {event.status}
              </Badge>
              <div className="flex items-center">
                <div className="flex -space-x-2">
                  {event.attendees.map((attendee) => (
                    <Avatar key={attendee.name} className="w-6 h-6 border-2 border-[#1C1C1C]">
                      <AvatarImage src={attendee.avatar} alt={attendee.name} />
                      <AvatarFallback>{attendee.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                {event.extraAttendees > 0 && (
                  <span className="ml-2 text-xs text-gray-400">+{event.extraAttendees}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


// Komponen Halaman Utama (tidak ada perubahan signifikan)
export default function EventTimelinePage() {
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);

  const handleEventClick = useCallback((event: TimelineEvent) => {
    setSelectedEvent(event);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  return (
    <>
      <div className="bg-[#121212] min-h-screen p-4 sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">Events</h1>
            <p className="text-gray-400">Your upcoming and past events timeline.</p>
          </div>

          <div className="relative flex flex-col">
            {mockEvents.map((event, index) => (
              <TimelineItem
                key={event.id}
                event={event}
                isLast={index === mockEvents.length - 1}
                onClick={() => handleEventClick(event)}
              />
            ))}
          </div>

        </div>
      </div>

      {/* Drawer untuk detail event (tetap dipertahankan) */}
      <Sheet open={!!selectedEvent} onOpenChange={(isOpen) => !isOpen && handleDrawerClose()}>
        <SheetContent className="w-full sm:max-w-lg bg-[#181818] border-l border-gray-800 text-white p-0">
          {selectedEvent && (
            <>
              <SheetHeader className="p-6 border-b border-gray-800">
                <SheetTitle className="text-white text-xl">{selectedEvent.title}</SheetTitle>
                <SheetDescription className="text-gray-400">
                  {selectedEvent.date}, {selectedEvent.time}
                </SheetDescription>
              </SheetHeader>
              <div className="p-6 space-y-6">
                <div className="relative w-full h-48 rounded-lg overflow-hidden">
                  <Image
                    src={selectedEvent.coverImage}
                    alt={selectedEvent.title}
                    layout="fill"
                    objectFit="cover"
                    unoptimized
                  />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">About this event</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">{selectedEvent.description}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Organizer</h3>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={selectedEvent.organizer.avatar} />
                      <AvatarFallback>{selectedEvent.organizer.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-gray-300">{selectedEvent.organizer.name}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
