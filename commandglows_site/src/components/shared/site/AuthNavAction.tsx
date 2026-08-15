import { Show, SignOutButton } from '@clerk/astro/react'

interface AuthNavActionProps {
  className: string
  homeUrl: string
  signInLabel: string
  signInUrl: string
  signOutLabel: string
}

export default function AuthNavAction({
  className,
  homeUrl,
  signInLabel,
  signInUrl,
  signOutLabel,
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
      <SignOutButton redirectUrl={homeUrl}>
        <button type="button" className={className}>
          {signOutLabel}
        </button>
      </SignOutButton>
    </Show>
  )
}
