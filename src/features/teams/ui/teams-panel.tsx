import { useEffect, useState } from 'react';
import { Check, Pencil, Plus, Trash2, Users } from 'lucide-react';

import {
  useCreateTeam,
  useDeleteTeam,
  useTeams,
  useUpdateTeam,
} from '@/entities/team/model/queries';
import type { Team, TeamScope } from '@/entities/team/model/types';
import type { UserSummary } from '@/entities/user/model/types';
import { TASK_COLORS, TEXT_LIMITS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { clampText } from '@/shared/lib/text';
import { withAlpha } from '@/shared/lib/colors';
import {
  Avatar,
  AvatarStack,
  Button,
  ColorPicker,
  EmptyState,
  Input,
  Modal,
  Skeleton,
  Textarea,
} from '@/shared/ui';
import { useT, type Translate } from '@/shared/i18n';

interface TeamComposerProps {
  isOpen: boolean;
  onClose: () => void;
  scope: TeamScope;
  /** Everybody eligible: the company's staff, or the project's roster. */
  roster: UserSummary[];
  /** Present when editing; absent when creating. */
  team?: Team | null;
}

/**
 * Making a team, or changing one.
 *
 * The member picker is chips rather than a dropdown for the same reason the
 * meeting composer's is: the answer is nearly always several people, and a
 * dropdown turns "several" into several separate acts. Everybody offered is
 * already on the roster this team draws from — the API refuses anybody who is
 * not, so a picker that offered outsiders would be offering a failure.
 */
const TeamComposer = ({ isOpen, onClose, scope, roster, team }: TeamComposerProps) => {
  const t = useT();
  const createTeam = useCreateTeam(scope);
  const updateTeam = useUpdateTeam(scope);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(TASK_COLORS[0]);
  const [memberIds, setMemberIds] = useState<string[]>([]);

  // Re-seeded on every open: the dialog is mounted by the panel, so its state
  // would otherwise be whatever was last typed into it.
  useEffect(() => {
    if (!isOpen) return;

    setName(team?.name ?? '');
    setDescription(team?.description ?? '');
    setColor(team?.color ?? TASK_COLORS[0]);
    setMemberIds(team?.members.map((member) => member.id) ?? []);
  }, [isOpen, team]);

  const canSubmit = name.trim().length >= 2;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const payload = {
      name: name.trim(),
      // The empty string is how a description is cleared; `undefined` would
      // read as "leave it alone" and it could never be emptied.
      description: description.trim(),
      color,
      memberIds,
    };

    if (team) {
      await updateTeam.mutateAsync({ teamId: team.id, payload });
    } else {
      await createTeam.mutateAsync({ ...payload, description: payload.description || undefined });
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t(team ? 'team.editTitle' : 'team.newTitle')}
      description={t('team.composerSubtitle')}
      flat
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            isLoading={createTeam.isPending || updateTeam.isPending}
            disabled={!canSubmit}
          >
            {t(team ? 'project.saveChanges' : 'team.create')}
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
          label={t('team.name')}
          name="name"
          value={name}
          onChange={(event) => setName(clampText(event.target.value, TEXT_LIMITS.teamName))}
          placeholder={t('team.namePlaceholder')}
          maxLength={TEXT_LIMITS.teamName}
          autoFocus
        />

        <Textarea
          label={t('project.description')}
          name="description"
          value={description}
          onChange={(event) =>
            setDescription(clampText(event.target.value, TEXT_LIMITS.teamDescription))
          }
          placeholder={t('team.descriptionPlaceholder')}
          maxLength={TEXT_LIMITS.teamDescription}
        />

        <ColorPicker
          label={t('project.accentColour')}
          value={color}
          onChange={setColor}
          options={TASK_COLORS}
        />

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-content-muted">
            {t('team.members')}{' '}
            <span className="text-content-faint">
              ({memberIds.length}/{roster.length})
            </span>
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {roster.map((person) => {
              const isSelected = memberIds.includes(person.id);

              return (
                <button
                  key={person.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() =>
                    setMemberIds((current) =>
                      isSelected
                        ? current.filter((id) => id !== person.id)
                        : [...current, person.id],
                    )
                  }
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border py-1 pl-2 pr-2.5 text-xs transition-all duration-150',
                    isSelected
                      ? 'border-brand bg-brand/12 text-brand'
                      : 'border-edge text-content-muted hover:border-content-faint',
                  )}
                >
                  <Avatar name={person.displayName} src={person.avatarUrl} size="xs" />
                  <span className="max-w-[8rem] truncate">{person.displayName}</span>
                  {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                </button>
              );
            })}
          </div>

          {roster.length === 0 && (
            <p className="rounded-xl border border-dashed border-edge px-3 py-3 text-[11px] text-content-faint">
              {t(scope.organizationId ? 'team.noStaffYet' : 'team.noRosterYet')}
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
};

interface TeamRowProps {
  team: Team;
  canManage: boolean;
  onEdit: (team: Team) => void;
  onDelete: (teamId: string) => void;
  t: Translate;
}

const TeamRow = ({ team, canManage, onEdit, onDelete, t }: TeamRowProps) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  return (
    <li
      className="ui-card flex flex-wrap items-center gap-3 rounded-2xl border border-edge bg-surface-raised p-3"
      style={{
        background: `linear-gradient(120deg, ${withAlpha(team.color, 0.09)}, transparent 58%)`,
      }}
    >
      <span
        aria-hidden
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
        style={{ backgroundColor: withAlpha(team.color, 0.16), color: team.color }}
      >
        <Users className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-semibold tracking-tight">{team.name}</p>
        <p className="truncate text-[11px] text-content-faint">
          {team.description || t('team.headcount', { count: team.memberCount })}
        </p>
      </div>

      <AvatarStack people={team.members} max={5} />

      {canManage && (
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            size="icon"
            variant="ghost"
            aria-label={t('team.edit')}
            title={t('team.edit')}
            onClick={() => onEdit(team)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>

          {/* Two-step rather than a dialog, matching the meetings board: the
              group is not recoverable anywhere in this UI, and one stray click
              on a toolbar is exactly how it would go. Nobody loses access —
              a team is a shortcut for naming people, not a grant. */}
          <Button
            size={isConfirmingDelete ? 'sm' : 'icon'}
            variant={isConfirmingDelete ? 'danger' : 'ghost'}
            aria-label={t('team.delete')}
            title={t('team.deleteHint')}
            onClick={() =>
              isConfirmingDelete ? onDelete(team.id) : setIsConfirmingDelete(true)
            }
            onBlur={() => setIsConfirmingDelete(false)}
            className={cn(!isConfirmingDelete && 'hover:text-danger')}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isConfirmingDelete && t('meetings.confirm')}
          </Button>
        </div>
      )}
    </li>
  );
};

interface TeamsPanelProps {
  /** Exactly one of the two ids — see `TeamScope`. */
  scope: TeamScope;
  /** Everybody eligible: the company's staff, or the project's roster. */
  roster: UserSummary[];
  /** Owner or admin: only they may create, edit or delete a team. */
  canManage: boolean;
}

/**
 * Teams, at whichever altitude the caller is standing.
 *
 * One panel for both because the two are the same screen with a different
 * roster behind them — a company's teams are drawn from its staff and used when
 * starting projects and booking meetings; a project's are drawn from its roster
 * and used when assigning tasks. The only thing that differs is which list the
 * picker offers and which sentence the hint says, and both come from `scope`.
 *
 * What a team is *for* is worth being explicit about on the surface itself,
 * because the obvious reading is wrong: it does not own anything and it grants
 * nothing. Picking one somewhere else copies its people into that place, once,
 * at that moment. The panel says so under the heading rather than leaving it to
 * be discovered.
 */
export const TeamsPanel = ({ scope, roster, canManage }: TeamsPanelProps) => {
  const t = useT();

  const { data: teams = [], isPending } = useTeams(scope);
  const deleteTeam = useDeleteTeam(scope);

  const [editing, setEditing] = useState<Team | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const openComposer = (team: Team | null) => {
    setEditing(team);
    setIsComposerOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="min-w-0 text-sm font-semibold tracking-tight">{t('team.title')}</h2>

        {canManage && (
          <Button size="sm" onClick={() => openComposer(null)}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2.8} />
            {t('team.new')}
          </Button>
        )}
      </div>

      {isPending && (
        <ul className="space-y-2">
          {Array.from({ length: 3 }, (_, index) => (
            <li key={index}>
              <Skeleton className="h-[68px] rounded-2xl" />
            </li>
          ))}
        </ul>
      )}

      {!isPending && teams.length === 0 && (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title={t('team.none')}
          description={t(canManage ? 'team.noneBodyAdmin' : 'team.noneBody')}
          action={
            canManage ? (
              <Button size="sm" variant="secondary" onClick={() => openComposer(null)}>
                <Plus className="h-3.5 w-3.5" strokeWidth={2.8} />
                {t('team.new')}
              </Button>
            ) : undefined
          }
        />
      )}

      {teams.length > 0 && (
        <ul className="space-y-2">
          {teams.map((team) => (
            <TeamRow
              key={team.id}
              team={team}
              canManage={canManage}
              onEdit={openComposer}
              onDelete={(teamId) => deleteTeam.mutate(teamId)}
              t={t}
            />
          ))}
        </ul>
      )}

      {canManage && (
        <TeamComposer
          isOpen={isComposerOpen}
          onClose={() => {
            setIsComposerOpen(false);
            setEditing(null);
          }}
          scope={scope}
          roster={roster}
          team={editing}
        />
      )}
    </div>
  );
};

/*
 * `TeamPicker` used to live here.
 *
 * It was a standalone chip row that every composer stacked above its own list
 * of faces — two controls asking the same question ("who is in on this?") at
 * two granularities, and neither of them answering it well. It is now one tab
 * of `InvitePicker`, which is also where the paging that a company roster
 * needs lives. Nothing was lost: picking a team still expands to its people at
 * the moment it is picked, which is the whole contract — see `Team`.
 */
