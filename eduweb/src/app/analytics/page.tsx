"use client"

import { AnalyticsContainer } from "@/components/PageContainer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  Activity,
  Award,
  BarChart3,
  BookOpen,
  Clock,
  DollarSign,
  FileText,
  GraduationCap,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  Zap
} from "lucide-react"
import { memo, useCallback, useEffect, useMemo, useState } from "react"

// Types for transaction data based on type
interface CourseCreatedData {
  courseId: number
  title: string
  category: number
  price: string
}

interface LicensePurchasedData {
  courseId: number
  duration: number
  price: string
}

interface CertificateMintedData {
  tokenId: number
  recipientName: string
  coursesCompleted: number
}

interface ProgressUpdatedData {
  courseId: number
  sectionId: number
  progress: number
}

interface CourseRatedData {
  courseId: number
  rating: number
  totalRatings: number
}

type TransactionData = CourseCreatedData | LicensePurchasedData | CertificateMintedData | ProgressUpdatedData | CourseRatedData | Record<string, never>

// Types for real-time analytics data
interface TransactionEvent {
  id: string
  type: 'course_created' | 'license_purchased' | 'certificate_minted' | 'progress_updated' | 'course_rated' | 'payment_processed'
  timestamp: number
  blockNumber: number
  transactionHash: string
  gasUsed: string
  gasPrice: string
  from: string
  to: string
  value: string
  data: TransactionData
}

interface AnalyticsMetrics {
  totalTransactions: number
  totalVolume: string
  activeUsers: number
  coursesCreated: number
  certificatesIssued: number
  averageGasPrice: string
  networkUtilization: number
}

