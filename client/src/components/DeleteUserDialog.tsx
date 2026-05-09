import { Dialog } from '@base-ui/react/dialog';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import axios from 'axios';
import { Button } from './ui/button';

type User = { id: string; name: string };

type Props = {
  user: User | null;
  onClose: () => void;
};

export default function DeleteUserDialog({ user, onClose }: Props) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      axios.delete(`/api/users/${user!.id}`, { withCredentials: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (err: unknown) => {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.error ?? 'Failed to delete user')
        : 'Failed to delete user';
      setError(message);
    },
  });

  function handleOpenChange(open: boolean) {
    if (!open) {
      setError(null);
      onClose();
    }
  }

  return (
    <Dialog.Root open={user !== null} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Popup className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-background border border-border rounded-xl shadow-lg p-6">
          <Dialog.Title className="text-lg font-semibold mb-2">Delete User</Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground mb-4">
            Delete <span className="font-medium text-foreground">{user?.name}</span>? This action
            cannot be undone.
          </Dialog.Description>

          {error && <p className="text-destructive text-sm mb-4">{error}</p>}

          <div className="flex justify-end gap-2">
            <Dialog.Close render={<Button type="button" variant="outline">Cancel</Button>} />
            <Button variant="destructive" disabled={isPending} onClick={() => mutate()}>
              {isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
