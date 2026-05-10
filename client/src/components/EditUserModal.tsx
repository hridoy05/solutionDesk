import { useEffect } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Role } from '../lib/constants';

type User = { id: string; name: string; email: string; role: Role };

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.email('Enter a valid email address'),
  role: z.enum([Role.admin, Role.agent]),
});

type FormData = z.infer<typeof schema>;

type Props = {
  user: User | null;
  onClose: () => void;
};

export default function EditUserModal({ user, onClose }: Props) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (user) reset({ name: user.name, email: user.email, role: user.role });
  }, [user, reset]);

  const { mutateAsync } = useMutation({
    mutationFn: (data: FormData) =>
      axios.patch(`/api/users/${user!.id}`, data, { withCredentials: true }).then((res) => res.data),
  });

  async function onSubmit(data: FormData) {
    try {
      await mutateAsync(data);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.error ?? 'Failed to update user')
        : 'Failed to update user';
      setError('root', { message });
    }
  }

  return (
    <Dialog.Root open={user !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Popup className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background border border-border rounded-xl shadow-lg p-6">
          <Dialog.Title className="text-lg font-semibold mb-4">Edit User</Dialog.Title>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" {...register('name')} aria-invalid={!!errors.name} />
              {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" type="email" {...register('email')} aria-invalid={!!errors.email} />
              {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-role">Role</Label>
              <select
                id="edit-role"
                {...register('role')}
                className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value={Role.agent}>Agent</option>
                <option value={Role.admin}>Admin</option>
              </select>
            </div>

            {errors.root && <p className="text-destructive text-sm">{errors.root.message}</p>}

            <div className="flex justify-end gap-2 mt-2">
              <Dialog.Close render={<Button type="button" variant="outline">Cancel</Button>} />
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
