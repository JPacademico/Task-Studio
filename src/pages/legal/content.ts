import type { Locale } from '@/shared/i18n/locales';

/**
 * The Terms of Service and Privacy Policy, in both languages. Bump `LEGAL_UPDATED` together with
 * `TERMS_VERSION` in the API (`modules/auth/terms.ts`) whenever either changes materially.
 */
export const LEGAL_UPDATED = '2026-10-01';

/** Where privacy requests and legal notices go. The controller is named in each document's intro. */
export const LEGAL_CONTACT = 'ximbas666@gmail.com';

export type LegalKind = 'terms' | 'privacy';

export interface LegalSection {
  heading: string;
  /** Paragraphs; `{email}`, `{terms}` and `{privacy}` become links. */
  body: string[];
  list?: string[];
}

export interface LegalDocument {
  title: string;
  intro: string;
  sections: LegalSection[];
}

const PRIVACY_EN: LegalDocument = {
  title: 'Privacy Policy',
  intro:
    'This policy explains what personal data Task Studio (task-studio.online) collects, why, who it is shared with and the rights you have over it. Task Studio is run by João Pedro Brandão Almeida, an individual based in Brazil, who is the controller of this data under Brazil’s General Data Protection Law (LGPD, Law 13.709/2018) and, where it applies, the EU GDPR. Contact: {email}.',
  sections: [
    {
      heading: '1. What we collect',
      body: [],
      list: [
        'Account: your name, email address, password (stored only as a one-way bcrypt hash), and an optional avatar and bio.',
        'Sign-in with Google or GitHub: your name, email address, profile picture and provider account ID. We never receive your password for those services.',
        'Your content: projects, tasks, notes, documents, whiteboards, chat messages, meetings, and the files and images you upload, plus the activity history of who changed what.',
        'Live rooms: audio, video and screen sharing travel directly between participants (WebRTC), relayed through our own server only when a direct connection is impossible. We do not record calls.',
        'Connected services, only if you connect them: Google Calendar, GitHub, Figma, Spotify, Trello, Jira and chat webhooks. Access tokens are stored encrypted and used only for the feature you turned on.',
        'Payments: processed by Stripe. We keep your plan, your Stripe customer and subscription IDs and the billing status. We never see or store full card numbers.',
        'Technical and security data: IP address and browser/device information for signed-in sessions, server logs, and error reports from the app (error message, technical trace, page and account ID).',
      ],
    },
    {
      heading: '2. Why we use it, and on what legal basis',
      body: [],
      list: [
        'To provide the service you signed up for — your account, your content, collaboration, emails such as address confirmation, password reset and invitations (performance of a contract, LGPD art. 7, V).',
        'To keep the service secure, prevent fraud and abuse, and fix errors (legitimate interest, art. 7, IX).',
        'To bill paid plans and meet tax and accounting duties (legal obligation, art. 7, II).',
        'To run the integrations you choose to connect (your consent, which you withdraw by disconnecting them).',
      ],
    },
    {
      heading: '3. What we do not do',
      body: [
        'We do not sell personal data, show advertising, or use analytics or advertising trackers.',
      ],
    },
    {
      heading: '4. AI features',
      body: [
        'When you use an AI feature, the content you submit is sent to Google’s Gemini API to produce the result. Google processes it under its own terms and, depending on the service tier, may retain it and use it to improve its products. Do not submit sensitive personal data to AI features.',
      ],
    },
    {
      heading: '5. Who we share it with',
      body: [
        'Only with providers that run the service on our behalf, each limited to what its job needs:',
      ],
      list: [
        'Hosting: our cloud server (application and database) and Vercel (website).',
        'Cloudflare: file and image storage (R2) and, when enabled, bot protection (Turnstile).',
        'Resend: account and notification emails.',
        'Stripe: payments.',
        'Google: AI features (Gemini), and sign-in and Calendar if you use them. GitHub: sign-in and repositories if you use them.',
        'The services you connect yourself, and the people in the projects and organizations you join, who see the content you share there.',
      ],
    },
    {
      heading: '6. International transfers',
      body: [
        'Some of these providers process data outside Brazil, mainly in the United States. Transfers rely on the safeguards LGPD art. 33 allows, such as contractual commitments from those providers.',
      ],
    },
    {
      heading: '7. Google user data',
      body: [
        'Task Studio’s use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements. Calendar access is limited to the calendar the app creates for your meetings and your email address. Google user data is never used for advertising, never sold, and is not read by people except with your consent, for security, or where the law requires.',
      ],
    },
    {
      heading: '8. Cookies and browser storage',
      body: [
        'We use your browser’s local storage and IndexedDB to keep you signed in, remember preferences such as theme and language, and cache data so pages load quickly. One short-lived, strictly necessary cookie protects sign-in with Google or GitHub against forgery. There are no analytics or advertising cookies, so there is nothing to opt out of.',
      ],
    },
    {
      heading: '9. How long we keep it',
      body: [
        'Account data and content are kept while your account exists. Deleted projects stay in the recycle bin for 7 days and are then erased. You can delete your account in Settings: it keeps working for 24 hours, during which you can cancel, and is then permanently erased together with the projects and organizations you own. Backups and logs that still hold traces of it are cleared within 30 days, except records the law requires us to keep, such as billing records for the period set by Brazilian tax law. Logs are kept only as long as needed for security and troubleshooting.',
      ],
    },
    {
      heading: '10. Your rights',
      body: [
        'Under LGPD art. 18 you may ask to confirm we process your data, access it, correct it, anonymise, block or delete it, receive a portable copy, know who it is shared with, and withdraw consent. Much of this is in Settings: edit your profile, change your password, disconnect services and delete your account. For anything else, write to {email}. We answer within 15 days. You may also complain to Brazil’s data protection authority (ANPD).',
      ],
    },
    {
      heading: '11. Security',
      body: [
        'Connections are encrypted (HTTPS), passwords are hashed, integration tokens are encrypted, and access to data is restricted. No system is perfectly secure; if an incident puts your data at risk we will notify you and the authorities as the law requires.',
      ],
    },
    {
      heading: '12. Children',
      body: [
        'Task Studio is not directed at children under 13. People under 18 may use it only with the consent of a parent or guardian.',
      ],
    },
    {
      heading: '13. Changes and contact',
      body: [
        'We will post changes here with a new date and tell you by email or in the app before material changes take effect. Questions and requests: {email}. See also our {terms}.',
      ],
    },
  ],
};

