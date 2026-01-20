import Image from "next/image"
import Link from "next/link"

import { LogOutIcon, LockIcon } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeader({
  title,
  user,
  onLogout,
  onChangePassword,
  onLogoClick,
}: {
  title: string
  user: { name: string; email: string } | null
  onLogout: () => void
  onChangePassword: () => void
  onLogoClick: () => void
}) {
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : ""

  return (
    <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-2 px-4 lg:gap-3 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />
        <Link
          href="/"
          className="flex items-center gap-2"
          onClick={() => onLogoClick()}
        >
          <Image
            src="/logo-only.svg"
            alt="Mindsfire"
            width={28}
            height={28}
            className="object-contain"
            priority
          />
          <h1 className="text-base font-medium">{title}</h1>
        </Link>

        <div className="ml-auto flex items-center">
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 px-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <span className="ml-2 hidden text-sm font-medium sm:inline">
                    {user.name}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="grid">
                    <span className="text-sm font-medium">{user.name}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onChangePassword}>
                  <LockIcon className="mr-2 h-4 w-4" />
                  Change password
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onLogout}>
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
