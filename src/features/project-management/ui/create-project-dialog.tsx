import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useCreateProject } from '@/entities/project/model/queries';
import { TASK_COLORS } from '@/shared/config/constants';
import { Button, ColorPicker, Input, Modal, Textarea } from '@/shared/ui';

interface CreateProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateProjectDialog = ({ isOpen, onClose }: CreateProjectDialogProps) => {
  const navigate = useNavigate();
  const createProject = useCreateProject();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(TASK_COLORS[0]);

  const reset = () => {
    setName('');
    setDescription('');
    setColor(TASK_COLORS[0]);
  };

  const handleSubmit = async () => {
    if (name.trim().length < 2) return;

    const project = await createProject.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
    });

    reset();
    onClose();
    navigate(`/projects/${project.id}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New project"
      description="You become the owner and can invite your roster right after."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            isLoading={createProject.isPending}
            disabled={name.trim().length < 2}
          >
            Create project
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <Input
          label="Name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Product launch"
          autoFocus
          maxLength={80}
        />

        <Textarea
          label="Description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What is this project about?"
          maxLength={500}
        />

        <ColorPicker label="Accent colour" value={color} onChange={setColor} options={TASK_COLORS} />
      </form>
    </Modal>
  );
};
