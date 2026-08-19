import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useCreateProject } from '@/entities/project/model/queries';
import { TASK_COLORS } from '@/shared/config/constants';
import { Button, ColorPicker, Input, Modal, Textarea } from '@/shared/ui';
import { useT } from '@/shared/i18n';

interface CreateProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateProjectDialog = ({ isOpen, onClose }: CreateProjectDialogProps) => {
  const t = useT();
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
      title={t('project.newTitle')}
      description={t('project.newSubtitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            isLoading={createProject.isPending}
            disabled={name.trim().length < 2}
          >
            {t('project.create')}
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
          label={t('project.name')}
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('project.namePlaceholder')}
          autoFocus
          maxLength={80}
        />

        <Textarea
          label={t('project.description')}
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t('project.descriptionPlaceholder')}
          maxLength={500}
        />

        <ColorPicker label={t('project.accentColour')} value={color} onChange={setColor} options={TASK_COLORS} />
      </form>
    </Modal>
  );
};
