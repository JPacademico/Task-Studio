import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Github,
  Search,
  Sparkles,
  Star,
  UserCheck,
} from 'lucide-react';

import {
  useImportRepository,
  usePreviewRepository,
} from '@/entities/integration/model/queries';
import type { RepositoryPreview } from '@/entities/integration/model/types';
import { cn } from '@/shared/lib/cn';
import { Avatar, Button, Input, Switch } from '@/shared/ui';
import { useT } from '@/shared/i18n';

interface GithubImportPanelProps {
  /** File the imported project under this company, when one was chosen. */
  organizationId?: string;
  /** The accent the dialog's picker is on — overrides the assistant's choice. */
  color?: string;
  /** Handed the new project's id once the import lands. */
  onImported: (projectId: string) => void;
}

/**
 * Making a project out of a repository somebody already has.
 *
 * ## Why this is two steps and not one
 *
 * Because an import is not a small thing. It creates a project, up to three
 * tasks, up to five pages, and it sends invitations to real people — from one
 * pasted URL, and every one of those is somebody else's inbox. "Look it up,
 * then decide" costs one extra click and turns all of that from a surprise
 * into a choice: the preview names the repository that was actually found
 * (GitHub follows renames, so it is not always the one in the URL), lists the
 * files that would become pages, and shows exactly which contributors would be
 * invited and which would not.
 *
 * The lookup is also free of the assistant — six GitHub reads, no model, no
 * quota — which is what makes it reasonable to run it every time somebody
 * corrects a typo.
 *
 * ## Why the contributor list says who will *not* be invited
 *
 * A contributor with no matched account is shown greyed rather than hidden.
 * Hiding them would make the list look like the repository's whole team, and
 * the honest answer to "why wasn't Ana invited" is "she has not signed in here
 * with GitHub" — which is only visible if Ana is on the list at all.
 */
export const GithubImportPanel = ({
  organizationId,
  color,
  onImported,
}: GithubImportPanelProps) => {
  const t = useT();
  const [url, setUrl] = useState('');
  const [useAssistant, setUseAssistant] = useState(true);

  const preview = usePreviewRepository();
  const runImport = useImportRepository();

  const repo: RepositoryPreview | undefined = preview.data;
  const invitable = repo?.contributors.filter((person) => person.matchedUser) ?? [];

  const look = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    preview.mutate(trimmed);
  };

  const create = async () => {
    if (!repo) return;

    const result = await runImport.mutateAsync({
      // The canonical address rather than what was typed: GitHub follows
      // renames, and the project should come from where the repository is.
      url: `${repo.owner}/${repo.repo}`,
      organizationId,
      color,
      useAssistant,
    });

    onImported(result.project.id);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <Input
          label={t('github.repository')}
          name="repository"
          value={url}
          onChange={(event) => setUrl(event.target.value.slice(0, 300))}
          placeholder="github.com/owner/name"
          className="flex-1"
          // Enter looks it up rather than submitting the dialog behind it,
          // which would create an empty project named whatever was in the name
          // field.
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            look();
          }}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={look}
          isLoading={preview.isPending}
          disabled={url.trim().length === 0}
        >
          <Search className="h-3.5 w-3.5" />
          {t('github.look')}
        </Button>
      </div>

      {!repo && !preview.isPending && (
        <p className="text-[11px] leading-relaxed text-content-faint">{t('github.hint')}</p>
      )}

      {repo && (
        <div className="space-y-3 rounded-xl border border-edge bg-surface-sunken/50 p-3">
          {/* --- What was found ------------------------------------------- */}
          <div className="flex items-start gap-2.5">
            <span
              aria-hidden
              className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/12 text-brand"
            >
              <Github className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-xs font-semibold">{repo.fullName}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] text-content-muted">
                {repo.description ?? t('github.noDescription')}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-content-faint">
                {repo.language && <span>{repo.language}</span>}
                <span className="inline-flex items-center gap-0.5">
                  <Star className="h-2.5 w-2.5" />
                  {repo.stars}
                </span>
                <span>{t('github.openIssues', { count: String(repo.openIssues) })}</span>
              </p>
            </div>
          </div>

          {/* An archived repository still imports — it is just worth knowing
              before the project it becomes looks abandoned a week later. */}
          {repo.isArchived && (
            <p className="flex items-start gap-1.5 text-[11px] leading-snug text-warning">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              {t('github.archivedWarning')}
            </p>
          )}

          {/* --- What would come across ----------------------------------- */}
          <div className="space-y-1.5 border-t border-edge/70 pt-2.5">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-content-faint">
              <FileText className="h-3 w-3" />
              {t('github.pagesTitle')}
            </p>
            <p className="text-[11px] leading-relaxed text-content-muted">
              {repo.documents.length > 0
                ? repo.documents.join(' · ')
                : t('github.noPages')}
            </p>
          </div>

          {/* --- Who would be asked to join ------------------------------- */}
          {repo.contributors.length > 0 && (
            <div className="space-y-1.5 border-t border-edge/70 pt-2.5">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-content-faint">
                <UserCheck className="h-3 w-3" />
                {t('github.contributorsTitle', { count: String(invitable.length) })}
              </p>

              <ul className="flex flex-wrap gap-1.5">
                {repo.contributors.slice(0, 10).map((person) => (
                  <li
                    key={person.login}
                    title={
                      person.matchedUser
                        ? t('github.willInvite', { name: person.matchedUser.displayName })
                        : t('github.noAccount', { login: person.login })
                    }
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-1.5 py-0.5 text-[10px]',
                      person.matchedUser
                        ? 'border-brand/40 bg-brand/[0.07] text-content'
                        : 'border-edge text-content-faint',
                    )}
                  >
                    <Avatar
                      name={person.matchedUser?.displayName ?? person.login}
                      src={person.matchedUser?.avatarUrl ?? person.avatarUrl}
                      size="xs"
                    />
                    <span className="max-w-[7rem] truncate">
                      {person.matchedUser?.displayName ?? person.login}
                    </span>
                    {person.matchedUser && (
                      <CheckCircle2 className="h-2.5 w-2.5 shrink-0 text-positive" />
                    )}
                  </li>
                ))}
              </ul>

              <p className="text-[10px] leading-relaxed text-content-faint">
                {t('github.contributorsHint')}
              </p>
            </div>
          )}

          {/* --- The one choice worth offering ---------------------------- */}
          {repo.canUseAssistant && (
            <div className="border-t border-edge/70 pt-2.5">
              <Switch
                checked={useAssistant}
                onChange={setUseAssistant}
                label={t('github.useAssistant')}
              />
              <p className="mt-1 text-[10px] leading-relaxed text-content-faint">
                {t(useAssistant ? 'github.useAssistantOn' : 'github.useAssistantOff')}
              </p>
            </div>
          )}

          <Button
            type="button"
            className="w-full"
            onClick={() => void create()}
            isLoading={runImport.isPending}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t(runImport.isPending ? 'github.importing' : 'github.import')}
          </Button>

          {runImport.isPending && (
            <p className="text-center text-[10px] leading-relaxed text-content-faint">
              {t('github.importingHint')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