const TERMS_EN: LegalDocument = {
  title: 'Terms of Service',
  intro:
    'These terms govern your use of Task Studio (task-studio.online), a service run by João Pedro Brandão Almeida, an individual based in Brazil. By creating an account or using the service you agree to them and to our {privacy}. If you use Task Studio on behalf of an organization, you confirm you may accept these terms for it.',
  sections: [
    {
      heading: '1. The service',
      body: [
        'Task Studio is a workspace for projects, tasks, notes, documents, meetings and collaboration. Features may change over time, and some depend on third-party services.',
      ],
    },
    {
      heading: '2. Your account',
      body: [
        'You must be at least 13 years old; under 18, only with a parent’s or guardian’s consent. Keep your information accurate and your password secret. You are responsible for activity on your account and should tell us at {email} if you suspect unauthorized use.',
      ],
    },
    {
      heading: '3. Your content',
      body: [
        'What you create and upload remains yours. You give us a limited license to store, copy, process, display and transmit it only as needed to run the service for you — for example, showing it to the collaborators you invite or sending it to an AI feature you use. You are responsible for having the rights to what you upload and share.',
      ],
    },
    {
      heading: '4. Acceptable use',
      body: ['You must not:'],
      list: [
        'break the law, or upload content that infringes someone else’s rights;',
        'share malware, spam, or harassing, hateful or abusive material;',
        'try to break, probe or bypass the service’s security, plan limits or access controls;',
        'overload, scrape or disrupt the service, or reverse-engineer it except where the law allows;',
        'use the service to violate other people’s privacy.',
      ],
    },
    {
      heading: '5. Shared projects',
      body: [
        'Project and organization administrators control membership and shared content. Content you post in a shared space may remain visible to its members after you leave.',
      ],
    },
    {
      heading: '6. Plans and payments',
      body: [
        'Task Studio has free and paid plans. Prices are shown before checkout and payments are processed by Stripe. Paid plans renew automatically each billing period until cancelled; you can cancel at any time in the billing portal, effective at the end of the period already paid. If you are a consumer in Brazil you may withdraw from a purchase within 7 days for a full refund (Consumer Defense Code, art. 49). Apart from that right, payments are not refunded, including when you delete your account, which ends any paid plan immediately. We will announce price changes in advance. If a plan ends, features and limits of that plan may stop being available.',
      ],
    },
    {
      heading: '7. Third-party services and AI',
      body: [
        'Integrations such as Google, GitHub, Figma, Spotify, Trello and Jira are provided by those companies under their own terms. AI features can produce inaccurate results; review them before relying on them.',
      ],
    },
    {
      heading: '8. Availability',
      body: [
        'We work to keep Task Studio available and your data safe, but the service is provided as it is and as available, without a guarantee of uninterrupted operation. Keep copies of anything critical. We may change or discontinue features, giving reasonable notice when a change significantly affects you.',
      ],
    },
    {
      heading: '9. Liability',
      body: [
        'To the extent the law allows, we are not liable for indirect damages, lost profits or lost data, and our total liability is limited to what you paid us in the 12 months before the claim. Nothing in these terms limits rights that consumer protection law does not allow to be waived.',
      ],
    },
    {
      heading: '10. Suspension and termination',
      body: [
        'You may stop using Task Studio at any time and delete your account in Settings; the deletion runs 24 hours later and can be cancelled until then. We may suspend or close accounts that break these terms, create risk for others, or when the law requires, notifying you when appropriate.',
      ],
    },
    {
      heading: '11. Changes, law and contact',
      body: [
        'We will notify you of material changes to these terms before they take effect; continuing to use the service afterwards means you accept them. These terms are governed by the laws of Brazil, and consumers may bring claims in the courts of their own domicile. Contact: {email}.',
      ],
    },
  ],
};

