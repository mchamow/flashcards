import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type Props = Omit<ComponentProps<typeof Button>, 'aria-label'> & { label: string }

/** An icon-only button whose accessible name doubles as its tooltip. */
export function IconButton({ label, variant = 'ghost', size = 'icon', ...props }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant={variant} size={size} aria-label={label} {...props} />} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
