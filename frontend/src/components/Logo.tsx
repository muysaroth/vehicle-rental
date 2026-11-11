import { IoCarSportOutline } from 'react-icons/io5'
import { cx } from './ui'

/** The app mark: a car in a rounded brand tile. */
export function Logo({ size = 'md', className }: { size?: 'md' | 'lg'; className?: string }) {
  return (
    <div
      className={cx(
        'grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-300 to-brand-600 text-white shadow-lg shadow-brand-900/30',
        size === 'lg' ? 'size-14' : 'size-10',
        className,
      )}
    >
      <IoCarSportOutline className={size === 'lg' ? 'size-8' : 'size-6'} />
    </div>
  )
}
