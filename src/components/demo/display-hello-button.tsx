import { useState } from 'react'
import { Button } from '../ui/button'
import { HelloDisplayModal } from './hello-display-modal'

export function DisplayHelloButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Display Hello</Button>
      <HelloDisplayModal open={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}
