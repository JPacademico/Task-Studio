# Graph Report - C:/Users/jorda/OneDrive/Documentos/GitHub/Task-Studio/Task-Studio-UI  (2026-09-03)

## Corpus Check
- 21 files · ~315,396 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1879 nodes · 2509 edges · 177 communities (130 shown, 47 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Note & Board Sync
- Task API & Queries
- Landing Page Demos & Showcase
- Landing Page Demos & Showcase
- Landing Page Demos
- App Providers, Router & Theming
- Project API & Queries
- API Client, Socket & Session Tokens
- Skin Icon Sets
- Organization API & Queries
- Meeting & Room API
- Shared API Client
- Task Views & Layout Store
- Uploads & Board Export
- Task Groups Board UI
- Security Policy & CSP
- App TS Config
- Runtime Dependencies
- Auth Desk Scene
- Shared UI Primitives
- Date Window Helpers
- Text Board & Documents
- Document API & Queries
- Task Group API & Model
- Button, Modal & Boundary
- Build TS Config
- AI Suggestions
- Meetings, Composer & Rooms
- i18n Locale Strings
- Dev Dependencies
- Task Config Constants
- Project Creation & Import Dialogs
- Icon Generation Script
- Floating Shortcuts Store
- Eldritch & Runic Decor
- Notification API & Copy
- Team API & Queries
- Skin Catalogue & Preview
- Edge Affordance & Nav Pin
- Architecture Notes (README)
- Auth Session Store
- Note Connector Layer
- Board Gestures & Overlays
- Nav Preferences Store
- Task Filters
- Activity API & Types
- CLI Panels & Commands
- Project Chat Dock
- Task Filter Controls
- CLI Docs Page & Content
- HTML Sanitiser
- Admin API & Types
- Webhooks Panel
- Query Cache Persistence
- Autumn Skin Decor
- Chat & Whiteboard API
- OAuth Sign-in Buttons
- Roster & Reporting
- Desktop Notifications
- Import Tracker
- Package Metadata
- Organization Dialog
- Organization Members Panel
- Organization Projects Board
- Rich Text Editor
- Task Detail & Note Checklist
- File Attachment Fields
- Project Changelog
- Hidden Sidebar Nav
- Motion & Drag Dependencies
- npm Scripts
- Shell Route Prefetch
- Teams Panel
- Dashboard Page
- Shared React Hooks
- Runic Transliteration
- Intent Prefetch
- Hidden Sidebar Widget
- Vercel Deploy Config
- Skin Picker
- Whiteboard Tools
- Document Byline
- Connections Shelf
- Organization Dashboard
- Image Preparation
- Edge Reveal Hook
- Project Rail Widget
- Whiteboard Widget
- Chat Pin Tack
- Project Rail Items
- Invite Picker
- Notes Board Toolbar
- Desktop Notifications
- Organization Banner
- Chat Pin UI
- Repository Link Dialog
- Board Undo/Redo History
- Notes Board Toolbar
- Personal Agenda Page
- Organization Page
- Task Menu Page
- Build Environment Config
- Colour Helpers
- Write-Order Race Guard
- Runic Decor
- Shared UI Primitives
- Layout Switcher
- Per-Skin Motion Curves
- Document Plain Text
- CLI Device Auth Client
- Note Selection Logic
- Board Image Drop
- Board Ink Layer
- Admin Console Page
- Invitations Page
- Notes Board Page
- Organizations Page
- Project Workspace Page
- Recycle Bin Page
- Theme Gallery Page
- Skin Motion Tokens
- Text Clamping Helpers
- Card Press Gesture
- Runic Text Rendering
- Zoomable Image
- Task Type Tag
- Floating Shortcut Layer
- Top Navigation Bar
- Project Window Chip
- Pending Task Skeletons
- API Tokens Panel
- Signed-in CLI Machines
- Shortcut Tear-off
- Tear-off Ghost
- Language Toggle
- Notes Board Pager
- Notes Board Skeleton
- Settings Page
- Top Navigation Widget
- Root TS Config
- Vite Build & CSP
- dnd-kit Sortable (dependency)
- dnd-kit Utilities (dependency)
- React DOM (dependency)
- Socket.IO Client (dependency)
- Hidden Edge Menus
- Calendar Feed Panel
- Calendar Sync Badge
- Branch Commit Prompt
- Theme Toggle
- Project Dashboard Widget
- App Icon 512
- Theme Bootstrap Script
- CSS Variable Theme System
- Asset Cache Headers
- Referrer Policy
- Content Type Options
- Security Header: Permissions-Policy
- Security Header: Referrer-Policy
- Security Header: X-Content-Type-Options

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `Content-Security-Policy` - 14 edges
3. `useBoardCache()` - 14 edges
4. `compilerOptions` - 13 edges
5. `useProjectBoardCache()` - 12 edges
6. `toDate()` - 10 edges
7. `Task Studio README` - 9 edges
8. `useOrganizationRefresh()` - 9 edges
9. `Task` - 9 edges
10. `GlyphProps` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Task Studio README` --references--> `zustand`  [EXTRACTED]
  README.md → package.json
- `Two-tool Drag & Drop strategy` --references--> `@dnd-kit/core`  [EXTRACTED]
  README.md → package.json
- `Task Studio README` --references--> `@dnd-kit/core`  [EXTRACTED]
  README.md → package.json
- `framer-motion` --rationale_for--> `style-src 'self' 'unsafe-inline'`  [EXTRACTED]
  package.json → SECURITY.md
- `Two-tool Drag & Drop strategy` --references--> `framer-motion`  [EXTRACTED]
  README.md → package.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CSP as second line of defense for token theft and HTML injection** — security_content_security_policy, security_localstorage_tokens, security_contenteditable_sanitizer [EXTRACTED 1.00]
- **PDF preview via API-gated blob frame** — security_frame_src, security_documentapi_sourceobjecturl, security_cloudflare_r2 [INFERRED 0.85]
- **vercel.json response header set** — security_vercel_json, security_content_security_policy, security_strict_transport_security, security_x_content_type_options, security_x_frame_options, security_referrer_policy, security_permissions_policy, security_cache_control [EXTRACTED 1.00]
- **Performance-first Interaction Design Pattern** — readme_useedgereveal, readme_drag_and_drop_design, readme_60fps_rules [INFERRED 0.85]
- **PWA/iOS Delivery Flow** — readme_pwa_workbox, readme_ios_safari_specifics, readme_npm_scripts, readme_vercel_deployment [INFERRED 0.75]

## Communities (177 total, 47 thin omitted)

### Community 0 - "Note & Board Sync"
Cohesion: 0.05
Nodes (62): taskApi, blockingAssigneeCount(), canCompleteTask(), completionBlockedReason(), CompletionContext, completionProgress(), isSharedTask(), outstandingAssignees() (+54 more)

### Community 1 - "Task API & Queries"
Cohesion: 0.05
Nodes (31): calendarApi, githubApi, importsApi, tokensApi, webhooksApi, ApiToken, BoardImportPayload, BoardImportSource (+23 more)

### Community 2 - "Landing Page Demos & Showcase"
Cohesion: 0.05
Nodes (39): COLUMNS, DemoBoard(), LANES, RESIDENTS, DemoChat(), MESSAGES, DemoFrame(), DemoFrameProps (+31 more)

### Community 3 - "Landing Page Demos & Showcase"
Cohesion: 0.06
Nodes (33): CENTRE, EdgeAffordance(), EdgeAffordanceProps, GRADIENT, NavPinButton(), NavPinButtonProps, RAIL, RAIL_TONE (+25 more)

### Community 4 - "Landing Page Demos"
Cohesion: 0.05
Nodes (39): App(), AppProviders(), QueryProvider(), NOTIFICATION_TOAST, RealtimeContext, RealtimeContextValue, RealtimeMeta, RealtimeProvider() (+31 more)

### Community 5 - "App Providers, Router & Theming"
Cohesion: 0.06
Nodes (23): ListProjectsParams, projectApi, patchProjectPinned(), patchRosterRemoval(), seedProjectFrom(), useProject(), useProjectIntentPrefetch(), useRemoveMember() (+15 more)

### Community 6 - "Project API & Queries"
Cohesion: 0.08
Nodes (24): api, apiIsWarm(), ensureApiAwake(), CLIENT_ID, CLIENT_ID_HEADER, isApiWarm(), refreshAccessToken(), refreshSession() (+16 more)

### Community 7 - "API Client, Socket & Session Tokens"
Cohesion: 0.07
Nodes (31): Avatar(), AvatarProps, AvatarStack(), AvatarStackProps, SIZES, ExpandableStage(), ExpandableStageProps, ExpandToggle() (+23 more)

### Community 8 - "Skin Icon Sets"
Cohesion: 0.08
Nodes (23): AutumnMark(), EldritchMark(), GlyphProps, NavGlyphKey, HazardMark(), NavGlyph(), NavGlyphProps, NewspaperMark() (+15 more)

### Community 9 - "Organization API & Queries"
Cohesion: 0.09
Nodes (25): organizationApi, useAttachProject(), useCreateOrganization(), useDetachProject(), useInviteToOrganization(), useOrganizationRefresh(), useRemoveOrganizationMember(), useRevokeOrganizationInvitation() (+17 more)

### Community 10 - "Meeting & Room API"
Cohesion: 0.12
Nodes (32): meetingApi, meetingRoomApi, byStart(), invalidateAgenda(), invalidateInheritedRooms(), organizationKey(), projectKey(), removeMeeting() (+24 more)

### Community 11 - "Shared API Client"
Cohesion: 0.06
Nodes (35): axios, clsx, date-fns, @dnd-kit/modifiers, @dnd-kit/sortable, @dnd-kit/utilities, @hookform/resolvers, lucide-react (+27 more)

### Community 12 - "Task Views & Layout Store"
Cohesion: 0.10
Nodes (24): DEFAULTS, LAYOUTS_FOR, LayoutSurface, read(), Stored, TaskLayout, useTaskLayout(), write() (+16 more)

### Community 13 - "Uploads & Board Export"
Cohesion: 0.09
Nodes (28): BOARD_EXPORT_MIME, DOCUMENT_ACCEPT, DOCUMENT_MIME_TYPES, EXTENSION_MIME, IMPORT_ACCEPT, IMPORT_MIME_TYPES, MAX_DOCUMENT_BYTES, PresignedUpload (+20 more)

### Community 14 - "Task Groups Board UI"
Cohesion: 0.09
Nodes (20): byDeadline(), ColumnOverflow(), ColumnOverflowToggle(), useColumnCapacity(), COLUMNS, DraggableTask(), lockedHint(), TaskBoard() (+12 more)

### Community 15 - "Security Policy & CSP"
Cohesion: 0.07
Nodes (27): DOM, DOM.Iterable, src, vite/client, vite-plugin-pwa/client, compilerOptions, baseUrl, isolatedModules (+19 more)

### Community 16 - "App TS Config"
Cohesion: 0.10
Nodes (7): AuthScene(), DeskObject(), DeskObjectProps, floatTransition(), AuthShell(), AuthShellProps, Phase

### Community 17 - "Runtime Dependencies"
Cohesion: 0.09
Nodes (22): Badge(), BadgeProps, Collapsible(), CollapsibleProps, ColorPicker(), ColorPickerProps, EmptyState(), EmptyStateProps (+14 more)

### Community 18 - "Auth Desk Scene"
Cohesion: 0.19
Nodes (21): DATE_WINDOW_YEARS, dateInputBounds(), dateInputMax(), dateInputMin(), dateLocale(), dayInputMax(), dayInputMin(), formatDateTime() (+13 more)

### Community 19 - "Shared UI Primitives"
Cohesion: 0.13
Nodes (19): DocumentAccessDialog(), DocumentAccessDialogProps, DocumentDownloadMenu(), DownloadMenuProps, ICONS, saveBlob(), stem(), formatBadge() (+11 more)

### Community 20 - "Date Window Helpers"
Cohesion: 0.17
Nodes (16): documentApi, useAdoptDocument(), useCreateDocument(), useDeleteDocument(), useDocumentListCache(), useImportDocument(), useProjectDocumentsRealtime(), useSetDocumentEditors() (+8 more)

### Community 21 - "Text Board & Documents"
Cohesion: 0.17
Nodes (13): taskGroupApi, invalidateGroups(), orderKey, useCreateTaskGroup(), useDeleteTaskGroup(), useReorderTaskGroups(), useUpdateTaskGroup(), CreateTaskGroupPayload (+5 more)

### Community 22 - "Document API & Queries"
Cohesion: 0.12
Nodes (13): Button, buttonClasses(), ButtonProps, GAPS, Size, SIZES, Variant, VARIANTS (+5 more)

### Community 23 - "Task Group API & Model"
Cohesion: 0.11
Nodes (19): @dnd-kit/core, framer-motion, @dnd-kit/core, framer-motion, zustand, tailwindcss, 60fps Animation Rules, Layered Dependency Rule (app→pages→widgets→features→entities→shared) (+11 more)

### Community 24 - "Button, Modal & Boundary"
Cohesion: 0.11
Nodes (18): node, scripts/**/*.mjs, vite.config.ts, compilerOptions, allowSyntheticDefaultImports, isolatedModules, lib, module (+10 more)

### Community 25 - "Build TS Config"
Cohesion: 0.17
Nodes (10): aiApi, AiSuggestion, ProjectTaskSuggestion, SubtaskSuggestion, JobEvent, StreamStatus, useSuggestionStream(), AiPanel() (+2 more)

### Community 26 - "AI Suggestions"
Cohesion: 0.14
Nodes (13): MeetingComposer(), MeetingComposerProps, nextHour(), dayKey(), MeetingRow, MeetingRowProps, MeetingsPanel(), MeetingsPanelProps (+5 more)

### Community 27 - "Meetings, Composer & Rooms"
Cohesion: 0.19
Nodes (15): detectLocale(), LocaleState, substitute(), syncDocumentLang(), Translate, useLocale(), useLocaleStore, useT() (+7 more)

### Community 28 - "i18n Locale Strings"
Cohesion: 0.12
Nodes (17): autoprefixer, devDependencies, autoprefixer, postcss, @types/node, @types/react, @types/react-dom, typescript (+9 more)

### Community 29 - "Dev Dependencies"
Cohesion: 0.12
Nodes (16): RFC-5321, BOARD_INK_COLORS, CONNECTOR_COLORS, EDGE_REVEAL_PX, GROUP_COLUMNS_PER_PAGE, MAX_BOARD_PAGES, MAX_GROUPS_PER_PROJECT, MAX_TASK_NOTES (+8 more)

### Community 30 - "Task Config Constants"
Cohesion: 0.21
Nodes (14): useAddBoardStroke(), useBoardCache(), useBoardPages(), useClearBoard(), useClearBoardStrokes(), useCreateBoardNote(), useCreateNoteLink(), useDeleteBoardNote() (+6 more)

### Community 31 - "Project Creation & Import Dialogs"
Cohesion: 0.15
Nodes (10): BoardImportPanel(), BoardImportPanelProps, sourceFor(), CreateProjectDialogProps, Mode, GithubImportPanel(), GithubImportPanelProps, ProjectSettingsDialogProps (+2 more)

### Community 32 - "Icon Generation Script"
Cohesion: 0.16
Nodes (15): BRAND, BRAND_DEEP, chunk(), crc32(), crcTable, drawIcon(), encodePng(), FOLD (+7 more)

### Community 33 - "Floating Shortcuts Store"
Cohesion: 0.13
Nodes (16): base-uri 'self', Cloudflare R2 (bucket-specific hostname), connect-src 'self' https: wss:, Content-Security-Policy, contentEditable innerHTML + sanitiser (defense in depth), documentApi.sourceObjectUrl, form-action 'self', frame-ancestors 'none' (+8 more)

### Community 34 - "Eldritch & Runic Decor"
Cohesion: 0.13
Nodes (14): description, engines, node, name, private, scripts, build, dev (+6 more)

### Community 35 - "Notification API & Copy"
Cohesion: 0.23
Nodes (13): BoardPage, BoardSnapshot, BoardStroke, CreateBoardStrokePayload, CreateNoteLinkPayload, CreateNotePayload, ListNotesParams, NoteKind (+5 more)

### Community 36 - "Team API & Queries"
Cohesion: 0.24
Nodes (13): boardApi, useCreateProjectNote(), useCreateProjectNoteLink(), useDeleteProjectNote(), useDeleteProjectNoteLink(), useGroupProjectNotes(), usePatchProjectNotes(), usePatchProjectPositions() (+5 more)

### Community 37 - "Skin Catalogue & Preview"
Cohesion: 0.26
Nodes (12): clampToViewport(), FloatingShortcut, PILL, read(), ShortcutIcon, ShortcutsState, useFloatingShortcuts, write() (+4 more)

### Community 38 - "Edge Affordance & Nav Pin"
Cohesion: 0.16
Nodes (11): DirectionArrow(), DirectionArrowProps, EldritchTendrils(), EldritchTendrilsProps, GazeArrow(), GazeArrowProps, nextSighting(), Sighting (+3 more)

### Community 39 - "Architecture Notes (README)"
Cohesion: 0.21
Nodes (6): notificationApi, dropNotification(), useNotificationActions(), AppNotification, NotificationPayload, NotificationType

### Community 40 - "Auth Session Store"
Cohesion: 0.30
Nodes (11): teamApi, keyFor(), useCreateTeam(), useDeleteTeam(), useTeamRefresh(), useTeams(), useUpdateTeam(), CreateTeamPayload (+3 more)

### Community 41 - "Note Connector Layer"
Cohesion: 0.23
Nodes (9): SETTINGS_SKIN_LIMIT, SKIN_BY_VALUE, SKIN_CATALOG, SkinDefinition, SkinPreview, leaf(), notch(), SkinMock() (+1 more)

### Community 42 - "Board Gestures & Overlays"
Cohesion: 0.14
Nodes (13): CENTRE, EdgeAffordance(), EdgeAffordanceProps, GRADIENT, IRIS_GRADIENT, NavPinButton(), NavPinButtonProps, RAIL (+5 more)

### Community 43 - "Nav Preferences Store"
Cohesion: 0.21
Nodes (8): authApi, OAuthAvailability, OAuthProvider, SessionState, SessionStatus, useCurrentUser(), useSessionStore, SignOut

### Community 44 - "Task Filters"
Cohesion: 0.23
Nodes (9): Listener, Point, PositionBus, centreOf(), ConnectorLayer(), ConnectorLayerProps, curveBetween(), headTransform() (+1 more)

### Community 45 - "Activity API & Types"
Cohesion: 0.18
Nodes (4): MarqueeOptions, Rect, ConnectBannerProps, SelectionBarProps

### Community 46 - "CLI Panels & Commands"
Cohesion: 0.23
Nodes (11): DEFAULTS, NavEdge, NavPreferencesState, PinnedEdges, RailScope, read(), readRailScope(), StoredPreferences (+3 more)

### Community 47 - "Project Chat Dock"
Cohesion: 0.18
Nodes (9): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PROJECT_SCOPES, STATUS_SWATCH, STATUSES, TaskFiltersProps (+1 more)

### Community 48 - "Task Filter Controls"
Cohesion: 0.29
Nodes (5): activityApi, ActivityEntry, ActivityPage, ActivityType, RevertResult

### Community 49 - "CLI Docs Page & Content"
Cohesion: 0.25
Nodes (3): CLI_DOCS_URL, CliCommandList(), DocsLink()

### Community 50 - "HTML Sanitiser"
Cohesion: 0.22
Nodes (5): ChatDockState, PersistedDock, restored, useChatDock, write()

### Community 51 - "Admin API & Types"
Cohesion: 0.18
Nodes (9): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PROJECT_SCOPES, STATUS_SWATCH, STATUSES, TaskFiltersProps (+1 more)

### Community 52 - "Webhooks Panel"
Cohesion: 0.22
Nodes (7): DOCS, DocsCommand, DocsDocument, DocsGroup, DocsSection, en, ptBR

### Community 53 - "Query Cache Persistence"
Cohesion: 0.24
Nodes (9): ALLOWED_ATTRIBUTES, ALLOWED_STYLE_PROPERTIES, ALLOWED_TAGS, clean(), DISCARDED_TAGS, GLOBAL_ATTRIBUTES, isSafeUrl(), sanitizeDocumentHtml() (+1 more)

### Community 54 - "Autumn Skin Decor"
Cohesion: 0.20
Nodes (7): adoptServerNote(), CreateNoteRequest, geometryDiffers(), optimisticNote(), pendingNoteId(), PlaceholderContext, splitCreateRequest()

### Community 55 - "Chat & Whiteboard API"
Cohesion: 0.31
Nodes (8): adminApi, adminTokenStore, client, AdminReport, AdminSession, AdminStats, AdminUserRow, BanPayload

### Community 56 - "OAuth Sign-in Buttons"
Cohesion: 0.20
Nodes (7): ALL_EVENTS, ComposeRequest, EVENT_LABEL, FLAVOUR_LABEL, FLAVOUR_PLACEHOLDER, WebhookRowProps, WebhooksPanelProps

### Community 57 - "Roster & Reporting"
Cohesion: 0.31
Nodes (9): clearPersistedQueries(), hydrateQueryCache(), isPersistable(), PERSISTED_PREFIXES, PersistedBlob, PersistedEntry, persistQueryCache(), read() (+1 more)

### Community 58 - "Desktop Notifications"
Cohesion: 0.20
Nodes (7): AutumnFall(), AutumnHedge(), AutumnHedgeProps, FALLING, LeafProps, LeafTone, TONE_FILL

### Community 59 - "Import Tracker"
Cohesion: 0.22
Nodes (8): iOS standalone / viewport-fit=cover hints, <script type="module" src="/src/main.tsx">, <script src="/theme-init.js"> in index.html <head>, vite-plugin-pwa, /registerSW.js, script-src 'self', public/theme-init.js, vite-plugin-pwa

### Community 60 - "Package Metadata"
Cohesion: 0.28
Nodes (7): chatApi, whiteboardApi, ChatDelivery, ChatMessage, WhiteboardElement, WhiteboardElementType, WhiteboardStrokeData

### Community 61 - "Organization Dialog"
Cohesion: 0.25
Nodes (8): EditableField, markLocalNoteEdit(), mergeRemoteNote(), pending, PendingEdit, prune(), releaseLocalNoteEdit(), Note

### Community 62 - "Organization Members Panel"
Cohesion: 0.25
Nodes (6): ASSUME_BOTH, LABELS, MARKS, OAuthButtons(), OAuthButtonsProps, readRemembered()

### Community 63 - "Organization Projects Board"
Cohesion: 0.25
Nodes (5): ReportUserDialog(), ReportUserDialogProps, ASSIGNABLE_ROLES, ROLE_ICON, RosterPanelProps

### Community 64 - "Rich Text Editor"
Cohesion: 0.28
Nodes (4): DesktopNotice, isSupported(), NotificationAccess, requestNotificationAccess()

### Community 65 - "Task Detail & Note Checklist"
Cohesion: 0.31
Nodes (7): TrackerState, useImportTracker, ImportRow(), ImportRowProps, ImportTracker(), isLive(), STEP_LABEL

### Community 66 - "File Attachment Fields"
Cohesion: 0.29
Nodes (5): NoteAuthorStamp(), NoteAuthorStampProps, NoteHandle, PostIt, PostItProps

### Community 67 - "Project Changelog"
Cohesion: 0.25
Nodes (4): ASSIGNABLE_ROLES, InviteListProps, OrganizationDialogProps, ProjectPickerProps

### Community 68 - "Hidden Sidebar Nav"
Cohesion: 0.25
Nodes (4): ASSIGNABLE_ROLES, InviteFormProps, MemberRowProps, OrganizationMembersPanelProps

### Community 69 - "Motion & Drag Dependencies"
Cohesion: 0.29
Nodes (6): Lane, laneOf(), LANES, OrganizationProjectsBoard(), OrganizationProjectsBoardProps, ProjectCardProps

### Community 70 - "npm Scripts"
Cohesion: 0.25
Nodes (4): COLORS, PromptKind, RichTextEditorProps, SIZES

### Community 71 - "Shell Route Prefetch"
Cohesion: 0.29
Nodes (4): NoteCardProps, NoteChecklist(), NoteChecklistProps, TaskDetailModalProps

### Community 72 - "Teams Panel"
Cohesion: 0.32
Nodes (7): extensionOf(), FileAttachmentField(), FileAttachmentFieldProps, FileAttachmentRow(), FileAttachmentRowProps, formatFileSize(), Spinner()

### Community 73 - "Dashboard Page"
Cohesion: 0.29
Nodes (6): APPEARANCE, ChangelogRowProps, dayKey(), ProjectChangelog(), ProjectChangelogProps, SENTENCE

### Community 74 - "Shared React Hooks"
Cohesion: 0.29
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 75 - "Runic Transliteration"
Cohesion: 0.38
Nodes (4): AGENDA_PREFETCH, rememberedBoardPage(), useRouteIntentPrefetch(), useShellPrefetch()

### Community 76 - "Intent Prefetch"
Cohesion: 0.29
Nodes (3): TeamComposerProps, TeamRowProps, TeamsPanelProps

### Community 77 - "Hidden Sidebar Widget"
Cohesion: 0.33
Nodes (3): DashboardPage(), rankUpNext(), TONES

### Community 78 - "Vercel Deploy Config"
Cohesion: 0.38
Nodes (3): useIsDesktop(), useIsTouchDevice(), useMediaQuery()

### Community 79 - "Skin Picker"
Cohesion: 0.33
Nodes (5): DIGRAPHS, LETTERS, RuneToken, runeTokens(), toRunes()

### Community 80 - "Whiteboard Tools"
Cohesion: 0.38
Nodes (5): forget(), IntentHandlers, isSpeculationWelcome(), lastPrefetchedAt, useIntentPrefetch()

### Community 81 - "Document Byline"
Cohesion: 0.29
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 82 - "Connections Shelf"
Cohesion: 0.29
Nodes (6): buildCommand, framework, headers, outputDirectory, rewrites, $schema

### Community 83 - "Organization Dashboard"
Cohesion: 0.33
Nodes (3): SkinDefinition, SkinPreview, SKINS

### Community 84 - "Image Preparation"
Cohesion: 0.47
Nodes (5): isStroke(), readImageSize(), Tool, Whiteboard(), WhiteboardProps

### Community 85 - "Edge Reveal Hook"
Cohesion: 0.40
Nodes (4): DocumentByline(), DocumentBylineProps, DocumentCreatorStampProps, nameFor()

### Community 89 - "Project Rail Items"
Cohesion: 0.47
Nodes (5): encodeAt(), PreparedImage, prepareImage(), PrepareOptions, scaleToFit()

### Community 90 - "Invite Picker"
Cohesion: 0.33
Nodes (3): Edge, KeepOut, Options

### Community 91 - "Notes Board Toolbar"
Cohesion: 0.40
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 92 - "Desktop Notifications"
Cohesion: 0.47
Nodes (5): adoptStroke(), isStroke(), Tool, Whiteboard(), WhiteboardProps

### Community 94 - "Chat Pin UI"
Cohesion: 0.50
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 95 - "Repository Link Dialog"
Cohesion: 0.40
Nodes (3): InvitePickerProps, Person, Tab

### Community 96 - "Board Undo/Redo History"
Cohesion: 0.50
Nodes (4): BoardAction, BoardHistory, isTypingTarget(), useBoardHistory()

### Community 97 - "Notes Board Toolbar"
Cohesion: 0.40
Nodes (3): BoardTool, BoardToolbarProps, TOOLS

### Community 98 - "Personal Agenda Page"
Cohesion: 0.60
Nodes (3): deepLink(), NotificationBell(), NotificationOptIn()

### Community 102 - "Colour Helpers"
Cohesion: 0.40
Nodes (3): EMPTY_ROSTER, PRIORITIES, TaskComposerProps

### Community 103 - "Write-Order Race Guard"
Cohesion: 0.60
Nodes (3): CliAuthorizePage(), prettyCode(), RequestCard()

### Community 104 - "Runic Decor"
Cohesion: 0.50
Nodes (3): AgendaRowProps, dayKey(), MeetingsPage()

### Community 106 - "Layout Switcher"
Cohesion: 0.60
Nodes (3): AgendaSkeleton(), isSameDay(), TaskMenuPage()

### Community 107 - "Per-Skin Motion Curves"
Cohesion: 0.50
Nodes (4): apiUrl, env, resolveApiUrl(), stripTrailingSlash()

### Community 109 - "Document Plain Text"
Cohesion: 0.40
Nodes (3): chains, sequences, writeSequence

### Community 110 - "CLI Device Auth Client"
Cohesion: 0.50
Nodes (4): Mark, nextMark(), RuneScribe(), STAVES

### Community 111 - "Note Selection Logic"
Cohesion: 0.40
Nodes (4): PopupBox, Select(), SelectOption, SelectProps

### Community 114 - "Admin Console Page"
Cohesion: 0.50
Nodes (4): iOS/Safari PWA specifics, npm Scripts (dev/build/preview/typecheck/icons), vite-plugin-pwa / Workbox PWA setup, Vercel Deployment (vercel.json)

### Community 115 - "Invitations Page"
Cohesion: 0.67
Nodes (3): escapeText(), MAX_PLAIN_TEXT_CHARS, plainTextToHtml()

### Community 118 - "Project Workspace Page"
Cohesion: 0.67
Nodes (3): fitImage(), ImageDropOptions, useImageDrop()

### Community 119 - "Recycle Bin Page"
Cohesion: 0.67
Nodes (3): InkLayer(), InkLayerProps, toPath()

### Community 121 - "Skin Motion Tokens"
Cohesion: 0.67
Nodes (3): byNewest(), InvitationsPage(), UnifiedInvitation

### Community 125 - "Zoomable Image"
Cohesion: 0.67
Nodes (3): Bin, daysUntil(), RecycleBinPage()

### Community 129 - "Top Navigation Bar"
Cohesion: 0.67
Nodes (3): CardPressHandlers, isOwnedByInnerControl(), useCardPress()

### Community 130 - "Project Window Chip"
Cohesion: 0.67
Nodes (3): RunicText(), RunicTextProps, seedOf()

### Community 131 - "Pending Task Skeletons"
Cohesion: 0.67
Nodes (3): clamp(), ZoomableImage(), ZoomableImageProps

### Community 136 - "Tear-off Ghost"
Cohesion: 1.00
Nodes (3): Structural fix: httpOnly cookie on shared parent domain, Access/refresh tokens stored in localStorage, shared/api/token-store (token-store.ts)

## Knowledge Gaps
- **590 isolated node(s):** `name`, `private`, `version`, `type`, `description` (+585 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **47 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Shared API Client` to `Eldritch & Runic Decor`, `Task Group API & Model`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `i18n Locale Strings` to `Eldritch & Runic Decor`, `Import Tracker`, `Task Group API & Model`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Why does `Content-Security-Policy` connect `Floating Shortcuts Store` to `Tear-off Ghost`, `Import Tracker`, `Task Group API & Model`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _590 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Note & Board Sync` be split into smaller, more focused modules?**
  _Cohesion score 0.05160628844839371 - nodes in this community are weakly interconnected._
- **Should `Task API & Queries` be split into smaller, more focused modules?**
  _Cohesion score 0.05367231638418079 - nodes in this community are weakly interconnected._
- **Should `Landing Page Demos & Showcase` be split into smaller, more focused modules?**
  _Cohesion score 0.05084745762711865 - nodes in this community are weakly interconnected._