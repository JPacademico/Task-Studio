# Graph Report - .  (2026-09-01)

## Corpus Check
- 8 files · ~274,742 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1775 nodes · 2394 edges · 175 communities (120 shown, 55 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 44 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Note & Board Sync
- Task API & Queries
- Integration Clients (GitHub/Calendar/Webhooks/Tokens)
- Space Skin Icons
- App Providers & Theme
- Project API & Queries
- Calendar Sync UI & Landing Demos
- Organization API & Queries
- Shared API Client
- Axios (dependency)
- dnd-kit Core (dependency)
- Task Views Layout
- User API & Board Export
- Hazard Skin Decor
- Project Creation & Import Dialogs
- DOM Types (dependency)
- Auth Desk Scene
- Document API & Queries
- Meeting API & Queries
- Date Window Helpers
- Text Board Document Access
- Task Group API & Model
- Skin Loader
- Studio Icons
- Node Types (dependency)
- Task Groups Board UI
- AI Suggestions
- i18n Locale Strings
- Autoprefixer (dependency)
- Task Config Constants
- Scripts Generate Icons
- Security Base Uri
- Package
- Floating Shortcuts Model
- Notification Model Queries
- Team Model Queries
- Meetings Ui Meetings
- Notifications Ui Notification
- Theme Toggle Model
- Ui Edge Affordance
- Ui Eldritch Decor
- Auth Model Session
- Notes Board Ui
- Notes Board Ui
- Lib Nav Preferences
- Ui Eldritch Icons
- CLI Settings Panel
- Ui Hazard Icons
- Ui Runic Icons
- Ui Underwater Icons
- Ui Volcano Icons
- Activity Model Types
- Project Chat Dock
- Task Config Constants
- Lib Sanitize Html
- Ui Autumn Icons
- Ui Newspaper Icons
- Ui Autumn Decor
- Index Html Document
- Chat Model Types
- Admin Model Types
- Auth Ui Oauth
- Import Tracker Ui
- Organization Management Ui
- Organization Management Ui
- Organization Management Ui
- Rich Text Ui
- Task Management Ui
- Webhooks Ui Webhooks
- Project Changelog Ui
- Hidden Sidebar Ui
- Layouts Use Shell
- Dnd Board Ui
- Teams Ui Teams
- Dashboard Dashboard Page
- Lib Hooks
- Lib Runes
- Lib Use Intent
- Ui File Attachment
- Ui Nav Glyph
- Hidden Sidebar Ui
- Vercel
- Theme Toggle Ui
- Whiteboard Ui Whiteboard
- Document Ui Document
- Organization Management Ui
- Roster Ui Roster
- Lib Prepare Image
- Lib Use Edge
- Ui Avatar
- Ui Input
- Project Rail Ui
- Whiteboard Ui Whiteboard
- Project Chat Dock
- Project Rail Ui
- Invite Picker Ui
- Notes Board Ui
- Organization Management Ui
- Project Chat Dock
- Task Management Ui
- Meetings Meetings Page
- Task Menu Task
- Config Env
- Lib Colors
- Ui Expandable Stage
- Ui Route Boundary
- Ui Runic Decor
- Ui Select
- Task Views Ui
- Lib Skin Motion
- Readme Ios Safari Specifics
- Document Lib Plain
- Notes Board Lib
- Notes Board Lib
- Notes Board Ui
- Invitations Invitations Page
- Notes Board Notes
- Organizations Organizations Page
- Recycle Bin Recycle
- Themes Theme Gallery
- Lib Skin Motion
- Ui Runic Text
- Ui Zoomable Image
- Task Config Constants
- Floating Shortcuts Ui
- Settings Settings Page
- Top Navigation Ui
- Security Httponly Cookie Fix
- Project Ui Project
- Task Ui Pending
- Api Tokens Ui
- Floating Shortcuts Lib
- Floating Shortcuts Ui
- Language Toggle Ui
- Notes Board Ui
- Notes Board Ui
- Admin Admin Page
- Settings Settings Page
- Theme Toggle Model
- Theme Toggle Model
- Vite Config
- Theme Toggle Model
- Theme Toggle Model
- Theme Toggle Model
- Theme Toggle Model
- Theme Toggle Model
- Not Found Page
- Theme Toggle Model
- Theme Toggle Model
- Lib Cn
- Project Dashboard Ui
- Public Icons Icon 512 Mark
- Security Referrer Policy
- Security X Content Type Options
- Public Icons Icon 512 Mark
- Public Theme Init
- Security Cache Control
- Security Permissions Policy
- Security Referrer Policy
- Security X Content Type Options
- Security X Content Type Options

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `Content-Security-Policy` - 14 edges
3. `compilerOptions` - 13 edges
4. `useBoardCache()` - 13 edges
5. `useProjectBoardCache()` - 11 edges
6. `toDate()` - 10 edges
7. `Task Studio README` - 9 edges
8. `Note` - 9 edges
9. `useOrganizationRefresh()` - 9 edges
10. `useInvalidateTasks()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Task Studio README` --references--> `@dnd-kit/core`  [EXTRACTED]
  README.md → package.json
- `Task Studio README` --references--> `framer-motion`  [EXTRACTED]
  README.md → package.json
- `Task Studio README` --references--> `zustand`  [EXTRACTED]
  README.md → package.json
- `Two-tool Drag & Drop strategy` --references--> `@dnd-kit/core`  [EXTRACTED]
  README.md → package.json
- `framer-motion` --rationale_for--> `style-src 'self' 'unsafe-inline'`  [EXTRACTED]
  package.json → SECURITY.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CSP as second line of defense for token theft and HTML injection** — security_content_security_policy, security_localstorage_tokens, security_contenteditable_sanitizer [EXTRACTED 1.00]
- **PDF preview via API-gated blob frame** — security_frame_src, security_documentapi_sourceobjecturl, security_cloudflare_r2 [INFERRED 0.85]
- **vercel.json response header set** — security_vercel_json, security_content_security_policy, security_strict_transport_security, security_x_content_type_options, security_x_frame_options, security_referrer_policy, security_permissions_policy, security_cache_control [EXTRACTED 1.00]
- **Performance-first Interaction Design Pattern** — readme_useedgereveal, readme_drag_and_drop_design, readme_60fps_rules [INFERRED 0.85]
- **PWA/iOS Delivery Flow** — readme_pwa_workbox, readme_ios_safari_specifics, readme_npm_scripts, readme_vercel_deployment [INFERRED 0.75]

## Communities (175 total, 55 thin omitted)

### Community 0 - "Note & Board Sync"
Cohesion: 0.06
Nodes (59): boardApi, noteApi, EditableField, markLocalNoteEdit(), mergeRemoteNote(), pending, PendingEdit, prune() (+51 more)

### Community 1 - "Task API & Queries"
Cohesion: 0.05
Nodes (63): taskApi, blockingAssigneeCount(), canCompleteTask(), completionBlockedReason(), CompletionContext, completionProgress(), isSharedTask(), outstandingAssignees() (+55 more)

### Community 2 - "Integration Clients (GitHub/Calendar/Webhooks/Tokens)"
Cohesion: 0.05
Nodes (31): calendarApi, githubApi, importsApi, tokensApi, webhooksApi, ApiToken, BoardImportPayload, BoardImportSource (+23 more)

### Community 3 - "Space Skin Icons"
Cohesion: 0.06
Nodes (33): CENTRE, EdgeAffordance(), EdgeAffordanceProps, GRADIENT, NavPinButton(), NavPinButtonProps, RAIL, RAIL_TONE (+25 more)

### Community 4 - "App Providers & Theme"
Cohesion: 0.07
Nodes (24): ListProjectsParams, projectApi, patchProjectPinned(), patchRosterRemoval(), seedProjectFrom(), useProject(), useProjectIntentPrefetch(), useRemoveMember() (+16 more)

### Community 5 - "Project API & Queries"
Cohesion: 0.06
Nodes (36): App(), AppProviders(), QueryProvider(), NOTIFICATION_TOAST, RealtimeContext, RealtimeContextValue, RealtimeProvider(), roomHolders (+28 more)

### Community 6 - "Calendar Sync UI & Landing Demos"
Cohesion: 0.06
Nodes (29): OUTCOME, GoogleCalendarMark(), COLUMNS, DemoBoard(), LANES, RESIDENTS, DemoChat(), MESSAGES (+21 more)

### Community 7 - "Organization API & Queries"
Cohesion: 0.07
Nodes (33): ExpandableStage(), ExpandableStageProps, ExpandToggle(), ExpandToggleProps, HazardDrift(), MOTES, Badge(), BadgeProps (+25 more)

### Community 8 - "Shared API Client"
Cohesion: 0.08
Nodes (23): AutumnMark(), EldritchMark(), GlyphProps, NavGlyphKey, HazardMark(), NavGlyph(), NavGlyphProps, NewspaperMark() (+15 more)

### Community 9 - "Axios (dependency)"
Cohesion: 0.09
Nodes (25): organizationApi, useAttachProject(), useCreateOrganization(), useDetachProject(), useInviteToOrganization(), useOrganizationRefresh(), useRemoveOrganizationMember(), useRevokeOrganizationInvitation() (+17 more)

### Community 10 - "dnd-kit Core (dependency)"
Cohesion: 0.09
Nodes (22): api, apiIsWarm(), ensureApiAwake(), isApiWarm(), refreshAccessToken(), refreshSession(), RetriableConfig, sessionExpiredHandlers (+14 more)

### Community 11 - "Task Views Layout"
Cohesion: 0.10
Nodes (24): DEFAULTS, LAYOUTS_FOR, LayoutSurface, read(), Stored, TaskLayout, useTaskLayout(), write() (+16 more)

### Community 12 - "User API & Board Export"
Cohesion: 0.09
Nodes (28): BOARD_EXPORT_MIME, DOCUMENT_ACCEPT, DOCUMENT_MIME_TYPES, EXTENSION_MIME, IMPORT_ACCEPT, IMPORT_MIME_TYPES, MAX_DOCUMENT_BYTES, PresignedUpload (+20 more)

### Community 13 - "Hazard Skin Decor"
Cohesion: 0.07
Nodes (27): DOM, DOM.Iterable, src, vite/client, vite-plugin-pwa/client, compilerOptions, baseUrl, isolatedModules (+19 more)

### Community 14 - "Project Creation & Import Dialogs"
Cohesion: 0.10
Nodes (7): AuthScene(), DeskObject(), DeskObjectProps, floatTransition(), AuthShell(), AuthShellProps, Phase

### Community 15 - "DOM Types (dependency)"
Cohesion: 0.17
Nodes (20): meetingApi, byStart(), invalidateAgenda(), organizationKey(), projectKey(), removeMeeting(), upsertMeeting(), useCompleteMeeting() (+12 more)

### Community 16 - "Auth Desk Scene"
Cohesion: 0.19
Nodes (21): DATE_WINDOW_YEARS, dateInputBounds(), dateInputMax(), dateInputMin(), dateLocale(), dayInputMax(), dayInputMin(), formatDateTime() (+13 more)

### Community 17 - "Document API & Queries"
Cohesion: 0.13
Nodes (19): DocumentAccessDialog(), DocumentAccessDialogProps, DocumentDownloadMenu(), DownloadMenuProps, ICONS, saveBlob(), stem(), formatBadge() (+11 more)

### Community 18 - "Meeting API & Queries"
Cohesion: 0.17
Nodes (16): documentApi, useAdoptDocument(), useCreateDocument(), useDeleteDocument(), useDocumentListCache(), useImportDocument(), useProjectDocumentsRealtime(), useSetDocumentEditors() (+8 more)

### Community 19 - "Date Window Helpers"
Cohesion: 0.19
Nodes (16): taskGroupApi, boardScope(), invalidateGroups(), isBoardBusy(), useCreateTaskGroup(), useDeleteTaskGroup(), useReorderTaskGroups(), useTagTask() (+8 more)

### Community 20 - "Text Board Document Access"
Cohesion: 0.12
Nodes (13): Button, buttonClasses(), ButtonProps, GAPS, Size, SIZES, Variant, VARIANTS (+5 more)

### Community 21 - "Task Group API & Model"
Cohesion: 0.11
Nodes (18): node, scripts/**/*.mjs, vite.config.ts, compilerOptions, allowSyntheticDefaultImports, isolatedModules, lib, module (+10 more)

### Community 22 - "Skin Loader"
Cohesion: 0.13
Nodes (10): read(), Stored, useHiddenColumns(), write(), GroupTaskCard(), GroupTaskCardProps, RIBBON, GroupsBoardProps (+2 more)

### Community 23 - "Studio Icons"
Cohesion: 0.18
Nodes (10): aiApi, AiSuggestion, ProjectTaskSuggestion, SubtaskSuggestion, JobEvent, StreamStatus, useSuggestionStream(), AiPanel() (+2 more)

### Community 24 - "Node Types (dependency)"
Cohesion: 0.19
Nodes (15): detectLocale(), LocaleState, substitute(), syncDocumentLang(), Translate, useLocale(), useLocaleStore, useT() (+7 more)

### Community 25 - "Task Groups Board UI"
Cohesion: 0.12
Nodes (17): autoprefixer, devDependencies, autoprefixer, postcss, @types/node, @types/react, @types/react-dom, typescript (+9 more)

### Community 26 - "AI Suggestions"
Cohesion: 0.12
Nodes (16): RFC-5321, BOARD_INK_COLORS, CONNECTOR_COLORS, EDGE_REVEAL_PX, GROUP_COLUMNS_PER_PAGE, MAX_BOARD_PAGES, MAX_GROUPS_PER_PROJECT, MAX_TASK_NOTES (+8 more)

### Community 27 - "i18n Locale Strings"
Cohesion: 0.15
Nodes (10): BoardImportPanel(), BoardImportPanelProps, sourceFor(), CreateProjectDialogProps, Mode, GithubImportPanel(), GithubImportPanelProps, ProjectSettingsDialogProps (+2 more)

### Community 28 - "Autoprefixer (dependency)"
Cohesion: 0.16
Nodes (15): BRAND, BRAND_DEEP, chunk(), crc32(), crcTable, drawIcon(), encodePng(), FOLD (+7 more)

### Community 29 - "Task Config Constants"
Cohesion: 0.13
Nodes (16): base-uri 'self', Cloudflare R2 (bucket-specific hostname), connect-src 'self' https: wss:, Content-Security-Policy, contentEditable innerHTML + sanitiser (defense in depth), documentApi.sourceObjectUrl, form-action 'self', frame-ancestors 'none' (+8 more)

### Community 30 - "Scripts Generate Icons"
Cohesion: 0.26
Nodes (12): clampToViewport(), FloatingShortcut, PILL, read(), ShortcutIcon, ShortcutsState, useFloatingShortcuts, write() (+4 more)

### Community 31 - "Security Base Uri"
Cohesion: 0.16
Nodes (11): DirectionArrow(), DirectionArrowProps, EldritchTendrils(), EldritchTendrilsProps, GazeArrow(), GazeArrowProps, nextSighting(), Sighting (+3 more)

### Community 32 - "Package"
Cohesion: 0.21
Nodes (6): notificationApi, dropNotification(), useNotificationActions(), AppNotification, NotificationPayload, NotificationType

### Community 33 - "Floating Shortcuts Model"
Cohesion: 0.30
Nodes (11): teamApi, keyFor(), useCreateTeam(), useDeleteTeam(), useTeamRefresh(), useTeams(), useUpdateTeam(), CreateTeamPayload (+3 more)

### Community 34 - "Notification Model Queries"
Cohesion: 0.18
Nodes (11): MeetingComposer(), MeetingComposerProps, nextHour(), dayKey(), MeetingRow, MeetingRowProps, MeetingsPanel(), MeetingsPanelProps (+3 more)

### Community 35 - "Team Model Queries"
Cohesion: 0.19
Nodes (8): deepLink(), NotificationBell(), NotificationOptIn(), DesktopNotice, hasDeclinedNotifications(), isSupported(), NotificationAccess, requestNotificationAccess()

### Community 36 - "Meetings Ui Meetings"
Cohesion: 0.23
Nodes (9): SETTINGS_SKIN_LIMIT, SKIN_BY_VALUE, SKIN_CATALOG, SkinDefinition, SkinPreview, leaf(), notch(), SkinMock() (+1 more)

### Community 37 - "Notifications Ui Notification"
Cohesion: 0.14
Nodes (13): CENTRE, EdgeAffordance(), EdgeAffordanceProps, GRADIENT, IRIS_GRADIENT, NavPinButton(), NavPinButtonProps, RAIL (+5 more)

### Community 38 - "Theme Toggle Model"
Cohesion: 0.15
Nodes (13): axios, clsx, @dnd-kit/utilities, dependencies, axios, clsx, @dnd-kit/utilities, react-dom (+5 more)

### Community 39 - "Ui Edge Affordance"
Cohesion: 0.17
Nodes (12): zustand, tailwindcss, Layered Dependency Rule (app→pages→widgets→features→entities→shared), Feature-Sliced Design, Optimistic Update Strategy, React 19, Sonner (toasts), Tailwind CSS (+4 more)

### Community 40 - "Ui Eldritch Decor"
Cohesion: 0.21
Nodes (8): authApi, OAuthAvailability, OAuthProvider, SessionState, SessionStatus, useCurrentUser(), useSessionStore, SignOut

### Community 41 - "Auth Model Session"
Cohesion: 0.23
Nodes (9): Listener, Point, PositionBus, centreOf(), ConnectorLayer(), ConnectorLayerProps, curveBetween(), headTransform() (+1 more)

### Community 42 - "Notes Board Ui"
Cohesion: 0.18
Nodes (4): MarqueeOptions, Rect, ConnectBannerProps, SelectionBarProps

### Community 43 - "Notes Board Ui"
Cohesion: 0.23
Nodes (11): DEFAULTS, NavEdge, NavPreferencesState, PinnedEdges, RailScope, read(), readRailScope(), StoredPreferences (+3 more)

### Community 44 - "Lib Nav Preferences"
Cohesion: 0.18
Nodes (9): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PROJECT_SCOPES, STATUS_SWATCH, STATUSES, TaskFiltersProps (+1 more)

### Community 45 - "Ui Eldritch Icons"
Cohesion: 0.29
Nodes (5): activityApi, ActivityEntry, ActivityPage, ActivityType, RevertResult

### Community 46 - "CLI Settings Panel"
Cohesion: 0.27
Nodes (4): CLI_DOCS_URL, cliApiUrl(), CliCommandList(), DocsLink()

### Community 47 - "Ui Hazard Icons"
Cohesion: 0.22
Nodes (5): ChatDockState, PersistedDock, restored, useChatDock, write()

### Community 48 - "Ui Runic Icons"
Cohesion: 0.18
Nodes (9): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PROJECT_SCOPES, STATUS_SWATCH, STATUSES, TaskFiltersProps (+1 more)

### Community 49 - "Ui Underwater Icons"
Cohesion: 0.24
Nodes (9): ALLOWED_ATTRIBUTES, ALLOWED_STYLE_PROPERTIES, ALLOWED_TAGS, clean(), DISCARDED_TAGS, GLOBAL_ATTRIBUTES, isSafeUrl(), sanitizeDocumentHtml() (+1 more)

### Community 50 - "Ui Volcano Icons"
Cohesion: 0.31
Nodes (8): adminApi, adminTokenStore, client, AdminReport, AdminSession, AdminStats, AdminUserRow, BanPayload

### Community 51 - "Activity Model Types"
Cohesion: 0.31
Nodes (9): clearPersistedQueries(), hydrateQueryCache(), isPersistable(), PERSISTED_PREFIXES, PersistedBlob, PersistedEntry, persistQueryCache(), read() (+1 more)

### Community 52 - "Project Chat Dock"
Cohesion: 0.20
Nodes (7): AutumnFall(), AutumnHedge(), AutumnHedgeProps, FALLING, LeafProps, LeafTone, TONE_FILL

### Community 53 - "Task Config Constants"
Cohesion: 0.22
Nodes (8): iOS standalone / viewport-fit=cover hints, <script type="module" src="/src/main.tsx">, <script src="/theme-init.js"> in index.html <head>, vite-plugin-pwa, /registerSW.js, script-src 'self', public/theme-init.js, vite-plugin-pwa

### Community 54 - "Lib Sanitize Html"
Cohesion: 0.28
Nodes (7): chatApi, whiteboardApi, ChatDelivery, ChatMessage, WhiteboardElement, WhiteboardElementType, WhiteboardStrokeData

### Community 55 - "Ui Autumn Icons"
Cohesion: 0.25
Nodes (6): ASSUME_BOTH, LABELS, MARKS, OAuthButtons(), OAuthButtonsProps, readRemembered()

### Community 56 - "Ui Newspaper Icons"
Cohesion: 0.25
Nodes (5): ReportUserDialog(), ReportUserDialogProps, ASSIGNABLE_ROLES, ROLE_ICON, RosterPanelProps

### Community 57 - "Ui Autumn Decor"
Cohesion: 0.33
Nodes (7): TrackerState, useImportTracker, ImportRow(), ImportRowProps, ImportTracker(), isLive(), STEP_LABEL

### Community 58 - "Index Html Document"
Cohesion: 0.25
Nodes (7): description, engines, node, name, private, type, version

### Community 59 - "Chat Model Types"
Cohesion: 0.25
Nodes (4): ASSIGNABLE_ROLES, InviteListProps, OrganizationDialogProps, ProjectPickerProps

### Community 60 - "Admin Model Types"
Cohesion: 0.25
Nodes (4): ASSIGNABLE_ROLES, InviteFormProps, MemberRowProps, OrganizationMembersPanelProps

### Community 61 - "Auth Ui Oauth"
Cohesion: 0.29
Nodes (6): Lane, laneOf(), LANES, OrganizationProjectsBoard(), OrganizationProjectsBoardProps, ProjectCardProps

### Community 62 - "Import Tracker Ui"
Cohesion: 0.25
Nodes (4): COLORS, PromptKind, RichTextEditorProps, SIZES

### Community 63 - "Organization Management Ui"
Cohesion: 0.29
Nodes (4): NoteCardProps, NoteChecklist(), NoteChecklistProps, TaskDetailModalProps

### Community 64 - "Organization Management Ui"
Cohesion: 0.25
Nodes (5): ALL_EVENTS, EVENT_LABEL, FLAVOUR_LABEL, WebhookRowProps, WebhooksPanelProps

### Community 65 - "Organization Management Ui"
Cohesion: 0.29
Nodes (6): APPEARANCE, ChangelogRowProps, dayKey(), ProjectChangelog(), ProjectChangelogProps, SENTENCE

### Community 66 - "Rich Text Ui"
Cohesion: 0.29
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 67 - "Task Management Ui"
Cohesion: 0.29
Nodes (7): @dnd-kit/core, framer-motion, @dnd-kit/core, framer-motion, 60fps Animation Rules, Two-tool Drag & Drop strategy, style-src 'self' 'unsafe-inline'

### Community 68 - "Webhooks Ui Webhooks"
Cohesion: 0.29
Nodes (7): scripts, build, dev, icons, lint, preview, typecheck

### Community 69 - "Project Changelog Ui"
Cohesion: 0.38
Nodes (4): AGENDA_PREFETCH, rememberedBoardPage(), useRouteIntentPrefetch(), useShellPrefetch()

### Community 70 - "Hidden Sidebar Ui"
Cohesion: 0.33
Nodes (4): COLUMNS, DraggableTask(), lockedHint(), TaskBoardProps

### Community 71 - "Layouts Use Shell"
Cohesion: 0.29
Nodes (3): TeamComposerProps, TeamRowProps, TeamsPanelProps

### Community 72 - "Dnd Board Ui"
Cohesion: 0.33
Nodes (3): DashboardPage(), rankUpNext(), TONES

### Community 73 - "Teams Ui Teams"
Cohesion: 0.38
Nodes (3): useIsDesktop(), useIsTouchDevice(), useMediaQuery()

### Community 74 - "Dashboard Dashboard Page"
Cohesion: 0.33
Nodes (5): DIGRAPHS, LETTERS, RuneToken, runeTokens(), toRunes()

### Community 75 - "Lib Hooks"
Cohesion: 0.38
Nodes (5): forget(), IntentHandlers, isSpeculationWelcome(), lastPrefetchedAt, useIntentPrefetch()

### Community 76 - "Lib Runes"
Cohesion: 0.38
Nodes (6): extensionOf(), FileAttachmentField(), FileAttachmentFieldProps, FileAttachmentRow(), FileAttachmentRowProps, formatFileSize()

### Community 77 - "Lib Use Intent"
Cohesion: 0.29
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 78 - "Ui File Attachment"
Cohesion: 0.29
Nodes (6): buildCommand, framework, headers, outputDirectory, rewrites, $schema

### Community 79 - "Ui Nav Glyph"
Cohesion: 0.33
Nodes (3): SkinDefinition, SkinPreview, SKINS

### Community 80 - "Hidden Sidebar Ui"
Cohesion: 0.47
Nodes (5): isStroke(), readImageSize(), Tool, Whiteboard(), WhiteboardProps

### Community 81 - "Vercel"
Cohesion: 0.40
Nodes (4): DocumentByline(), DocumentBylineProps, DocumentCreatorStampProps, nameFor()

### Community 84 - "Document Ui Document"
Cohesion: 0.47
Nodes (5): encodeAt(), PreparedImage, prepareImage(), PrepareOptions, scaleToFit()

### Community 85 - "Organization Management Ui"
Cohesion: 0.33
Nodes (3): Edge, KeepOut, Options

### Community 86 - "Roster Ui Roster"
Cohesion: 0.33
Nodes (5): Avatar(), AvatarProps, AvatarStack(), AvatarStackProps, SIZES

### Community 87 - "Lib Prepare Image"
Cohesion: 0.33
Nodes (5): FieldShellProps, Input, InputProps, Textarea, TextareaProps

### Community 88 - "Lib Use Edge"
Cohesion: 0.40
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 89 - "Ui Avatar"
Cohesion: 0.47
Nodes (5): adoptStroke(), isStroke(), Tool, Whiteboard(), WhiteboardProps

### Community 91 - "Project Rail Ui"
Cohesion: 0.50
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 92 - "Whiteboard Ui Whiteboard"
Cohesion: 0.40
Nodes (3): InvitePickerProps, Person, Tab

### Community 93 - "Project Chat Dock"
Cohesion: 0.40
Nodes (3): BoardTool, BoardToolbarProps, TOOLS

### Community 96 - "Notes Board Ui"
Cohesion: 0.40
Nodes (3): EMPTY_ROSTER, PRIORITIES, TaskComposerProps

### Community 97 - "Organization Management Ui"
Cohesion: 0.50
Nodes (3): AgendaRowProps, dayKey(), MeetingsPage()

### Community 99 - "Task Management Ui"
Cohesion: 0.60
Nodes (3): AgendaSkeleton(), isSameDay(), TaskMenuPage()

### Community 100 - "Meetings Meetings Page"
Cohesion: 0.50
Nodes (4): apiUrl, env, resolveApiUrl(), stripTrailingSlash()

### Community 102 - "Task Menu Task"
Cohesion: 0.50
Nodes (4): Mark, nextMark(), RuneScribe(), STAVES

### Community 103 - "Config Env"
Cohesion: 0.40
Nodes (4): PopupBox, Select(), SelectOption, SelectProps

### Community 106 - "Ui Route Boundary"
Cohesion: 0.50
Nodes (4): iOS/Safari PWA specifics, npm Scripts (dev/build/preview/typecheck/icons), vite-plugin-pwa / Workbox PWA setup, Vercel Deployment (vercel.json)

### Community 107 - "Ui Runic Decor"
Cohesion: 0.67
Nodes (3): escapeText(), MAX_PLAIN_TEXT_CHARS, plainTextToHtml()

### Community 109 - "Task Views Ui"
Cohesion: 0.67
Nodes (3): fitImage(), ImageDropOptions, useImageDrop()

### Community 110 - "Lib Skin Motion"
Cohesion: 0.67
Nodes (3): InkLayer(), InkLayerProps, toPath()

### Community 112 - "Document Lib Plain"
Cohesion: 0.67
Nodes (3): byNewest(), InvitationsPage(), UnifiedInvitation

### Community 116 - "Invitations Invitations Page"
Cohesion: 0.67
Nodes (3): Bin, daysUntil(), RecycleBinPage()

### Community 120 - "Recycle Bin Recycle"
Cohesion: 0.67
Nodes (3): RunicText(), RunicTextProps, seedOf()

### Community 121 - "Themes Theme Gallery"
Cohesion: 0.67
Nodes (3): clamp(), ZoomableImage(), ZoomableImageProps

### Community 126 - "Task Config Constants"
Cohesion: 1.00
Nodes (3): Structural fix: httpOnly cookie on shared parent domain, Access/refresh tokens stored in localStorage, shared/api/token-store (token-store.ts)

## Knowledge Gaps
- **557 isolated node(s):** `name`, `private`, `version`, `type`, `description` (+552 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **55 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Theme Toggle Model` to `Task Management Ui`, `Ui Edge Affordance`, `Theme Toggle Model`, `Theme Toggle Model`, `Vite Config`, `Theme Toggle Model`, `Theme Toggle Model`, `Theme Toggle Model`, `Theme Toggle Model`, `Theme Toggle Model`, `Not Found Page`, `Theme Toggle Model`, `Theme Toggle Model`, `Index Html Document`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `installApiWarmOnIntent()` connect `dnd-kit Core (dependency)` to `Project API & Queries`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Why does `AppProviders()` connect `Project API & Queries` to `dnd-kit Core (dependency)`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _557 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Note & Board Sync` be split into smaller, more focused modules?**
  _Cohesion score 0.05561105561105561 - nodes in this community are weakly interconnected._
- **Should `Task API & Queries` be split into smaller, more focused modules?**
  _Cohesion score 0.05297334244702666 - nodes in this community are weakly interconnected._
- **Should `Integration Clients (GitHub/Calendar/Webhooks/Tokens)` be split into smaller, more focused modules?**
  _Cohesion score 0.05367231638418079 - nodes in this community are weakly interconnected._