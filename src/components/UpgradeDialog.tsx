import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FREE_MONTHLY_NOTES } from "@/lib/plan";

export function UpgradeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl font-normal">Keep the ideas flowing</DialogTitle>
          <DialogDescription>
            You've used your {FREE_MONTHLY_NOTES} free notes this month. Echo Unlimited gives you unlimited
            transcription and search for $8/month.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-2xl bg-primary-soft p-4 text-sm text-accent-foreground">
          Subscriptions are launching soon. Your free notes refresh on the 1st of each month.
        </div>
        <Button className="rounded-full" onClick={() => onOpenChange(false)}>
          Got it
        </Button>
      </DialogContent>
    </Dialog>
  );
}
