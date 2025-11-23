import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'

interface HelloDisplayModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HelloDisplayModal({ open, onOpenChange }: HelloDisplayModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Hello</DialogTitle>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Dismiss</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