const PRIVACY_PT: LegalDocument = {
  title: 'Política de Privacidade',
  intro:
    'Esta política explica quais dados pessoais o Task Studio (task-studio.online) coleta, por quê, com quem compartilha e quais direitos você tem sobre eles. O Task Studio é mantido por João Pedro Brandão Almeida, pessoa física residente no Brasil, controlador desses dados nos termos da Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018) e, quando aplicável, do GDPR europeu. Contato: {email}.',
  sections: [
    {
      heading: '1. O que coletamos',
      body: [],
      list: [
        'Conta: seu nome, e-mail, senha (guardada apenas como hash bcrypt irreversível) e, se quiser, foto e bio.',
        'Entrar com Google ou GitHub: nome, e-mail, foto de perfil e o ID da conta no provedor. Nunca recebemos sua senha desses serviços.',
        'Seu conteúdo: projetos, tarefas, notas, documentos, quadros, mensagens de chat, reuniões e os arquivos e imagens que você envia, além do histórico de quem alterou o quê.',
        'Salas ao vivo: áudio, vídeo e compartilhamento de tela trafegam direto entre os participantes (WebRTC), passando pelo nosso próprio servidor só quando a conexão direta é impossível. Não gravamos chamadas.',
        'Serviços conectados, só se você os conectar: Google Agenda, GitHub, Figma, Spotify, Trello, Jira e webhooks de chat. Os tokens de acesso ficam criptografados e são usados só para o recurso que você ativou.',
        'Pagamentos: processados pela Stripe. Guardamos seu plano, os IDs de cliente e assinatura na Stripe e a situação da cobrança. Nunca vemos nem guardamos o número completo do cartão.',
        'Dados técnicos e de segurança: endereço IP e informações do navegador/dispositivo das sessões, registros do servidor e relatórios de erro do app (mensagem, rastreio técnico, página e ID da conta).',
      ],
    },
    {
      heading: '2. Para que usamos e com qual base legal',
      body: [],
      list: [
        'Para prestar o serviço que você contratou — sua conta, seu conteúdo, a colaboração e e-mails como confirmação de endereço, troca de senha e convites (execução de contrato, LGPD art. 7º, V).',
        'Para manter o serviço seguro, prevenir fraude e abuso e corrigir erros (legítimo interesse, art. 7º, IX).',
        'Para cobrar planos pagos e cumprir obrigações fiscais e contábeis (obrigação legal, art. 7º, II).',
        'Para operar as integrações que você escolher conectar (seu consentimento, que você revoga ao desconectá-las).',
      ],
    },
    {
      heading: '3. O que não fazemos',
      body: [
        'Não vendemos dados pessoais, não exibimos publicidade e não usamos rastreadores de análise ou de anúncios.',
      ],
    },
    {
      heading: '4. Recursos de IA',
      body: [
        'Quando você usa um recurso de IA, o conteúdo enviado vai para a API Gemini do Google para gerar o resultado. O Google o processa sob os próprios termos e, dependendo do nível do serviço, pode retê-lo e usá-lo para melhorar seus produtos. Não envie dados pessoais sensíveis aos recursos de IA.',
      ],
    },
    {
      heading: '5. Com quem compartilhamos',
      body: [
        'Apenas com fornecedores que operam o serviço em nosso nome, cada um limitado ao que sua função exige:',
      ],
      list: [
        'Hospedagem: nosso servidor em nuvem (aplicação e banco de dados) e a Vercel (site).',
        'Cloudflare: armazenamento de arquivos e imagens (R2) e, quando ativada, proteção contra robôs (Turnstile).',
        'Resend: e-mails da conta e de notificações.',
        'Stripe: pagamentos.',
        'Google: recursos de IA (Gemini) e, se você usar, login e Agenda. GitHub: login e repositórios, se você usar.',
        'Os serviços que você mesmo conectar e as pessoas dos projetos e organizações de que você participa, que veem o conteúdo compartilhado ali.',
      ],
    },
    {
      heading: '6. Transferência internacional',
      body: [
        'Alguns desses fornecedores tratam dados fora do Brasil, principalmente nos Estados Unidos. As transferências se apoiam nas garantias admitidas pelo art. 33 da LGPD, como compromissos contratuais desses fornecedores.',
      ],
    },
    {
      heading: '7. Dados de usuário do Google',
      body: [
        'O uso e a transferência de informações recebidas das APIs do Google pelo Task Studio seguem a Política de Dados do Usuário dos Serviços de API do Google, incluindo os requisitos de Uso Limitado. O acesso à Agenda se restringe à agenda que o app cria para as suas reuniões e ao seu endereço de e-mail. Dados do Google nunca são usados para publicidade, nunca são vendidos e não são lidos por pessoas, exceto com seu consentimento, por segurança ou quando a lei exigir.',
      ],
    },
    {
      heading: '8. Cookies e armazenamento no navegador',
      body: [
        'Usamos o armazenamento local e o IndexedDB do navegador para manter você conectado, lembrar preferências como tema e idioma e guardar dados em cache para as páginas carregarem rápido. Um único cookie, temporário e estritamente necessário, protege o login com Google ou GitHub contra fraude. Não há cookies de análise nem de publicidade, então não há nada a desativar.',
      ],
    },
    {
      heading: '9. Por quanto tempo guardamos',
      body: [
        'Os dados da conta e o conteúdo ficam guardados enquanto a conta existir. Projetos excluídos ficam 7 dias na lixeira e depois são apagados. Você pode excluir sua conta em Configurações: ela continua funcionando por 24 horas, período em que você pode cancelar, e depois é apagada definitivamente junto com os projetos e organizações que são seus. Cópias de segurança e registros que ainda guardem vestígios dela são limpos em até 30 dias, exceto os registros que a lei nos obriga a manter, como os de cobrança pelo prazo da legislação tributária. Registros técnicos são mantidos só pelo tempo necessário à segurança e à correção de problemas.',
      ],
    },
    {
      heading: '10. Seus direitos',
      body: [
        'Pelo art. 18 da LGPD você pode pedir confirmação de que tratamos seus dados, acesso, correção, anonimização, bloqueio ou eliminação, uma cópia portável, saber com quem os compartilhamos e revogar o consentimento. Boa parte disso está em Configurações: editar o perfil, trocar a senha, desconectar serviços e excluir a conta. Para o resto, escreva para {email}. Respondemos em até 15 dias. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).',
      ],
    },
    {
      heading: '11. Segurança',
      body: [
        'As conexões são criptografadas (HTTPS), as senhas ficam em hash, os tokens das integrações são criptografados e o acesso aos dados é restrito. Nenhum sistema é perfeitamente seguro; se um incidente puser seus dados em risco, avisaremos você e as autoridades como a lei exige.',
      ],
    },
    {
      heading: '12. Crianças e adolescentes',
      body: [
        'O Task Studio não é voltado a menores de 13 anos. Menores de 18 anos só podem usá-lo com o consentimento dos pais ou responsáveis.',
      ],
    },
    {
      heading: '13. Alterações e contato',
      body: [
        'Publicaremos as alterações aqui com nova data e avisaremos por e-mail ou no app antes que mudanças relevantes entrem em vigor. Dúvidas e solicitações: {email}. Veja também os nossos {terms}.',
      ],
    },
  ],
};

