import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { HiOutlineTrash } from 'react-icons/hi2'
import { I18nProvider } from '@/lib/i18n'
import { isoDate, addDays } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { ChangePassword } from './ChangePassword'
import { BookingStatusBadge, DetailList, ErrorNote, IconButton, Modal, RowActions, Tabs } from './ui'

function renderEn(ui: ReactElement) {
  localStorage.setItem('rental.lang', 'en')
  return render(<I18nProvider>{ui}</I18nProvider>)
}

afterEach(() => localStorage.clear())

describe('BookingStatusBadge', () => {
  it('shows an active rental past its end date as overdue', () => {
    renderEn(<BookingStatusBadge status="active" endDate={addDays(isoDate(), -1)} />)
    expect(screen.getByText('Overdue')).toBeTruthy()
  })

  it('shows an active rental due today as on rent', () => {
    renderEn(<BookingStatusBadge status="active" endDate={isoDate()} />)
    expect(screen.getByText('On rent')).toBeTruthy()
  })

  it('never marks a returned rental overdue', () => {
    renderEn(<BookingStatusBadge status="returned" endDate={addDays(isoDate(), -10)} />)
    expect(screen.getByText('Returned')).toBeTruthy()
  })

  it('speaks Khmer by default', () => {
    render(
      <I18nProvider>
        <BookingStatusBadge status="reserved" />
      </I18nProvider>,
    )
    expect(screen.getByText('បានកក់')).toBeTruthy()
  })
})

describe('IconButton and RowActions', () => {
  it('uses its label as the accessible name and tooltip', () => {
    const onClick = vi.fn()
    renderEn(<IconButton label="Delete" icon={HiOutlineTrash} onClick={onClick} />)
    const button = screen.getByRole('button', { name: 'Delete' })
    expect(button.getAttribute('title')).toBe('Delete')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('stops a row action from also opening the row', () => {
    const openRow = vi.fn()
    const remove = vi.fn()
    renderEn(
      <table>
        <tbody>
          <tr onClick={openRow}>
            <td>
              <RowActions>
                <IconButton label="Delete" icon={HiOutlineTrash} onClick={remove} />
              </RowActions>
            </td>
          </tr>
        </tbody>
      </table>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(remove).toHaveBeenCalledOnce()
    expect(openRow).not.toHaveBeenCalled()
  })
})

describe('Tabs', () => {
  it('marks the selected tab and reports clicks', () => {
    const onChange = vi.fn()
    renderEn(
      <Tabs
        value="b"
        onChange={onChange}
        options={[
          { value: 'a', label: 'All' },
          { value: 'b', label: 'Active' },
        ]}
      />,
    )
    expect(screen.getByRole('tab', { name: 'Active' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tab', { name: 'All' }).getAttribute('aria-selected')).toBe('false')
    fireEvent.click(screen.getByRole('tab', { name: 'All' }))
    expect(onChange).toHaveBeenCalledWith('a')
  })
})

describe('Modal', () => {
  it('closes on Escape and on the close button, not on clicks inside', () => {
    const onClose = vi.fn()
    renderEn(
      <Modal open onClose={onClose} title="Edit">
        <p>Body</p>
      </Modal>,
    )
    fireEvent.mouseDown(screen.getByText('Body'))
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('locks page scrolling while open and restores it after', () => {
    const { unmount } = renderEn(
      <Modal open onClose={() => {}} title="Edit">
        x
      </Modal>,
    )
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('renders nothing when closed', () => {
    renderEn(
      <Modal open={false} onClose={() => {}} title="Hidden">
        x
      </Modal>,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('ErrorNote', () => {
  it('shows the first validation message from the server', () => {
    renderEn(<ErrorNote error={new ApiError(422, 'Invalid', { email: ['The email has already been taken.'] })} />)
    expect(screen.getByRole('alert').textContent).toContain('The email has already been taken.')
  })

  it('shows nothing without an error', () => {
    renderEn(<ErrorNote error={null} />)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('DetailList', () => {
  it('skips rows that are switched off', () => {
    renderEn(<DetailList rows={[['Total', '$10.00', 'strong'], false, null, ['Paid', '$5.00']]} />)
    expect(screen.getAllByRole('term').map((el) => el.textContent)).toEqual(['Total', 'Paid'])
  })
})

describe('ChangePassword', () => {
  // Anchored at the start: "New password" must not also match "Confirm new password".
  const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(new RegExp(`^${label}`)), { target: { value } })

  it('only allows saving with the current password and two matching new ones of 8+ characters', () => {
    renderEn(<ChangePassword onClose={() => {}} />)
    const save = () => screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement

    expect(save().disabled).toBe(true)

    fill('Current password', 'old-pass')
    fill('New password', 'short')
    fill('Confirm new password', 'short')
    expect(save().disabled).toBe(true)

    fill('New password', 'long-enough')
    fill('Confirm new password', 'long-enougX')
    expect(save().disabled).toBe(true)
    expect(screen.getByText('The new passwords do not match')).toBeTruthy()

    fill('Confirm new password', 'long-enough')
    expect(save().disabled).toBe(false)
    expect(screen.queryByText('The new passwords do not match')).toBeNull()
  })
})
