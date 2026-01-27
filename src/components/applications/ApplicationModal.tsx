import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationsAPI } from '@/lib/api-client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  application?: any;
}

const ApplicationModal = ({ isOpen, onClose, application }: ApplicationModalProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { register, handleSubmit, reset, setValue, watch } = useForm();

  useEffect(() => {
    if (application) {
      reset(application);
    } else {
      reset({
        company: '',
        role: '',
        status: 'saved',
        location: '',
        job_url: '',
        date_applied: new Date().toISOString().split('T')[0],
        next_interview_date: '',
        notes: '',
      });
    }
  }, [application, reset]);

  const createMutation = useMutation({
    mutationFn: (data: any) => applicationsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      toast({
        title: 'Success',
        description: 'Application created successfully',
      });
      onClose();
      reset();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create application',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => applicationsAPI.update(application.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      toast({
        title: 'Success',
        description: 'Application updated successfully',
      });
      onClose();
      reset();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update application',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: any) => {
    if (application) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {application ? 'Edit Application' : 'Add New Application'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Company *</label>
              <Input {...register('company', { required: true })} />
            </div>
            <div>
              <label className="text-sm font-medium">Role *</label>
              <Input {...register('role', { required: true })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Status *</label>
              <Select
                value={watch('status') || 'saved'}
                onValueChange={(value) => setValue('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="saved">Saved</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="oa">Online Assessment</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="offer">Offer</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Location</label>
              <Input {...register('location')} placeholder="City, State" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Job URL</label>
            <Input {...register('job_url')} type="url" placeholder="https://" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Date Applied</label>
              <Input {...register('date_applied')} type="date" />
            </div>
            <div>
              <label className="text-sm font-medium">Next Interview Date</label>
              <Input {...register('next_interview_date')} type="date" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Notes</label>
            <Textarea {...register('notes')} placeholder="Any additional notes..." />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : application
                ? 'Update'
                : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ApplicationModal;