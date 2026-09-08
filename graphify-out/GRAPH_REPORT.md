# Graph Report - .  (2026-09-08)

## Corpus Check
- 32 files · ~333,375 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1948 nodes · 2611 edges · 190 communities (140 shown, 50 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 44 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Task API & Completion Rules
- Landing Page & Demo Board
- Edge Affordance & Nav Rail
- Project API & Queries
- Skin Decor & Hover Hint
- Archive & Document Access UI
- User API & Import MIME Rules
- Skin Icon Sets
- Document API & Queries
- Organization API & Queries
- Meeting & Room API
- Frontend Dependencies
- Task View Layout Store
- Task Board Columns
- Integration API (Figma, Calendar)
- TypeScript & Vite Config
- Auth Scene Desk Animation
- App Providers & Realtime Context
- Date Window Helpers
- Task Group API & Queries
- Button Component
- Architecture & Animation Conventions
- Node & Vite Tooling Config
- App Router & Page Registry
- AI Suggestions API
- Meeting Composer & Panel
- i18n Locale System
- Build Tooling Dependencies
- Shared Constants
- Calendar Integration Types
- Whiteboard Query Hooks
- Board Import & Create Project
- Icon Generation Script
- Content Security Policy Notes
- Package Manifest
- Note & Board API Types
- Project Board Notes Queries
- Floating Shortcuts Store
- Landing Integrations Strip
- API Client & Client ID
- Direction Arrow & Eldritch Decor
- Notification API & Copy
- Team API & Queries
- Theme Skin Catalog
- Edge Affordance Component
- Auth API & Session Store
- Whiteboard Connector Layer
- Board Gestures & Overlays
- Nav Preferences Store
- Task Filters
- Activity API & Queries
- CLI Commands UI
- Chat Dock Store
- Task Filters UI
- CLI Docs Content
- HTML Sanitiser Rules
- Optimistic Note Updates
- Admin API & Session
- Webhooks Panel UI
- Query Cache Persistence
- Autumn Skin Decor
- PWA Shell & Theme Init
- Chat & Whiteboard API Types
- Local Note Edit Tracking
- OAuth Sign-in Buttons
- Roster & Report User UI
- Client Error Reporting & Tokens
- Session Refresh & Socket Client
- Desktop Notifications Permission
- Import Tracker UI
- Post-it Note Component
- Organization Dialog & Invite
- Organization Members Panel
- Organization Projects Board
- Rich Text Editor
- Note Checklist & Task Detail
- API Warm-up on Intent
- Project Changelog UI
- Hidden Sidebar Nav
- App Layout & Shell Prefetch
- Webhooks API Types
- Teams Panel UI
- Dashboard Page
- Shared UI Hooks
- Runic Skin Text Helpers
- Intent Prefetch Hook
- File Attachment Field
- Hidden Sidebar Nav (UI)
- Vercel Deployment Config
- Skin Picker UI
- Whiteboard Component
- App Bootstrap & Router
- Document Byline Component
- Board Import API
- Note Recycle Bin Queries
- Connections Panel UI
- Organization Dashboard
- Image Preparation Utility
- Edge Reveal Hook
- Avatar Component
- Input & Textarea Components
- Project Rail Nav
- Whiteboard Component (UI)
- Chat Pin Component
- Project Rail Nav (UI)
- Invite Picker UI
- Board Undo History
- Board Toolbar UI
- Notification Bell & Opt-in
- Organization Banner UI
- Chat Pin Component (UI)
- Figma Link Dialog
- Repository Link Dialog
- Task Composer UI
- CLI Authorize Page
- Meetings Page
- Organization Page
- Task Menu Page
- Environment Config
- Write Order Sequencing
- Expandable Stage Component
- Runic Skin Decor
- Layout Switcher UI
- Skin Motion Hook
- PWA & Deployment Notes
- Plain Text to HTML
- API Tokens API
- CLI Device Auth API
- Board Selection Helpers
- Image Drop Hook
- Whiteboard Ink Layer
- Admin Page
- Invitations Page
- Notes Board Page
- Organizations Page
- Project Page & Tabs
- Recycle Bin Page
- Theme Gallery Page
- Skin Motion Hook (lib)
- Card Press Hook
- Runic Text Component
- Zoomable Image Viewer
- Task Type Tag
- Settings Page
- Top Navigation
- Auth Token Storage Notes
- GitHub API
- Project Window Chip
- Pending Tasks Widget
- API Tokens Panel
- Calendar Connection Panel
- Tear-off Shortcut Hook
- Tear-off Ghost Component
- Language Toggle
- Board Pager UI
- Board Loading Skeleton
- Settings Page (UI)
- Project Chat Widget
- Top Navigation (UI)
- TypeScript Project References
- Vite CSP Config
- PWA App Icon
- Hidden Edge Menus Design
- Query Keys Registry
- App Icon Mark
- Favicon Mark
- App Icon 192x192
- App Icon Mark 512x512
- CSS Theme Variables
- Cache-Control Headers
- Permissions-Policy Header
- Referrer-Policy Header
- X-Content-Type-Options Header

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `Content-Security-Policy` - 14 edges
3. `useBoardCache()` - 14 edges
4. `compilerOptions` - 13 edges
5. `useProjectBoardCache()` - 12 edges
6. `toDate()` - 10 edges
7. `useDocumentListCache()` - 10 edges
8. `Task Studio README` - 9 edges
9. `useOrganizationRefresh()` - 9 edges
10. `Task` - 9 edges

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

## Communities (190 total, 50 thin omitted)

### Community 0 - "Task API & Completion Rules"
Cohesion: 0.05
Nodes (62): taskApi, blockingAssigneeCount(), canCompleteTask(), completionBlockedReason(), CompletionContext, completionProgress(), isSharedTask(), outstandingAssignees() (+54 more)

### Community 1 - "Landing Page & Demo Board"
Cohesion: 0.06
Nodes (36): COLUMNS, DemoBoard(), LANES, RESIDENTS, DemoChat(), MESSAGES, DemoFrame(), DemoFrameProps (+28 more)

### Community 2 - "Edge Affordance & Nav Rail"
Cohesion: 0.06
Nodes (33): CENTRE, EdgeAffordance(), EdgeAffordanceProps, GRADIENT, NavPinButton(), NavPinButtonProps, RAIL, RAIL_TONE (+25 more)

### Community 3 - "Project API & Queries"
Cohesion: 0.06
Nodes (24): ListProjectsParams, projectApi, patchProjectPinned(), patchRosterRemoval(), seedProjectFrom(), useProject(), useProjectIntentPrefetch(), useRemoveMember() (+16 more)

### Community 4 - "Skin Decor & Hover Hint"
Cohesion: 0.06
Nodes (38): GoogleCalendarMark(), HazardDrift(), MOTES, HoverHint(), HoverHintProps, NibCursor(), NibPreview(), Badge() (+30 more)

### Community 5 - "Archive & Document Access UI"
Cohesion: 0.06
Nodes (38): ArchiveDocument(), ArchiveDocumentProps, depthOf(), leafOf(), DocumentAccessDialog(), DocumentAccessDialogProps, DocumentDownloadMenu(), DownloadMenuProps (+30 more)

### Community 6 - "User API & Import MIME Rules"
Cohesion: 0.06
Nodes (39): BOARD_EXPORT_MIME, classifyImportFile(), DOCUMENT_ACCEPT, DOCUMENT_MIME_TYPES, EXTENSION_MIME, IMPORT_ACCEPT, IMPORT_ARCHIVE_MIME, IMPORT_DOCUMENT_MIME (+31 more)

### Community 7 - "Skin Icon Sets"
Cohesion: 0.08
Nodes (23): AutumnMark(), EldritchMark(), GlyphProps, NavGlyphKey, HazardMark(), NavGlyph(), NavGlyphProps, NewspaperMark() (+15 more)

### Community 8 - "Document API & Queries"
Cohesion: 0.09
Nodes (28): documentApi, useAdoptDocument(), useCreateDocument(), useCreateFigmaPage(), useDeleteDocument(), useDocumentListCache(), useImportDocument(), useProjectDocumentsRealtime() (+20 more)

### Community 9 - "Organization API & Queries"
Cohesion: 0.09
Nodes (25): organizationApi, useAttachProject(), useCreateOrganization(), useDetachProject(), useInviteToOrganization(), useOrganizationRefresh(), useRemoveOrganizationMember(), useRevokeOrganizationInvitation() (+17 more)

### Community 10 - "Meeting & Room API"
Cohesion: 0.12
Nodes (32): meetingApi, meetingRoomApi, byStart(), invalidateAgenda(), invalidateInheritedRooms(), organizationKey(), projectKey(), removeMeeting() (+24 more)

### Community 11 - "Frontend Dependencies"
Cohesion: 0.06
Nodes (35): axios, clsx, date-fns, @dnd-kit/modifiers, @dnd-kit/sortable, @dnd-kit/utilities, @hookform/resolvers, lucide-react (+27 more)

### Community 12 - "Task View Layout Store"
Cohesion: 0.10
Nodes (24): DEFAULTS, LAYOUTS_FOR, LayoutSurface, read(), Stored, TaskLayout, useTaskLayout(), write() (+16 more)

### Community 13 - "Task Board Columns"
Cohesion: 0.09
Nodes (20): byDeadline(), ColumnOverflow(), ColumnOverflowToggle(), useColumnCapacity(), COLUMNS, DraggableTask(), lockedHint(), TaskBoard() (+12 more)

### Community 15 - "TypeScript & Vite Config"
Cohesion: 0.07
Nodes (27): DOM, DOM.Iterable, src, vite/client, vite-plugin-pwa/client, compilerOptions, baseUrl, isolatedModules (+19 more)

### Community 16 - "Auth Scene Desk Animation"
Cohesion: 0.10
Nodes (7): AuthScene(), DeskObject(), DeskObjectProps, floatTransition(), AuthShell(), AuthShellProps, Phase

### Community 17 - "App Providers & Realtime Context"
Cohesion: 0.11
Nodes (18): QueryProvider(), NOTIFICATION_TOAST, RealtimeContext, RealtimeContextValue, RealtimeMeta, RealtimeProvider(), roomHolders, useProjectRoom() (+10 more)

### Community 18 - "Date Window Helpers"
Cohesion: 0.19
Nodes (21): DATE_WINDOW_YEARS, dateInputBounds(), dateInputMax(), dateInputMin(), dateLocale(), dayInputMax(), dayInputMin(), formatDateTime() (+13 more)

### Community 19 - "Task Group API & Queries"
Cohesion: 0.17
Nodes (13): taskGroupApi, invalidateGroups(), orderKey, useCreateTaskGroup(), useDeleteTaskGroup(), useReorderTaskGroups(), useUpdateTaskGroup(), CreateTaskGroupPayload (+5 more)

### Community 20 - "Button Component"
Cohesion: 0.12
Nodes (13): Button, buttonClasses(), ButtonProps, GAPS, Size, SIZES, Variant, VARIANTS (+5 more)

### Community 21 - "Architecture & Animation Conventions"
Cohesion: 0.11
Nodes (19): @dnd-kit/core, framer-motion, @dnd-kit/core, framer-motion, zustand, tailwindcss, 60fps Animation Rules, Layered Dependency Rule (app→pages→widgets→features→entities→shared) (+11 more)

### Community 22 - "Node & Vite Tooling Config"
Cohesion: 0.11
Nodes (18): node, scripts/**/*.mjs, vite.config.ts, compilerOptions, allowSyntheticDefaultImports, isolatedModules, lib, module (+10 more)

### Community 23 - "App Router & Page Registry"
Cohesion: 0.12
Nodes (17): AdminPage, CliAuthorizePage, DashboardPage, DocsPage, InvitationsPage, LandingPage, MeetingsPage, NotesBoardPage (+9 more)

### Community 24 - "AI Suggestions API"
Cohesion: 0.17
Nodes (10): aiApi, AiSuggestion, ProjectTaskSuggestion, SubtaskSuggestion, JobEvent, StreamStatus, useSuggestionStream(), AiPanel() (+2 more)

### Community 25 - "Meeting Composer & Panel"
Cohesion: 0.14
Nodes (13): MeetingComposer(), MeetingComposerProps, nextHour(), dayKey(), MeetingRow, MeetingRowProps, MeetingsPanel(), MeetingsPanelProps (+5 more)

### Community 26 - "i18n Locale System"
Cohesion: 0.19
Nodes (15): detectLocale(), LocaleState, substitute(), syncDocumentLang(), Translate, useLocale(), useLocaleStore, useT() (+7 more)

### Community 27 - "Build Tooling Dependencies"
Cohesion: 0.12
Nodes (17): autoprefixer, devDependencies, autoprefixer, postcss, @types/node, @types/react, @types/react-dom, typescript (+9 more)

### Community 28 - "Shared Constants"
Cohesion: 0.12
Nodes (16): RFC-5321, BOARD_INK_COLORS, CONNECTOR_COLORS, EDGE_REVEAL_PX, GROUP_COLUMNS_PER_PAGE, MAX_BOARD_PAGES, MAX_GROUPS_PER_PROJECT, MAX_TASK_NOTES (+8 more)

### Community 29 - "Calendar Integration Types"
Cohesion: 0.17
Nodes (15): calendarApi, BoardImportSource, CalendarConnection, CalendarFeedSecret, CalendarFeedStatus, CalendarSettingsPayload, CalendarStatus, CalendarSyncResult (+7 more)

### Community 30 - "Whiteboard Query Hooks"
Cohesion: 0.21
Nodes (14): useAddBoardStroke(), useBoardCache(), useBoardPages(), useClearBoard(), useClearBoardStrokes(), useCreateBoardNote(), useCreateNoteLink(), useDeleteBoardNote() (+6 more)

### Community 31 - "Board Import & Create Project"
Cohesion: 0.15
Nodes (10): BoardImportPanel(), BoardImportPanelProps, sourceFor(), CreateProjectDialogProps, Mode, GithubImportPanel(), GithubImportPanelProps, ProjectSettingsDialogProps (+2 more)

### Community 32 - "Icon Generation Script"
Cohesion: 0.16
Nodes (15): BRAND, BRAND_DEEP, chunk(), crc32(), crcTable, drawIcon(), encodePng(), FOLD (+7 more)

### Community 33 - "Content Security Policy Notes"
Cohesion: 0.13
Nodes (16): base-uri 'self', Cloudflare R2 (bucket-specific hostname), connect-src 'self' https: wss:, Content-Security-Policy, contentEditable innerHTML + sanitiser (defense in depth), documentApi.sourceObjectUrl, form-action 'self', frame-ancestors 'none' (+8 more)

### Community 34 - "Package Manifest"
Cohesion: 0.13
Nodes (14): description, engines, node, name, private, scripts, build, dev (+6 more)

### Community 35 - "Note & Board API Types"
Cohesion: 0.23
Nodes (13): BoardPage, BoardSnapshot, BoardStroke, CreateBoardStrokePayload, CreateNoteLinkPayload, CreateNotePayload, ListNotesParams, NoteKind (+5 more)

### Community 36 - "Project Board Notes Queries"
Cohesion: 0.24
Nodes (13): boardApi, useCreateProjectNote(), useCreateProjectNoteLink(), useDeleteProjectNote(), useDeleteProjectNoteLink(), useGroupProjectNotes(), usePatchProjectNotes(), usePatchProjectPositions() (+5 more)

### Community 37 - "Floating Shortcuts Store"
Cohesion: 0.26
Nodes (12): clampToViewport(), FloatingShortcut, PILL, read(), ShortcutIcon, ShortcutsState, useFloatingShortcuts, write() (+4 more)

### Community 38 - "Landing Integrations Strip"
Cohesion: 0.19
Nodes (12): IntegrationsStrip(), Service, SERVICES, DiscordMark(), ExportMark(), FeedMark(), FigmaMark(), GitHubMark() (+4 more)

### Community 39 - "API Client & Client ID"
Cohesion: 0.15
Nodes (6): CLIENT_ID, CLIENT_ID_HEADER, RetriableConfig, sessionExpiredHandlers, SIGN_IN_PATHS, SLOW_ROUTE_TIMEOUT_MS

### Community 40 - "Direction Arrow & Eldritch Decor"
Cohesion: 0.16
Nodes (11): DirectionArrow(), DirectionArrowProps, EldritchTendrils(), EldritchTendrilsProps, GazeArrow(), GazeArrowProps, nextSighting(), Sighting (+3 more)

### Community 41 - "Notification API & Copy"
Cohesion: 0.21
Nodes (6): notificationApi, dropNotification(), useNotificationActions(), AppNotification, NotificationPayload, NotificationType

### Community 42 - "Team API & Queries"
Cohesion: 0.30
Nodes (11): teamApi, keyFor(), useCreateTeam(), useDeleteTeam(), useTeamRefresh(), useTeams(), useUpdateTeam(), CreateTeamPayload (+3 more)

### Community 43 - "Theme Skin Catalog"
Cohesion: 0.23
Nodes (9): SETTINGS_SKIN_LIMIT, SKIN_BY_VALUE, SKIN_CATALOG, SkinDefinition, SkinPreview, leaf(), notch(), SkinMock() (+1 more)

### Community 44 - "Edge Affordance Component"
Cohesion: 0.14
Nodes (13): CENTRE, EdgeAffordance(), EdgeAffordanceProps, GRADIENT, IRIS_GRADIENT, NavPinButton(), NavPinButtonProps, RAIL (+5 more)

### Community 45 - "Auth API & Session Store"
Cohesion: 0.21
Nodes (8): authApi, OAuthAvailability, OAuthProvider, SessionState, SessionStatus, useCurrentUser(), useSessionStore, SignOut

### Community 46 - "Whiteboard Connector Layer"
Cohesion: 0.23
Nodes (9): Listener, Point, PositionBus, centreOf(), ConnectorLayer(), ConnectorLayerProps, curveBetween(), headTransform() (+1 more)

### Community 47 - "Board Gestures & Overlays"
Cohesion: 0.18
Nodes (4): MarqueeOptions, Rect, ConnectBannerProps, SelectionBarProps

### Community 48 - "Nav Preferences Store"
Cohesion: 0.23
Nodes (11): DEFAULTS, NavEdge, NavPreferencesState, PinnedEdges, RailScope, read(), readRailScope(), StoredPreferences (+3 more)

### Community 49 - "Task Filters"
Cohesion: 0.18
Nodes (9): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PROJECT_SCOPES, STATUS_SWATCH, STATUSES, TaskFiltersProps (+1 more)

### Community 50 - "Activity API & Queries"
Cohesion: 0.29
Nodes (5): activityApi, ActivityEntry, ActivityPage, ActivityType, RevertResult

### Community 51 - "CLI Commands UI"
Cohesion: 0.25
Nodes (3): CLI_DOCS_URL, CliCommandList(), DocsLink()

### Community 52 - "Chat Dock Store"
Cohesion: 0.22
Nodes (5): ChatDockState, PersistedDock, restored, useChatDock, write()

### Community 53 - "Task Filters UI"
Cohesion: 0.18
Nodes (9): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PROJECT_SCOPES, STATUS_SWATCH, STATUSES, TaskFiltersProps (+1 more)

### Community 54 - "CLI Docs Content"
Cohesion: 0.22
Nodes (7): DOCS, DocsCommand, DocsDocument, DocsGroup, DocsSection, en, ptBR

### Community 55 - "HTML Sanitiser Rules"
Cohesion: 0.24
Nodes (9): ALLOWED_ATTRIBUTES, ALLOWED_STYLE_PROPERTIES, ALLOWED_TAGS, clean(), DISCARDED_TAGS, GLOBAL_ATTRIBUTES, isSafeUrl(), sanitizeDocumentHtml() (+1 more)

### Community 56 - "Optimistic Note Updates"
Cohesion: 0.20
Nodes (7): adoptServerNote(), CreateNoteRequest, geometryDiffers(), optimisticNote(), pendingNoteId(), PlaceholderContext, splitCreateRequest()

### Community 57 - "Admin API & Session"
Cohesion: 0.31
Nodes (8): adminApi, adminTokenStore, client, AdminReport, AdminSession, AdminStats, AdminUserRow, BanPayload

### Community 58 - "Webhooks Panel UI"
Cohesion: 0.20
Nodes (7): ALL_EVENTS, ComposeRequest, EVENT_LABEL, FLAVOUR_LABEL, FLAVOUR_PLACEHOLDER, WebhookRowProps, WebhooksPanelProps

### Community 59 - "Query Cache Persistence"
Cohesion: 0.31
Nodes (9): clearPersistedQueries(), hydrateQueryCache(), isPersistable(), PERSISTED_PREFIXES, PersistedBlob, PersistedEntry, persistQueryCache(), read() (+1 more)

### Community 60 - "Autumn Skin Decor"
Cohesion: 0.20
Nodes (7): AutumnFall(), AutumnHedge(), AutumnHedgeProps, FALLING, LeafProps, LeafTone, TONE_FILL

### Community 61 - "PWA Shell & Theme Init"
Cohesion: 0.22
Nodes (8): iOS standalone / viewport-fit=cover hints, <script type="module" src="/src/main.tsx">, <script src="/theme-init.js"> in index.html <head>, vite-plugin-pwa, /registerSW.js, script-src 'self', public/theme-init.js, vite-plugin-pwa

### Community 62 - "Chat & Whiteboard API Types"
Cohesion: 0.28
Nodes (7): chatApi, whiteboardApi, ChatDelivery, ChatMessage, WhiteboardElement, WhiteboardElementType, WhiteboardStrokeData

### Community 63 - "Local Note Edit Tracking"
Cohesion: 0.25
Nodes (8): EditableField, markLocalNoteEdit(), mergeRemoteNote(), pending, PendingEdit, prune(), releaseLocalNoteEdit(), Note

### Community 64 - "OAuth Sign-in Buttons"
Cohesion: 0.25
Nodes (6): ASSUME_BOTH, LABELS, MARKS, OAuthButtons(), OAuthButtonsProps, readRemembered()

### Community 65 - "Roster & Report User UI"
Cohesion: 0.25
Nodes (5): ReportUserDialog(), ReportUserDialogProps, ASSIGNABLE_ROLES, ROLE_ICON, RosterPanelProps

### Community 66 - "Client Error Reporting & Tokens"
Cohesion: 0.28
Nodes (5): api, clip(), LIMITS, reportClientError(), tokenStore

### Community 67 - "Session Refresh & Socket Client"
Cohesion: 0.33
Nodes (6): refreshAccessToken(), refreshSession(), connectSocket(), emitWithAck(), getSocket(), reviveSocket()

### Community 68 - "Desktop Notifications Permission"
Cohesion: 0.28
Nodes (4): DesktopNotice, isSupported(), NotificationAccess, requestNotificationAccess()

### Community 69 - "Import Tracker UI"
Cohesion: 0.31
Nodes (7): TrackerState, useImportTracker, ImportRow(), ImportRowProps, ImportTracker(), isLive(), STEP_LABEL

### Community 70 - "Post-it Note Component"
Cohesion: 0.29
Nodes (5): NoteAuthorStamp(), NoteAuthorStampProps, NoteHandle, PostIt, PostItProps

### Community 71 - "Organization Dialog & Invite"
Cohesion: 0.25
Nodes (4): ASSIGNABLE_ROLES, InviteListProps, OrganizationDialogProps, ProjectPickerProps

### Community 72 - "Organization Members Panel"
Cohesion: 0.25
Nodes (4): ASSIGNABLE_ROLES, InviteFormProps, MemberRowProps, OrganizationMembersPanelProps

### Community 73 - "Organization Projects Board"
Cohesion: 0.29
Nodes (6): Lane, laneOf(), LANES, OrganizationProjectsBoard(), OrganizationProjectsBoardProps, ProjectCardProps

### Community 74 - "Rich Text Editor"
Cohesion: 0.25
Nodes (4): COLORS, PromptKind, RichTextEditorProps, SIZES

### Community 75 - "Note Checklist & Task Detail"
Cohesion: 0.29
Nodes (4): NoteCardProps, NoteChecklist(), NoteChecklistProps, TaskDetailModalProps

### Community 76 - "API Warm-up on Intent"
Cohesion: 0.43
Nodes (7): apiIsWarm(), ensureApiAwake(), isApiWarm(), wakeApi(), installApiWarmOnIntent(), isTextEntry(), maybeWake()

### Community 77 - "Project Changelog UI"
Cohesion: 0.29
Nodes (6): APPEARANCE, ChangelogRowProps, dayKey(), ProjectChangelog(), ProjectChangelogProps, SENTENCE

### Community 78 - "Hidden Sidebar Nav"
Cohesion: 0.29
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 79 - "App Layout & Shell Prefetch"
Cohesion: 0.38
Nodes (4): AGENDA_PREFETCH, rememberedBoardPage(), useRouteIntentPrefetch(), useShellPrefetch()

### Community 80 - "Webhooks API Types"
Cohesion: 0.33
Nodes (6): webhooksApi, CreatedWebhook, ProjectWebhook, WebhookEvent, WebhookPayloadDraft, WebhookTestResult

### Community 81 - "Teams Panel UI"
Cohesion: 0.29
Nodes (3): TeamComposerProps, TeamRowProps, TeamsPanelProps

### Community 82 - "Dashboard Page"
Cohesion: 0.33
Nodes (3): DashboardPage(), rankUpNext(), TONES

### Community 83 - "Shared UI Hooks"
Cohesion: 0.38
Nodes (3): useIsDesktop(), useIsTouchDevice(), useMediaQuery()

### Community 84 - "Runic Skin Text Helpers"
Cohesion: 0.33
Nodes (5): DIGRAPHS, LETTERS, RuneToken, runeTokens(), toRunes()

### Community 85 - "Intent Prefetch Hook"
Cohesion: 0.38
Nodes (5): forget(), IntentHandlers, isSpeculationWelcome(), lastPrefetchedAt, useIntentPrefetch()

### Community 86 - "File Attachment Field"
Cohesion: 0.38
Nodes (6): extensionOf(), FileAttachmentField(), FileAttachmentFieldProps, FileAttachmentRow(), FileAttachmentRowProps, formatFileSize()

### Community 87 - "Hidden Sidebar Nav (UI)"
Cohesion: 0.29
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 88 - "Vercel Deployment Config"
Cohesion: 0.29
Nodes (6): buildCommand, framework, headers, outputDirectory, rewrites, $schema

### Community 89 - "Skin Picker UI"
Cohesion: 0.33
Nodes (3): SkinDefinition, SkinPreview, SKINS

### Community 90 - "Whiteboard Component"
Cohesion: 0.47
Nodes (5): isStroke(), readImageSize(), Tool, Whiteboard(), WhiteboardProps

### Community 91 - "App Bootstrap & Router"
Cohesion: 0.40
Nodes (4): App(), AppProviders(), AppRouter(), container

### Community 92 - "Document Byline Component"
Cohesion: 0.40
Nodes (4): DocumentByline(), DocumentBylineProps, DocumentCreatorStampProps, nameFor()

### Community 93 - "Board Import API"
Cohesion: 0.40
Nodes (5): importsApi, BoardImportPayload, CancelImportResult, RepositoryImportJob, RepositoryImportPayload

### Community 97 - "Image Preparation Utility"
Cohesion: 0.47
Nodes (5): encodeAt(), PreparedImage, prepareImage(), PrepareOptions, scaleToFit()

### Community 98 - "Edge Reveal Hook"
Cohesion: 0.33
Nodes (3): Edge, KeepOut, Options

### Community 99 - "Avatar Component"
Cohesion: 0.33
Nodes (5): Avatar(), AvatarProps, AvatarStack(), AvatarStackProps, SIZES

### Community 100 - "Input & Textarea Components"
Cohesion: 0.33
Nodes (5): FieldShellProps, Input, InputProps, Textarea, TextareaProps

### Community 101 - "Project Rail Nav"
Cohesion: 0.40
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 102 - "Whiteboard Component (UI)"
Cohesion: 0.47
Nodes (5): adoptStroke(), isStroke(), Tool, Whiteboard(), WhiteboardProps

### Community 104 - "Project Rail Nav (UI)"
Cohesion: 0.50
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 105 - "Invite Picker UI"
Cohesion: 0.40
Nodes (3): InvitePickerProps, Person, Tab

### Community 106 - "Board Undo History"
Cohesion: 0.50
Nodes (4): BoardAction, BoardHistory, isTypingTarget(), useBoardHistory()

### Community 107 - "Board Toolbar UI"
Cohesion: 0.40
Nodes (3): BoardTool, BoardToolbarProps, TOOLS

### Community 108 - "Notification Bell & Opt-in"
Cohesion: 0.60
Nodes (3): deepLink(), NotificationBell(), NotificationOptIn()

### Community 113 - "Task Composer UI"
Cohesion: 0.40
Nodes (3): EMPTY_ROSTER, PRIORITIES, TaskComposerProps

### Community 114 - "CLI Authorize Page"
Cohesion: 0.60
Nodes (3): CliAuthorizePage(), prettyCode(), RequestCard()

### Community 115 - "Meetings Page"
Cohesion: 0.50
Nodes (3): AgendaRowProps, dayKey(), MeetingsPage()

### Community 117 - "Task Menu Page"
Cohesion: 0.60
Nodes (3): AgendaSkeleton(), isSameDay(), TaskMenuPage()

### Community 118 - "Environment Config"
Cohesion: 0.50
Nodes (4): apiUrl, env, resolveApiUrl(), stripTrailingSlash()

### Community 120 - "Write Order Sequencing"
Cohesion: 0.40
Nodes (3): chains, sequences, writeSequence

### Community 121 - "Expandable Stage Component"
Cohesion: 0.40
Nodes (4): ExpandableStage(), ExpandableStageProps, ExpandToggle(), ExpandToggleProps

### Community 122 - "Runic Skin Decor"
Cohesion: 0.50
Nodes (4): Mark, nextMark(), RuneScribe(), STAVES

### Community 125 - "PWA & Deployment Notes"
Cohesion: 0.50
Nodes (4): iOS/Safari PWA specifics, npm Scripts (dev/build/preview/typecheck/icons), vite-plugin-pwa / Workbox PWA setup, Vercel Deployment (vercel.json)

### Community 126 - "Plain Text to HTML"
Cohesion: 0.67
Nodes (3): escapeText(), MAX_PLAIN_TEXT_CHARS, plainTextToHtml()

### Community 127 - "API Tokens API"
Cohesion: 0.50
Nodes (3): tokensApi, ApiToken, CreatedApiToken

### Community 130 - "Image Drop Hook"
Cohesion: 0.67
Nodes (3): fitImage(), ImageDropOptions, useImageDrop()

### Community 131 - "Whiteboard Ink Layer"
Cohesion: 0.67
Nodes (3): InkLayer(), InkLayerProps, toPath()

### Community 133 - "Invitations Page"
Cohesion: 0.67
Nodes (3): byNewest(), InvitationsPage(), UnifiedInvitation

### Community 137 - "Recycle Bin Page"
Cohesion: 0.67
Nodes (3): Bin, daysUntil(), RecycleBinPage()

### Community 141 - "Card Press Hook"
Cohesion: 0.67
Nodes (3): CardPressHandlers, isOwnedByInnerControl(), useCardPress()

### Community 142 - "Runic Text Component"
Cohesion: 0.67
Nodes (3): RunicText(), RunicTextProps, seedOf()

### Community 143 - "Zoomable Image Viewer"
Cohesion: 0.67
Nodes (3): clamp(), ZoomableImage(), ZoomableImageProps

### Community 148 - "Auth Token Storage Notes"
Cohesion: 1.00
Nodes (3): Structural fix: httpOnly cookie on shared parent domain, Access/refresh tokens stored in localStorage, shared/api/token-store (token-store.ts)

## Knowledge Gaps
- **612 isolated node(s):** `name`, `private`, `version`, `type`, `description` (+607 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **50 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Frontend Dependencies` to `Package Manifest`, `Architecture & Animation Conventions`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Build Tooling Dependencies` to `Package Manifest`, `PWA Shell & Theme Init`, `Architecture & Animation Conventions`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Why does `Content-Security-Policy` connect `Content Security Policy Notes` to `Architecture & Animation Conventions`, `Auth Token Storage Notes`, `PWA Shell & Theme Init`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _612 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Task API & Completion Rules` be split into smaller, more focused modules?**
  _Cohesion score 0.05160628844839371 - nodes in this community are weakly interconnected._
- **Should `Landing Page & Demo Board` be split into smaller, more focused modules?**
  _Cohesion score 0.05660377358490566 - nodes in this community are weakly interconnected._
- **Should `Edge Affordance & Nav Rail` be split into smaller, more focused modules?**
  _Cohesion score 0.05551020408163265 - nodes in this community are weakly interconnected._