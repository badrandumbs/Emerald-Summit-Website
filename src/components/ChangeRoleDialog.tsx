// Change role without leaving the page: pick the new role here, then the same
// preview-and-confirm step the app uses (ChangeRolePanel). Signed-in people
// switch roles in place; the full "How are you joining" page is for signing in.
import { useEffect, useState } from 'react';
import { Check } from '@/components/icons';
import { useAuth } from '../context/AuthContext';
import { CHOOSER_ROLES, roleByName, roleLabelFor } from '../models/roles';
import ChangeRolePanel from './ChangeRolePanel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function ChangeRoleDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { profile } = useAuth();
  const currentRole = (profile?.role as string | undefined) ?? null;
  const [picked, setPicked] = useState<string | null>(null);

  // Start from the list each time it opens.
  useEffect(() => {
    if (open) setPicked(null);
  }, [open]);

  const pickedRole = picked ? roleByName(picked) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Change your role</DialogTitle>
          <DialogDescription>
            You're a {roleLabelFor(currentRole ?? undefined, profile?.volunteer_subtype)}. Pick the
            role you want instead. You'll see what changes before anything is switched.
          </DialogDescription>
        </DialogHeader>

        {pickedRole ? (
          <ChangeRolePanel
            key={pickedRole.name}
            role={pickedRole}
            autoPreview
            onCancel={() => setPicked(null)}
            onDone={() => onOpenChange(false)}
          />
        ) : (
          <div className="space-y-2">
            {CHOOSER_ROLES.map(({ name, title, description }) => {
              const role = roleByName(name);
              if (!role) return null;
              const isCurrent = name === currentRole;
              return (
                <button
                  key={name}
                  type="button"
                  disabled={isCurrent}
                  onClick={() => setPicked(name)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                    isCurrent
                      ? 'cursor-default border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-[var(--role)] hover:bg-secondary',
                  )}
                  style={{ ['--role' as string]: role.color }}
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ background: role.color }}
                  >
                    <role.icon className="h-5 w-5" strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{title}</span>
                    <span className="block text-[13px] leading-snug text-muted-foreground">
                      {description}
                    </span>
                  </span>
                  {isCurrent && (
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
                      <Check className="h-3.5 w-3.5" /> Current
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
