import type { Locale } from '@/shared/i18n';

/**
 * Everything the CLI documentation says, in both languages.
 *
 * ## Why this is not in `shared/i18n/locales.ts`
 *
 * Every other translated string in the app is, and this is the one deliberate
 * exception. The dictionary there is a *flat* map shared by ninety components,
 * and its value is that any surface can reach any string: `common.cancel` is one
 * sentence used in thirty places, and keeping it in one table is what stops
 * thirty copies drifting.
 *
 * This is the opposite shape. It is a single document, read by a single page, in
 * which the strings are *ordered* and *grouped* — a command belongs next to its
 * description and inside its section, and flattening that into
 * `docs.cmd.branch.body` throws away the only structure the content has. Adding
 * a hundred keys of prose that nothing else will ever read would also double the
 * length of a file whose whole job is to be scannable.
 *
 * So the document lives with the page that is the document. The two locales sit
 * side by side rather than in separate files, for the reason `locales.ts` gives
 * for the same choice: a missing translation is then a *compile error* rather
 * than a page that silently renders English at somebody who does not read it.
 *
 * ## Why the commands themselves are not translated
 *
 * Because `taskstudio branch` is not English, it is a command. Translating it
 * would document something the tool does not answer to. Only the prose around it
 * changes language.
 */

export interface DocsCommand {
  /** Typed exactly as this, in any language. */
  command: string;
  /** What happens when you run it. */
  body: string;
  /** Flags worth knowing, if any. */
  flags?: { flag: string; body: string }[];
}

export interface DocsSection {
  id: string;
  /** The word in the sidebar and on the heading. */
  title: string;
  /** One line under the heading. Omitted where the commands speak. */
  intro?: string;
  commands?: DocsCommand[];
  /** Free prose, for the sections that are an explanation rather than a list. */
  notes?: { title: string; body: string }[];
}

export interface DocsGroup {
  /** The small caps label above a run of sections in the sidebar. */
  label: string;
  sections: DocsSection[];
}

export interface DocsDocument {
  /** The three cards at the top. */
  start: { step: string; label: string; command: string; body: string }[];
  startTitle: string;
  startBody: string;
  chooseTitle: string;
  groups: DocsGroup[];
}