const TERMS_PT: LegalDocument = {
  title: 'Termos de Uso',
  intro:
    'Estes termos regem o uso do Task Studio (task-studio.online), serviço mantido por João Pedro Brandão Almeida, pessoa física residente no Brasil. Ao criar uma conta ou usar o serviço, você concorda com eles e com a nossa {privacy}. Se usar o Task Studio em nome de uma organização, você confirma que pode aceitar estes termos por ela.',
  sections: [
    {
      heading: '1. O serviço',
      body: [
        'O Task Studio é um espaço de trabalho para projetos, tarefas, notas, documentos, reuniões e colaboração. Os recursos podem mudar com o tempo, e alguns dependem de serviços de terceiros.',
      ],
    },
    {
      heading: '2. Sua conta',
      body: [
        'Você precisa ter pelo menos 13 anos; se tiver menos de 18, só com o consentimento dos pais ou responsáveis. Mantenha seus dados corretos e sua senha em sigilo. Você responde pela atividade na sua conta e deve nos avisar em {email} se suspeitar de uso não autorizado.',
      ],
    },
    {
      heading: '3. Seu conteúdo',
      body: [
        'O que você cria e envia continua sendo seu. Você nos concede uma licença limitada para armazenar, copiar, processar, exibir e transmitir esse conteúdo apenas no necessário para operar o serviço para você — por exemplo, mostrá-lo às pessoas que você convidar ou enviá-lo a um recurso de IA que você usar. Você é responsável por ter os direitos sobre o que envia e compartilha.',
      ],
    },
    {
      heading: '4. Uso aceitável',
      body: ['Você não pode:'],
      list: [
        'violar a lei ou enviar conteúdo que infrinja direitos de outras pessoas;',
        'compartilhar malware, spam ou material de assédio, ódio ou abuso;',
        'tentar quebrar, sondar ou contornar a segurança, os limites de plano ou os controles de acesso do serviço;',
        'sobrecarregar, raspar dados ou atrapalhar o serviço, nem fazer engenharia reversa além do que a lei permite;',
        'usar o serviço para violar a privacidade de outras pessoas.',
      ],
    },
    {
      heading: '5. Projetos compartilhados',
      body: [
        'Os administradores de projetos e organizações controlam os membros e o conteúdo compartilhado. O que você publica num espaço compartilhado pode continuar visível aos membros depois que você sair.',
      ],
    },
    {
      heading: '6. Planos e pagamentos',
      body: [
        'O Task Studio tem planos gratuitos e pagos. Os preços são mostrados antes da compra e os pagamentos são processados pela Stripe. Planos pagos renovam automaticamente a cada período até serem cancelados; você pode cancelar quando quiser no portal de cobrança, com efeito ao fim do período já pago. Se você é consumidor no Brasil, pode desistir da compra em até 7 dias com reembolso integral (Código de Defesa do Consumidor, art. 49). Fora esse direito, pagamentos não são reembolsados, inclusive quando você exclui sua conta, o que encerra na hora qualquer plano pago. Avisaremos mudanças de preço com antecedência. Quando um plano termina, os recursos e limites dele podem deixar de estar disponíveis.',
      ],
    },
    {
      heading: '7. Serviços de terceiros e IA',
      body: [
        'Integrações como Google, GitHub, Figma, Spotify, Trello e Jira são fornecidas por essas empresas sob os próprios termos. Recursos de IA podem gerar resultados imprecisos; revise-os antes de confiar neles.',
      ],
    },
    {
      heading: '8. Disponibilidade',
      body: [
        'Trabalhamos para manter o Task Studio disponível e seus dados seguros, mas o serviço é oferecido no estado em que se encontra e conforme disponível, sem garantia de funcionamento ininterrupto. Guarde cópias do que for crítico. Podemos alterar ou encerrar recursos, com aviso razoável quando a mudança afetar você significativamente.',
      ],
    },
    {
      heading: '9. Responsabilidade',
      body: [
        'Na medida permitida pela lei, não respondemos por danos indiretos, lucros cessantes ou perda de dados, e nossa responsabilidade total se limita ao que você nos pagou nos 12 meses anteriores à reclamação. Nada nestes termos limita direitos que a legislação de defesa do consumidor não permite renunciar.',
      ],
    },
    {
      heading: '10. Suspensão e encerramento',
      body: [
        'Você pode deixar de usar o Task Studio quando quiser e excluir sua conta em Configurações; a exclusão acontece 24 horas depois e pode ser cancelada até lá. Podemos suspender ou encerrar contas que violem estes termos, criem risco para outras pessoas ou quando a lei exigir, avisando quando for apropriado.',
      ],
    },
    {
      heading: '11. Alterações, lei aplicável e contato',
      body: [
        'Avisaremos mudanças relevantes destes termos antes que entrem em vigor; continuar usando o serviço depois disso significa aceitá-las. Estes termos são regidos pelas leis do Brasil, e consumidores podem propor ações no foro do próprio domicílio. Contato: {email}.',
      ],
    },
  ],
};

export const LEGAL: Record<Locale, Record<LegalKind, LegalDocument>> = {
  en: { terms: TERMS_EN, privacy: PRIVACY_EN },
  'pt-BR': { terms: TERMS_PT, privacy: PRIVACY_PT },
};
