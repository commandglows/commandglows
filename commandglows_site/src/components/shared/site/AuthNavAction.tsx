import { Show, UserButton } from '@clerk/astro/react'

interface AuthNavActionProps {
  className: string
  overviewLabel: string
  settingsLabel: string
  signInLabel: string
  signInUrl: string
  tasksLabel: string
}

const createMenuIcon = (path: string) => (element: HTMLDivElement) => {
  element.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${path}" /></svg>`
}
const clearMenuIcon = (element?: HTMLDivElement) => element?.replaceChildren()
const mountOverviewIcon = createMenuIcon(
  'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z'
)
const mountTasksIcon = createMenuIcon(
  'M9 5h10M9 12h10M9 19h10M4 5h.01M4 12h.01M4 19h.01'
)
const mountSettingsIcon = createMenuIcon(
  'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7'
)

export default function AuthNavAction({
  className,
  overviewLabel,
  settingsLabel,
  signInLabel,
  signInUrl,
  tasksLabel,
}: AuthNavActionProps) {
  return (
    <Show
      when="signed-in"
      fallback={
        <a href={signInUrl} className={className}>
          {signInLabel}
        </a>
      }
    >
      <div className="account-menu-shell flex min-h-11 min-w-11 items-center justify-center">
        <UserButton
          userProfileMode="navigation"
          userProfileUrl="/dashboard/parametres"
          customMenuItems={[
            {
              label: overviewLabel,
              href: '/dashboard',
              mountIcon: mountOverviewIcon,
              unmountIcon: clearMenuIcon,
            },
            {
              label: tasksLabel,
              href: '/dashboard/taches',
              mountIcon: mountTasksIcon,
              unmountIcon: clearMenuIcon,
            },
            {
              label: settingsLabel,
              href: '/dashboard/parametres',
              mountIcon: mountSettingsIcon,
              unmountIcon: clearMenuIcon,
            },
          ]}
          appearance={{
            variables: {
              colorPrimary: 'var(--brand-magenta-text)',
              borderRadius: 'var(--radius)',
              fontFamily: 'var(--font-body)',
            },
            elements: {
              userButtonTrigger:
                'account-menu-trigger min-h-11 min-w-11 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navbar-ring',
              avatarBox: 'h-9 w-9',
              userButtonPopoverActionButton: 'min-h-11',
              userButtonPopoverFooter: 'hidden',
            },
          }}
        />
      </div>
    </Show>
  )
}
