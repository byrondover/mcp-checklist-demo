import { useState } from 'react'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'

export function DisplayHelloButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Display Hello</Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hello</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            Hello
          </div>
          <DialogFooter>
            <Button onClick={() => setIsOpen(false)}>Dismiss</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
