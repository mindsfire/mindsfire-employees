import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import {
  UsersIcon,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import { useAuth } from "../contexts/AuthContext"

export function AppSidebar({
  onLogout,
  onChangePassword,
  onLogoClick,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  onLogout?: () => void
  onChangePassword?: () => void
  onLogoClick?: () => void
}) {
  const { user } = useAuth()

  const navMain = [
    {
      title: "Attendance Records",
      url: "/",
      icon: UsersIcon,
    },
  ]

  if (user?.role === "admin") {
    navMain.push({
      title: "Admin Panel",
      url: "/admin",
      icon: UsersIcon,
    })
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/" onClick={() => onLogoClick?.()}>
                <Image
                  src="/logo-only.svg"
                  alt="Mindsfire"
                  width={20}
                  height={20}
                  className="object-contain"
                  priority
                />
                <span className="text-base font-semibold">Mindsfire</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        {user && (
          <NavUser
            user={{ name: user.name, email: user.email }}
            onLogout={onLogout}
            onChangePassword={onChangePassword}
          />
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