const en: DocsDocument = {
  startTitle: 'Start with taskstudio',
  startBody: 'Install it, sign the machine in, then point it at a repository.',
  chooseTitle: 'Every command',
  start: [
    {
      step: '01',
      label: 'INSTALL',
      command: 'npm install -g @task-studio/cli',
      body: 'Node 20 or newer. No runtime dependencies.',
    },
    {
      step: '02',
      label: 'SIGN IN',
      command: 'taskstudio login',
      body: 'Opens your browser to approve this machine. No password is typed here.',
    },
    {
      step: '03',
      label: 'CONNECT A REPO',
      command: 'taskstudio init',
      body: 'Links the checkout you are in to a project you already have.',
    },
  ],
  groups: [
    {
      label: 'GETTING STARTED',
      sections: [
        {
          id: 'setup',
          title: 'Setting up a repository',
          intro:
            'Two ways in, depending on whether the project exists yet. Both write .taskstudio/config.json, which is safe to commit — it holds a project id, never a credential.',
          commands: [
            {
              command: 'taskstudio init',
              body: 'Adopts this checkout into a project that already exists. Offers to connect the GitHub remote (owner or admin only) and to write CONTEXT.md.',
            },
            {
              command: 'taskstudio create project',
              body: 'Creates a new project from this repository — reads the README, the file tree and the open issues, then writes a project with starting tasks and pages. Creates no tasks of its own.',
            },
            {
              command: 'taskstudio ide install',
              body: 'Adds /taskstudio commands to Claude Code, Cursor and Copilot. Four small Markdown files in your checkout; nothing is installed into the editor.',
            },
          ],
        },
        {
          id: 'signing-in',
          title: 'Signing in',
          intro:
            'taskstudio login takes no arguments. It prints a short code, opens the approval page, and waits while you confirm it in a browser you are already signed in to.',
          notes: [
            {
              title: 'Why there is no API address to paste',
              body: 'The old instruction was “taskstudio login --api https://…”. The address was never secret — the web app ships it in every bundle — but asking people to retype it taught a habit worth attacking: pasting an API host read off a page into the command that then receives your password. A lookalike domain is the whole exploit. The address is baked into the published CLI instead.',
            },
            {
              title: 'The other two ways in',
              body: '--password runs the old exchange, for a machine with no browser to open. For CI, mint a token in Settings and export TASKSTUDIO_TOKEN. Self-hosting? --api and TASKSTUDIO_API_URL both still work.',
            },
            {
              title: 'What the machine keeps',
              body: 'A personal access token named after the machine, expiring in 90 days by default, listed under Settings and revocable there at any time. taskstudio logout forgets it locally; it does not revoke it.',
            },
          ],
        },
      ],
    },
    {
      label: 'EVERY DAY',
      sections: [
        {
          id: 'daily',
          title: 'The daily loop',
          intro: 'Four commands cover almost everything.',
          commands: [
            {
              command: 'taskstudio status',
              body: 'Where you are: the project, the branch, the task that branch is for, how much is uncommitted, and what to run next.',
            },
            {
              command: 'taskstudio task',
              body: 'Your open tasks on this repository’s project.',
              flags: [
                { flag: '--all', body: 'Your work across every project.' },
                { flag: '"Billing" task', body: 'Your work on a project by name.' },
              ],
            },
            {
              command: 'taskstudio branch',
              body: 'Pick a task that names a branch, create or switch to it, and mark the task in progress.',
            },
            {
              command: 'taskstudio complete',
              body: 'Takes no task name — the branch you are on picks the task. Writes a commit message, shows it, commits after you confirm, then marks the task done. The commit happens on your machine, with your credentials, after you have read it.',
              flags: [
                { flag: '--push', body: 'Push after the committing commit. Off by default.' },
                { flag: '--yes', body: 'Skip the confirmation.' },
              ],
            },
          ],
        },
        {
          id: 'commits',
          title: 'Letting commits close tasks',
          intro:
            'Install the hook once and committing as usual is enough. Task Studio reads the commit against the task on its branch and closes the task if it plainly finishes it.',
          commands: [
            {
              command: 'taskstudio hook install',
              body: 'Writes a post-commit hook into this repository. It runs after the commit exists and git ignores its exit code, so nothing it does can stop you committing.',
            },
            {
              command: 'taskstudio commit-check --dry-run',
              body: 'Says what the hook would make of the commit at HEAD, and changes nothing. Try this before installing.',
            },
            {
              command: 'taskstudio hook uninstall',
              body: 'Removes it. A post-commit hook Task Studio did not write is left alone.',
            },
          ],
          notes: [
            {
              title: 'What it will not do',
              body: 'The task is found by the branch — never by matching your commit message against a list of open titles. It only touches a task you are assigned to, it goes through the same completion rule as everything else (a shared task still needs everybody to tick it off), and it acts only on a confident verdict. Anything else is left open.',
            },
            {
              title: 'What leaves your machine',
              body: 'The commit subject, the body, and the names of the files that changed. No diff, no file contents — the same line every other command here draws.',
            },
          ],
        },
      ],
    },
    {
      label: 'NOW AND THEN',
      sections: [
        {
          id: 'occasional',
          title: 'Occasionally useful',
          commands: [
            {
              command: 'taskstudio create task',
              body: 'Generates one to three tasks from the state of the code.',
            },
            {
              command: 'taskstudio suggestion',
              body: 'One to three detailed steps for a task, grounded in the repository as it stands, written to SUGGESTION.md.',
            },
            {
              command: 'taskstudio context',
              body: 'Rewrites .taskstudio/CONTEXT.md from the repository as it is today. Worth re-running when the project has moved on.',
            },
            {
              command: 'taskstudio open',
              body: 'Opens this project in a browser.',
            },
            {
              command: 'taskstudio projects',
              body: 'Every project you are on.',
            },
          ],
        },
        {
          id: 'trouble',
          title: 'When something is wrong',
          commands: [
            {
              command: 'taskstudio doctor',
              body: 'Checks every link in the chain: git, the credential, the address, the server, the project link and the assistant.',
            },
            {
              command: 'taskstudio whoami',
              body: 'Who and where you are signed in, and whether this deployment has an assistant configured.',
            },
            {
              command: 'taskstudio logout',
              body: 'Forgets the token on this machine. Revoke it in Settings if the machine is leaving you.',
            },
          ],
          notes: [
            {
              title: 'Exit codes',
              body: '0 is done. 1 means you said no, or there was nothing to do — not an error, which matters in a shell. 2 is a real failure.',
            },
            {
              title: 'Environment',
              body: 'TASKSTUDIO_TOKEN and TASKSTUDIO_API_URL both override the saved credentials file, so a container never picks up a stale sign-in from a home directory.',
            },
          ],
        },
      ],
    },
  ],
};