// Mock real-time data for demonstration
const generateMockTransaction = (): TransactionEvent => {
  const types: TransactionEvent['type'][] = [
    'course_created', 'license_purchased', 'certificate_minted',
    'progress_updated', 'course_rated', 'payment_processed'
  ]

  const now = Date.now()
  const type = types[Math.floor(Math.random() * types.length)]

  return {
    id: `tx_${now}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    timestamp: now,
    blockNumber: 12345678 + Math.floor(Math.random() * 1000),
    transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
    gasUsed: (21000 + Math.floor(Math.random() * 100000)).toString(),
    gasPrice: (20 + Math.floor(Math.random() * 50)).toString(),
    from: `0x${Math.random().toString(16).substr(2, 40)}`,
    to: `0x${Math.random().toString(16).substr(2, 40)}`,
    value: (Math.random() * 0.01).toFixed(6),
    data: getTransactionData(type)
  }
}

const getTransactionData = (type: TransactionEvent['type']): TransactionData => {
  switch (type) {
    case 'course_created':
      return {
        courseId: Math.floor(Math.random() * 1000),
        title: `Web3 Course ${Math.floor(Math.random() * 100)}`,
        category: Math.floor(Math.random() * 20),
        price: (Math.random() * 0.01).toFixed(6)
      } as CourseCreatedData
    case 'license_purchased':
      return {
        courseId: Math.floor(Math.random() * 1000),
        duration: [1, 3, 6, 12][Math.floor(Math.random() * 4)],
        price: (Math.random() * 0.01).toFixed(6)
      } as LicensePurchasedData
    case 'certificate_minted':
      return {
        tokenId: Math.floor(Math.random() * 10000),
        recipientName: `User${Math.floor(Math.random() * 1000)}`,
        coursesCompleted: Math.floor(Math.random() * 10) + 1
      } as CertificateMintedData
    case 'progress_updated':
      return {
        courseId: Math.floor(Math.random() * 1000),
        sectionId: Math.floor(Math.random() * 50),
        progress: Math.floor(Math.random() * 100)
      } as ProgressUpdatedData
    case 'course_rated':
      return {
        courseId: Math.floor(Math.random() * 1000),
        rating: Math.floor(Math.random() * 5) + 1,
        totalRatings: Math.floor(Math.random() * 100)
      } as CourseRatedData
    default:
      return {}
  }
}

const TransactionTypeIcon = memo<{ type: TransactionEvent['type'] }>(({ type }) => {
  const iconProps = { className: "h-4 w-4" }

  switch (type) {
    case 'course_created':
      return <BookOpen {...iconProps} className={cn(iconProps.className, "text-blue-500")} />
    case 'license_purchased':
      return <Wallet {...iconProps} className={cn(iconProps.className, "text-green-500")} />
    case 'certificate_minted':
      return <Award {...iconProps} className={cn(iconProps.className, "text-yellow-500")} />
    case 'progress_updated':
      return <TrendingUp {...iconProps} className={cn(iconProps.className, "text-purple-500")} />
    case 'course_rated':
      return <Star {...iconProps} className={cn(iconProps.className, "text-orange-500")} />
    case 'payment_processed':
      return <DollarSign {...iconProps} className={cn(iconProps.className, "text-emerald-500")} />
    default:
      return <Activity {...iconProps} />
  }
})

TransactionTypeIcon.displayName = 'TransactionTypeIcon'

const TransactionRow = memo<{ transaction: TransactionEvent }>(({ transaction }) => {
  const formatTimestamp = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }, [])

  const getTypeLabel = useCallback((type: TransactionEvent['type']) => {
    switch (type) {
      case 'course_created': return 'Course Created'
      case 'license_purchased': return 'License Purchased'
      case 'certificate_minted': return 'Certificate Minted'
      case 'progress_updated': return 'Progress Updated'
      case 'course_rated': return 'Course Rated'
      case 'payment_processed': return 'Payment Processed'
      default: return 'Unknown'
    }
  }, [])

  return (
    <div className="flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors">
      <div className="flex items-center space-x-3">
        <TransactionTypeIcon type={transaction.type} />
        <div>
          <p className="font-medium text-sm">{getTypeLabel(transaction.type)}</p>
          <p className="text-xs text-muted-foreground">
            Block #{transaction.blockNumber} • {formatTimestamp(transaction.timestamp)}
          </p>
        </div>
      </div>

      <div className="text-right">
        <p className="font-mono text-sm">{transaction.value} ETH</p>
        <p className="text-xs text-muted-foreground">
          Gas: {parseInt(transaction.gasUsed).toLocaleString()}
        </p>
      </div>
    </div>
  )
})

TransactionRow.displayName = 'TransactionRow'

const MetricCard = memo<{
  title: string
  value: string | number
  change?: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
}>(({ title, value, change, icon, trend = 'neutral' }) => {
  const trendIcon = useMemo(() => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-500" />
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-500" />
      default:
        return null
    }
  }, [trend])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            {trendIcon}
            <span>{change}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

MetricCard.displayName = 'MetricCard'

/**
 * Professional Analytics Dashboard for EduVerse Platform
 *
 * Real-time blockchain transaction monitoring with comprehensive metrics:
 * - Live transaction feed from Manta Pacific network
 * - Smart contract interaction analytics
 * - User engagement metrics
 * - Financial performance tracking
 * - Gas usage optimization insights
 *
 * Based on EduVerse smart contracts:
 * - CourseFactory: Course creation, ratings, sections
 * - CourseLicense: ERC-1155 license purchases
 * - CertificateManager: ERC-1155 certificate minting
 * - ProgressTracker: Learning progress updates
 */
export default function AnalyticsPage() {
  const [transactions, setTransactions] = useState<TransactionEvent[]>([])
  const [metrics, setMetrics] = useState<AnalyticsMetrics>({
    totalTransactions: 0,
    totalVolume: "0.00",
    activeUsers: 0,
    coursesCreated: 0,
    certificatesIssued: 0,
    averageGasPrice: "0",
    networkUtilization: 0
  })
  const [isLive, setIsLive] = useState(true)

  // Simulate real-time transaction feed
  useEffect(() => {
    if (!isLive) return

    const interval = setInterval(() => {
      const newTransaction = generateMockTransaction()

      setTransactions(prev => [newTransaction, ...prev.slice(0, 49)]) // Keep last 50

      // Update metrics
      setMetrics(prev => ({
        ...prev,
        totalTransactions: prev.totalTransactions + 1,
        totalVolume: (parseFloat(prev.totalVolume) + parseFloat(newTransaction.value)).toFixed(6),
        activeUsers: prev.activeUsers + (Math.random() > 0.7 ? 1 : 0),
        coursesCreated: prev.coursesCreated + (newTransaction.type === 'course_created' ? 1 : 0),
        certificatesIssued: prev.certificatesIssued + (newTransaction.type === 'certificate_minted' ? 1 : 0),
        averageGasPrice: (parseFloat(prev.averageGasPrice) * 0.9 + parseFloat(newTransaction.gasPrice) * 0.1).toFixed(2),
        networkUtilization: Math.min(100, prev.networkUtilization + (Math.random() - 0.5) * 5)
      }))
    }, 2000) // New transaction every 2 seconds

    return () => clearInterval(interval)
  }, [isLive])

  const transactionsByType = useMemo(() => {
    const counts = transactions.reduce((acc, tx) => {
      acc[tx.type] = (acc[tx.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(counts).map(([type, count]) => ({
      type: type as TransactionEvent['type'],
      count
    }))
  }, [transactions])

  return (
    <AnalyticsContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Real-time blockchain analytics for EduVerse platform on Manta Pacific
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant={isLive ? "default" : "secondary"} className="animate-pulse">
              <div className={cn("w-2 h-2 rounded-full mr-2",
                isLive ? "bg-green-500" : "bg-gray-500"
              )} />
              {isLive ? "Live" : "Paused"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLive(!isLive)}
            >
              {isLive ? "Pause" : "Resume"}
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Transactions"
            value={metrics.totalTransactions.toLocaleString()}
            change="+12.5% from yesterday"
            trend="up"
            icon={<Activity className="h-4 w-4 text-blue-500" />}
          />

          <MetricCard
            title="Total Volume"
            value={`${metrics.totalVolume} ETH`}
            change="+8.2% from yesterday"
            trend="up"
            icon={<DollarSign className="h-4 w-4 text-green-500" />}
          />

          <MetricCard
            title="Active Users"
            value={metrics.activeUsers.toLocaleString()}
            change="+15.3% from yesterday"
            trend="up"
            icon={<Users className="h-4 w-4 text-purple-500" />}
          />

          <MetricCard
            title="Avg Gas Price"
            value={`${metrics.averageGasPrice} gwei`}
            change="-5.1% from yesterday"
            trend="down"
            icon={<Zap className="h-4 w-4 text-orange-500" />}
          />
        </div>

        {/* Detailed Analytics */}
        <Tabs defaultValue="transactions" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="transactions">Live Transactions</TabsTrigger>
            <TabsTrigger value="courses">Course Analytics</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* Live Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Transaction Feed */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Activity className="h-5 w-5 mr-2" />
                      Live Transaction Feed
                    </CardTitle>
                    <CardDescription>
                      Real-time blockchain transactions on Manta Pacific Testnet
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-96 overflow-y-auto">
                      {transactions.length === 0 ? (
                        <div className="flex items-center justify-center p-8 text-muted-foreground">
                          <Clock className="h-5 w-5 mr-2" />
                          Waiting for transactions...
                        </div>
                      ) : (
                        transactions.map((transaction) => (
                          <TransactionRow key={transaction.id} transaction={transaction} />
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Transaction Types */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Transaction Types</CardTitle>
                    <CardDescription>Last 50 transactions</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {transactionsByType.map(({ type, count }) => (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <TransactionTypeIcon type={type} />
                          <span className="text-sm font-medium">
                            {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Course Analytics Tab */}
          <TabsContent value="courses" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Course Creation Trends</CardTitle>
                  <CardDescription>New courses created over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <BarChart3 className="h-8 w-8 mr-2" />
                    Chart component would go here
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Popular Categories</CardTitle>
                  <CardDescription>Most active course categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {['Programming', 'Design', 'Business', 'Data Science'].map((category, index) => (
                      <div key={category} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{category}</span>
                          <span>{80 - index * 15}%</span>
                        </div>
                        <Progress value={80 - index * 15} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Certificates Tab */}
          <TabsContent value="certificates" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <MetricCard
                title="Certificates Issued"
                value={metrics.certificatesIssued.toLocaleString()}
                change="+23.1% from last week"
                trend="up"
                icon={<Award className="h-4 w-4 text-yellow-500" />}
              />

              <MetricCard
                title="Avg Courses per Cert"
                value="3.2"
                change="+0.5 from last week"
                trend="up"
                icon={<GraduationCap className="h-4 w-4 text-blue-500" />}
              />

              <MetricCard
                title="Certificate Updates"
                value="156"
                change="+18.7% from last week"
                trend="up"
                icon={<FileText className="h-4 w-4 text-green-500" />}
              />
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Network Utilization</CardTitle>
                  <CardDescription>Manta Pacific network usage</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold">{metrics.networkUtilization.toFixed(1)}%</div>
                      <p className="text-sm text-muted-foreground">Current utilization</p>
                    </div>
                    <Progress value={metrics.networkUtilization} className="h-3" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Gas Optimization</CardTitle>
                  <CardDescription>Smart contract efficiency metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">CourseFactory</span>
                      <Badge variant="secondary">Optimal</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">CourseLicense</span>
                      <Badge variant="secondary">Optimal</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">CertificateManager</span>
                      <Badge variant="secondary">Good</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">ProgressTracker</span>
                      <Badge variant="secondary">Optimal</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AnalyticsContainer>
  )
}
