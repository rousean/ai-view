import {
  Bell,
  Clock,
  Database,
  Image as ImageIcon,
  LayoutDashboard,
  type LucideIcon,
  MonitorPlay,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react'

/**
 * Single source of truth for the management sidebar.
 *
 *   - `to` is the TanStack Router path; the active item is derived from
 *     the current location (no parallel state machine).
 *   - `count` is shown as a small badge to the right of the label.
 *   - `breadcrumb` is the trail rendered in the top bar.
 */
export interface NavItem {
  id: string
  label: string
  to: string
  icon: LucideIcon
  count?: number
  breadcrumb: string[]
}

export interface NavSection {
  label: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: '工作区',
    items: [
      {
        id: 'dashboard',
        label: '仪表盘',
        to: '/management/dashboard',
        icon: LayoutDashboard,
        breadcrumb: ['工作区', '仪表盘'],
      },
      {
        id: 'screens',
        label: '我的大屏',
        to: '/management/screens',
        icon: MonitorPlay,
        // Count is filled in dynamically by ManagementShell from useProjects().
        breadcrumb: ['工作区', '我的大屏'],
      },
      {
        id: 'templates',
        label: '模板市场',
        to: '/management/templates',
        icon: Sparkles,
        breadcrumb: ['工作区', '模板市场'],
      },
    ],
  },
  {
    label: '资源',
    items: [
      {
        id: 'data',
        label: '数据源',
        to: '/management/data',
        icon: Database,
        count: 9,
        breadcrumb: ['资源', '数据源'],
      },
      {
        id: 'assets',
        label: '资源库',
        to: '/management/assets',
        icon: ImageIcon,
        breadcrumb: ['资源', '资源库'],
      },
    ],
  },
  {
    label: '团队',
    items: [
      {
        id: 'members',
        label: '成员',
        to: '/management/members',
        icon: Users,
        breadcrumb: ['团队', '成员'],
      },
      {
        id: 'logs',
        label: '操作日志',
        to: '/management/logs',
        icon: Clock,
        breadcrumb: ['团队', '操作日志'],
      },
      {
        id: 'settings',
        label: '设置',
        to: '/management/settings',
        icon: Settings,
        breadcrumb: ['团队', '设置'],
      },
    ],
  },
]

/** Resolve breadcrumb trail for the current pathname. */
export function breadcrumbFor(pathname: string): string[] {
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (item.to === pathname) return item.breadcrumb
    }
  }
  return ['工作区']
}

/** Icon for the notifications badge. Exported separately to avoid a giant nav-config import. */
export { Bell }
