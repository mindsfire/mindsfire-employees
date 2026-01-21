import { useEffect, useState } from "react"
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react"

import { daysAgo, startOfMonth } from "@/utils/dateUtils"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export type AttendanceRecord = {
  id: string
  name: string
  loginTime: Date
  logoutTime: Date | null
}

type SectionCardsProps = {
  records: AttendanceRecord[]
  currentSessionId: string | null
  userName: string
}

export function SectionCards({
  records,
  currentSessionId,
  userName,
}: SectionCardsProps) {
  const [now, setNow] = useState(0)
  const userRecords = records.filter((record) => record.name === userName)
  const weekAgo = daysAgo(7)
  const weekRecords = userRecords.filter((record) => record.loginTime >= weekAgo)
  const thisMonth = startOfMonth()
  const monthRecords = userRecords.filter((record) => record.loginTime >= thisMonth)

  const calculateTotalHours = (items: AttendanceRecord[]) => {
    return items.reduce((total, record) => {
      if (record.logoutTime) {
        const diff = record.logoutTime.getTime() - record.loginTime.getTime()
        if (diff < 0) return total
        return total + diff
      }
      return total
    }, 0)
  }

  const calculateAverageHours = (items: AttendanceRecord[]) => {
    const validRecords = items.filter((record) => {
      if (!record.logoutTime) return false
      return record.logoutTime.getTime() - record.loginTime.getTime() >= 0
    })

    if (validRecords.length === 0) return 0
    const totalMs = calculateTotalHours(validRecords)
    return totalMs / validRecords.length
  }

  const formatHours = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const countLateArrivals = (items: AttendanceRecord[]) => {
    return items.filter((record) => record.loginTime.getHours() > 10).length
  }

  useEffect(() => {
    if (!currentSessionId) {
      return
    }

    const timeout = setTimeout(() => {
      setNow(Date.now())
    }, 0)
    const interval = setInterval(() => {
      setNow(Date.now())
    }, 60000)

    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
    }
  }, [currentSessionId])

  const currentSessionDuration = currentSessionId
    ? (() => {
        const session = userRecords.find((record) => record.id === currentSessionId)
        if (session && now > 0) {
          const diff = now - session.loginTime.getTime()
          return formatHours(diff)
        }
        return "0h 0m"
      })()
    : "0h 0m"

  const weekHours = formatHours(calculateTotalHours(weekRecords))
  const monthDaysCompleted = monthRecords.filter((record) => record.logoutTime)
    .length
  const averageMonthHours = formatHours(calculateAverageHours(monthRecords))
  const lateThisMonth = countLateArrivals(monthRecords)
  const punctualityPercent =
    monthRecords.length > 0
      ? Math.round(
          ((monthRecords.length - lateThisMonth) / monthRecords.length) * 100
        )
      : 0

  return (
    <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>Today&apos;s Status</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {currentSessionId ? "Clocked In" : "Not Clocked In"}
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
              {currentSessionId ? (
                <TrendingUpIcon className="size-3" />
              ) : (
                <TrendingDownIcon className="size-3" />
              )}
              {currentSessionId ? "Active" : "Idle"}
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {currentSessionId ? "Session running" : "No active session"}
            <TrendingUpIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Duration: {currentSessionDuration}
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>This Week</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {weekHours}
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
              <TrendingDownIcon className="size-3" />
              {weekRecords.filter((record) => record.logoutTime).length} days
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Weekly total hours <TrendingUpIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {weekRecords.filter((record) => record.logoutTime).length} days completed
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>This Month</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {monthDaysCompleted} days
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
              <TrendingUpIcon className="size-3" />
              Avg {averageMonthHours}
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Monthly summary <TrendingUpIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">Avg: {averageMonthHours}</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>Punctuality</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {punctualityPercent}%
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
              {lateThisMonth > 0 ? (
                <TrendingDownIcon className="size-3" />
              ) : (
                <TrendingUpIcon className="size-3" />
              )}
              {lateThisMonth} late
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            On-time rate <TrendingUpIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">{lateThisMonth} late this month</div>
        </CardFooter>
      </Card>
    </div>
  )
}