const ptBR: DocsDocument = {
  startTitle: 'Comece com taskstudio',
  startBody: 'Instale, conecte a máquina e aponte para um repositório.',
  chooseTitle: 'Todos os comandos',
  start: [
    {
      step: '01',
      label: 'INSTALAR',
      command: 'npm install -g @task-studio/cli',
      body: 'Node 20 ou mais novo. Sem dependências de runtime.',
    },
    {
      step: '02',
      label: 'ENTRAR',
      command: 'taskstudio login',
      body: 'Abre o navegador para aprovar esta máquina. Nenhuma senha é digitada aqui.',
    },
    {
      step: '03',
      label: 'CONECTAR O REPO',
      command: 'taskstudio init',
      body: 'Liga o repositório em que você está a um projeto que já existe.',
    },
  ],
  groups: [
    {
      label: 'PRIMEIROS PASSOS',
      sections: [
        {
          id: 'setup',
          title: 'Preparando um repositório',
          intro:
            'Dois caminhos, conforme o projeto já exista ou não. Os dois escrevem .taskstudio/config.json, que pode ser commitado sem medo — ele guarda um id de projeto, nunca uma credencial.',
          commands: [
            {
              command: 'taskstudio init',
              body: 'Adota este repositório em um projeto que já existe. Oferece conectar o remote do GitHub (só dono ou admin) e escrever o CONTEXT.md.',
            },
            {
              command: 'taskstudio create project',
              body: 'Cria um projeto novo a partir deste repositório — lê o README, a árvore de arquivos e as issues abertas, e escreve um projeto com tarefas e páginas iniciais.',
            },
            {
              command: 'taskstudio ide install',
              body: 'Adiciona os comandos /taskstudio ao Claude Code, ao Cursor e ao Copilot. São quatro arquivos Markdown no seu repositório; nada é instalado no editor.',
            },
          ],
        },
        {
          id: 'signing-in',
          title: 'Entrando',
          intro:
            'O taskstudio login não recebe argumentos. Ele mostra um código curto, abre a página de aprovação e espera você confirmar em um navegador onde já está logado.',
          notes: [
            {
              title: 'Por que não há endereço de API para colar',
              body: 'A instrução antiga era “taskstudio login --api https://…”. O endereço nunca foi segredo — o app web o entrega em todo bundle — mas pedir para as pessoas redigitarem ensinava um hábito perigoso: colar um host de API lido em alguma página no comando que recebe a sua senha. Um domínio parecido é o ataque inteiro. Agora o endereço vem embutido no CLI publicado.',
            },
            {
              title: 'Os outros dois caminhos',
              body: '--password usa a troca antiga, para uma máquina sem navegador. Para CI, gere um token nas Configurações e exporte TASKSTUDIO_TOKEN. Self-hosting? --api e TASKSTUDIO_API_URL continuam funcionando.',
            },
            {
              title: 'O que fica na máquina',
              body: 'Um token de acesso pessoal com o nome da máquina, válido por 90 dias por padrão, listado nas Configurações e revogável lá a qualquer momento. O taskstudio logout esquece o token localmente; ele não o revoga.',
            },
          ],
        },
      ],
    },
    {
      label: 'NO DIA A DIA',
      sections: [
        {
          id: 'daily',
          title: 'O ciclo do dia',
          intro: 'Quatro comandos cobrem quase tudo.',
          commands: [
            {
              command: 'taskstudio status',
              body: 'Onde você está: o projeto, a branch, a tarefa daquela branch, quanto ainda não foi commitado e o que rodar em seguida.',
            },
            {
              command: 'taskstudio task',
              body: 'Suas tarefas abertas no projeto deste repositório.',
              flags: [
                { flag: '--all', body: 'Seu trabalho em todos os projetos.' },
                { flag: '"Billing" task', body: 'Seu trabalho em um projeto pelo nome.' },
              ],
            },
            {
              command: 'taskstudio branch',
              body: 'Escolhe uma tarefa que indica uma branch, cria ou troca para ela, e marca a tarefa como em andamento.',
            },
            {
              command: 'taskstudio complete',
              body: 'Não recebe nome de tarefa — a branch em que você está escolhe. Escreve a mensagem de commit, mostra, faz o commit depois que você confirma, e só então conclui a tarefa. O commit acontece na sua máquina, com as suas credenciais, depois de você ler.',
              flags: [
                { flag: '--push', body: 'Faz push depois do commit. Desligado por padrão.' },
                { flag: '--yes', body: 'Pula a confirmação.' },
              ],
            },
          ],
        },
        {
          id: 'commits',
          title: 'Deixando os commits concluírem tarefas',
          intro:
            'Instale o hook uma vez e commitar normalmente já basta. O Task Studio lê o commit contra a tarefa da branch e conclui a tarefa se ele claramente a termina.',
          commands: [
            {
              command: 'taskstudio hook install',
              body: 'Escreve um hook post-commit neste repositório. Ele roda depois que o commit já existe e o git ignora o código de saída, então nada que ele faça impede você de commitar.',
            },
            {
              command: 'taskstudio commit-check --dry-run',
              body: 'Diz o que o hook acharia do commit em HEAD, sem mudar nada. Teste antes de instalar.',
            },
            {
              command: 'taskstudio hook uninstall',
              body: 'Remove o hook. Um post-commit que o Task Studio não escreveu fica intacto.',
            },
          ],
          notes: [
            {
              title: 'O que ele não faz',
              body: 'A tarefa é encontrada pela branch — nunca comparando sua mensagem de commit com a lista de títulos abertos. Ele só toca em tarefa atribuída a você, passa pela mesma regra de conclusão de sempre (tarefa compartilhada continua precisando de todo mundo), e só age com um veredito confiante. Qualquer outra coisa fica aberta.',
            },
            {
              title: 'O que sai da sua máquina',
              body: 'O assunto do commit, o corpo e os nomes dos arquivos alterados. Nenhum diff, nenhum conteúdo de arquivo — a mesma linha que todos os outros comandos daqui respeitam.',
            },
          ],
        },
      ],
    },
    {
      label: 'DE VEZ EM QUANDO',
      sections: [
        {
          id: 'occasional',
          title: 'Úteis de vez em quando',
          commands: [
            {
              command: 'taskstudio create task',
              body: 'Gera de uma a três tarefas a partir do estado do código.',
            },
            {
              command: 'taskstudio suggestion',
              body: 'De um a três passos detalhados para uma tarefa, com base no repositório como ele está, escritos em SUGGESTION.md.',
            },
            {
              command: 'taskstudio context',
              body: 'Reescreve o .taskstudio/CONTEXT.md a partir do repositório de hoje. Vale rodar de novo quando o projeto andou.',
            },
            {
              command: 'taskstudio open',
              body: 'Abre este projeto no navegador.',
            },
            {
              command: 'taskstudio projects',
              body: 'Todos os projetos em que você está.',
            },
          ],
        },
        {
          id: 'trouble',
          title: 'Quando algo dá errado',
          commands: [
            {
              command: 'taskstudio doctor',
              body: 'Confere cada elo da corrente: git, credencial, endereço, servidor, vínculo do projeto e assistente.',
            },
            {
              command: 'taskstudio whoami',
              body: 'Quem você é, onde está conectado, e se este deploy tem assistente configurado.',
            },
            {
              command: 'taskstudio logout',
              body: 'Esquece o token nesta máquina. Revogue nas Configurações se a máquina vai sair com você.',
            },
          ],
          notes: [
            {
              title: 'Códigos de saída',
              body: '0 é sucesso. 1 quer dizer que você recusou, ou não havia nada a fazer — não é erro, o que faz diferença em um script. 2 é falha de verdade.',
            },
            {
              title: 'Ambiente',
              body: 'TASKSTUDIO_TOKEN e TASKSTUDIO_API_URL têm precedência sobre o arquivo de credenciais, então um container nunca herda um login velho de um diretório home.',
            },
          ],
        },
      ],
    },
  ],
};

export const DOCS: Record<Locale, DocsDocument> = { en, 'pt-BR': ptBR };
