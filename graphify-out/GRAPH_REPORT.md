# Graph Report - C:/Users/jorda/OneDrive/Documentos/GitHub/Task-Studio/Task-Studio-UI  (2026-09-01)

## Corpus Check
- 32 files · ~282,892 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1809 nodes · 2447 edges · 172 communities (121 shown, 51 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 43 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Note & Board Sync
- Task API & Queries
- Integration Clients (GitHub/Calendar/Webhooks)
- Space Skin Icons
- App Providers, Router & Theme
- Project API & Queries
- Shared UI Primitives
- Skin Icon Sets
- Organization API & Queries
- Meeting & Room API
- Shared API Client
- Task Views & Layout Store
- Uploads & Board Export
- Landing Page Demos
- Security Policy & CSP
- App TS Config
- Runtime Dependencies
- Auth Desk Scene
- Date Window Helpers
- Text Board & Documents
- Document API & Queries
- Task Group API & Model
- Button, Modal & Boundary
- Build TS Config
- Task Groups Board UI
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
- Desktop Notifications
- Skin Catalogue & Preview
- Edge Affordance & Nav Pin
- Service Brand Marks
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
- HTML Sanitiser
- Admin API & Types
- Webhooks Panel
- Query Cache Persistence
- Autumn Skin Decor
- Chat & Whiteboard API
- OAuth Sign-in Buttons
- Roster & Reporting
- Import Tracker
- Package Metadata
- Organization Dialog
- Organization Members Panel
- Organization Projects Board
- Rich Text Editor
- Task Detail & Note Checklist
- Project Changelog
- Hidden Sidebar Nav
- Motion & Drag Dependencies
- npm Scripts
- Shell Route Prefetch
- Status Task Board (DnD)
- Teams Panel
- Dashboard Page
- Shared React Hooks
- Runic Transliteration
- Intent Prefetch
- File Attachment Fields
- Hidden Sidebar Widget
- Vercel Deploy Config
- Skin Picker
- Whiteboard Tools
- Document Byline
- Connections Shelf
- Organization Dashboard
- Image Preparation
- Edge Reveal Hook
- Avatar & Avatar Stack
- Input & Textarea
- Project Rail Widget
- Whiteboard Widget
- Chat Pin Tack
- Project Rail Items
- Invite Picker
- Notes Board Toolbar
- Organization Banner
- Chat Pin UI
- Repository Link Dialog
- Task Composer
- CLI Device Approval Page
- Personal Agenda Page
- Organization Page
- Task Menu Page
- Build Environment Config
- Expandable Stage
- Runic Decor
- Layout Switcher
- Per-Skin Motion Curves
- PWA & Deployment Notes
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
- Runic Text Rendering
- Zoomable Image
- Task Type Tag
- Settings Theme Options
- Top Navigation Bar
- Project Window Chip
- Pending Task Skeletons
- API Tokens Panel
- Calendar Connection Panel
- Shortcut Tear-off
- Tear-off Ghost
- Language Toggle
- Notes Board Pager
- Notes Board Skeleton
- Settings Page
- Card Press Gesture
- Project Chat Widget
- Top Navigation Widget
- Root TS Config
- Vite Build & CSP
- dnd-kit Sortable (dependency)
- dnd-kit Utilities (dependency)
- React DOM (dependency)
- Socket.IO Client (dependency)
- Maskable App Icon
- Hidden Edge Menus
- Query Key Registry
- Apple Touch Icon
- Favicon Mark
- App Icon 192
- App Icon 512
- CSS Variable Theme System
- Asset Cache Headers
- Permissions Policy
- Referrer Policy
- Content Type Options

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

## Communities (172 total, 51 thin omitted)

### Community 0 - "Note & Board Sync"
Cohesion: 0.06
Nodes (59): boardApi, noteApi, EditableField, markLocalNoteEdit(), mergeRemoteNote(), pending, PendingEdit, prune() (+51 more)

### Community 1 - "Task API & Queries"
Cohesion: 0.05
Nodes (62): taskApi, blockingAssigneeCount(), canCompleteTask(), completionBlockedReason(), CompletionContext, completionProgress(), isSharedTask(), outstandingAssignees() (+54 more)

### Community 2 - "Integration Clients (GitHub/Calendar/Webhooks)"
Cohesion: 0.05
Nodes (31): calendarApi, githubApi, importsApi, tokensApi, webhooksApi, ApiToken, BoardImportPayload, BoardImportSource (+23 more)

### Community 3 - "Space Skin Icons"
Cohesion: 0.06
Nodes (33): CENTRE, EdgeAffordance(), EdgeAffordanceProps, GRADIENT, NavPinButton(), NavPinButtonProps, RAIL, RAIL_TONE (+25 more)

### Community 4 - "App Providers, Router & Theme"
Cohesion: 0.05
Nodes (37): App(), AppProviders(), QueryProvider(), NOTIFICATION_TOAST, RealtimeContext, RealtimeContextValue, RealtimeProvider(), roomHolders (+29 more)

### Community 5 - "Project API & Queries"
Cohesion: 0.07
Nodes (24): ListProjectsParams, projectApi, patchProjectPinned(), patchRosterRemoval(), seedProjectFrom(), useProject(), useProjectIntentPrefetch(), useRemoveMember() (+16 more)

### Community 6 - "Shared UI Primitives"
Cohesion: 0.07
Nodes (33): HazardDrift(), MOTES, Badge(), BadgeProps, Collapsible(), CollapsibleProps, ColorPicker(), ColorPickerProps (+25 more)

### Community 7 - "Skin Icon Sets"
Cohesion: 0.08
Nodes (23): AutumnMark(), EldritchMark(), GlyphProps, NavGlyphKey, HazardMark(), NavGlyph(), NavGlyphProps, NewspaperMark() (+15 more)

### Community 8 - "Organization API & Queries"
Cohesion: 0.09
Nodes (25): organizationApi, useAttachProject(), useCreateOrganization(), useDetachProject(), useInviteToOrganization(), useOrganizationRefresh(), useRemoveOrganizationMember(), useRevokeOrganizationInvitation() (+17 more)

### Community 9 - "Meeting & Room API"
Cohesion: 0.12
Nodes (32): meetingApi, meetingRoomApi, byStart(), invalidateAgenda(), invalidateInheritedRooms(), organizationKey(), projectKey(), removeMeeting() (+24 more)

### Community 10 - "Shared API Client"
Cohesion: 0.09
Nodes (22): api, apiIsWarm(), ensureApiAwake(), isApiWarm(), refreshAccessToken(), refreshSession(), RetriableConfig, sessionExpiredHandlers (+14 more)

### Community 11 - "Task Views & Layout Store"
Cohesion: 0.10
Nodes (24): DEFAULTS, LAYOUTS_FOR, LayoutSurface, read(), Stored, TaskLayout, useTaskLayout(), write() (+16 more)

### Community 12 - "Uploads & Board Export"
Cohesion: 0.09
Nodes (28): BOARD_EXPORT_MIME, DOCUMENT_ACCEPT, DOCUMENT_MIME_TYPES, EXTENSION_MIME, IMPORT_ACCEPT, IMPORT_MIME_TYPES, MAX_DOCUMENT_BYTES, PresignedUpload (+20 more)

### Community 13 - "Landing Page Demos"
Cohesion: 0.10
Nodes (19): COLUMNS, DemoBoard(), LANES, RESIDENTS, DemoChat(), MESSAGES, DemoFrame(), DemoFrameProps (+11 more)

### Community 14 - "Security Policy & CSP"
Cohesion: 0.08
Nodes (27): iOS standalone / viewport-fit=cover hints, <script type="module" src="/src/main.tsx">, <script src="/theme-init.js"> in index.html <head>, vite-plugin-pwa, base-uri 'self', Cloudflare R2 (bucket-specific hostname), connect-src 'self' https: wss:, Content-Security-Policy (+19 more)

### Community 15 - "App TS Config"
Cohesion: 0.07
Nodes (27): DOM, DOM.Iterable, src, vite/client, vite-plugin-pwa/client, compilerOptions, baseUrl, isolatedModules (+19 more)

### Community 16 - "Runtime Dependencies"
Cohesion: 0.07
Nodes (27): axios, clsx, date-fns, @dnd-kit/modifiers, @hookform/resolvers, lucide-react, dependencies, axios (+19 more)

### Community 17 - "Auth Desk Scene"
Cohesion: 0.10
Nodes (7): AuthScene(), DeskObject(), DeskObjectProps, floatTransition(), AuthShell(), AuthShellProps, Phase

### Community 18 - "Date Window Helpers"
Cohesion: 0.19
Nodes (21): DATE_WINDOW_YEARS, dateInputBounds(), dateInputMax(), dateInputMin(), dateLocale(), dayInputMax(), dayInputMin(), formatDateTime() (+13 more)

### Community 19 - "Text Board & Documents"
Cohesion: 0.13
Nodes (19): DocumentAccessDialog(), DocumentAccessDialogProps, DocumentDownloadMenu(), DownloadMenuProps, ICONS, saveBlob(), stem(), formatBadge() (+11 more)

### Community 20 - "Document API & Queries"
Cohesion: 0.17
Nodes (16): documentApi, useAdoptDocument(), useCreateDocument(), useDeleteDocument(), useDocumentListCache(), useImportDocument(), useProjectDocumentsRealtime(), useSetDocumentEditors() (+8 more)

### Community 21 - "Task Group API & Model"
Cohesion: 0.19
Nodes (16): taskGroupApi, boardScope(), invalidateGroups(), isBoardBusy(), useCreateTaskGroup(), useDeleteTaskGroup(), useReorderTaskGroups(), useTagTask() (+8 more)

### Community 22 - "Button, Modal & Boundary"
Cohesion: 0.12
Nodes (13): Button, buttonClasses(), ButtonProps, GAPS, Size, SIZES, Variant, VARIANTS (+5 more)

### Community 23 - "Build TS Config"
Cohesion: 0.11
Nodes (18): node, scripts/**/*.mjs, vite.config.ts, compilerOptions, allowSyntheticDefaultImports, isolatedModules, lib, module (+10 more)

### Community 24 - "Task Groups Board UI"
Cohesion: 0.13
Nodes (10): read(), Stored, useHiddenColumns(), write(), GroupTaskCard(), GroupTaskCardProps, RIBBON, GroupsBoardProps (+2 more)

### Community 25 - "AI Suggestions"
Cohesion: 0.18
Nodes (10): aiApi, AiSuggestion, ProjectTaskSuggestion, SubtaskSuggestion, JobEvent, StreamStatus, useSuggestionStream(), AiPanel() (+2 more)

### Community 26 - "Meetings, Composer & Rooms"
Cohesion: 0.14
Nodes (13): MeetingComposer(), MeetingComposerProps, nextHour(), dayKey(), MeetingRow, MeetingRowProps, MeetingsPanel(), MeetingsPanelProps (+5 more)

### Community 27 - "i18n Locale Strings"
Cohesion: 0.19
Nodes (15): detectLocale(), LocaleState, substitute(), syncDocumentLang(), Translate, useLocale(), useLocaleStore, useT() (+7 more)

### Community 28 - "Dev Dependencies"
Cohesion: 0.12
Nodes (17): autoprefixer, devDependencies, autoprefixer, postcss, @types/node, @types/react, @types/react-dom, typescript (+9 more)

### Community 29 - "Task Config Constants"
Cohesion: 0.12
Nodes (16): RFC-5321, BOARD_INK_COLORS, CONNECTOR_COLORS, EDGE_REVEAL_PX, GROUP_COLUMNS_PER_PAGE, MAX_BOARD_PAGES, MAX_GROUPS_PER_PROJECT, MAX_TASK_NOTES (+8 more)

### Community 30 - "Project Creation & Import Dialogs"
Cohesion: 0.15
Nodes (10): BoardImportPanel(), BoardImportPanelProps, sourceFor(), CreateProjectDialogProps, Mode, GithubImportPanel(), GithubImportPanelProps, ProjectSettingsDialogProps (+2 more)

### Community 31 - "Icon Generation Script"
Cohesion: 0.16
Nodes (15): BRAND, BRAND_DEEP, chunk(), crc32(), crcTable, drawIcon(), encodePng(), FOLD (+7 more)

### Community 32 - "Floating Shortcuts Store"
Cohesion: 0.26
Nodes (12): clampToViewport(), FloatingShortcut, PILL, read(), ShortcutIcon, ShortcutsState, useFloatingShortcuts, write() (+4 more)

### Community 33 - "Eldritch & Runic Decor"
Cohesion: 0.16
Nodes (11): DirectionArrow(), DirectionArrowProps, EldritchTendrils(), EldritchTendrilsProps, GazeArrow(), GazeArrowProps, nextSighting(), Sighting (+3 more)

### Community 34 - "Notification API & Copy"
Cohesion: 0.21
Nodes (6): notificationApi, dropNotification(), useNotificationActions(), AppNotification, NotificationPayload, NotificationType

### Community 35 - "Team API & Queries"
Cohesion: 0.30
Nodes (11): teamApi, keyFor(), useCreateTeam(), useDeleteTeam(), useTeamRefresh(), useTeams(), useUpdateTeam(), CreateTeamPayload (+3 more)

### Community 36 - "Desktop Notifications"
Cohesion: 0.19
Nodes (8): deepLink(), NotificationBell(), NotificationOptIn(), DesktopNotice, hasDeclinedNotifications(), isSupported(), NotificationAccess, requestNotificationAccess()

### Community 37 - "Skin Catalogue & Preview"
Cohesion: 0.23
Nodes (9): SETTINGS_SKIN_LIMIT, SKIN_BY_VALUE, SKIN_CATALOG, SkinDefinition, SkinPreview, leaf(), notch(), SkinMock() (+1 more)

### Community 38 - "Edge Affordance & Nav Pin"
Cohesion: 0.14
Nodes (13): CENTRE, EdgeAffordance(), EdgeAffordanceProps, GRADIENT, IRIS_GRADIENT, NavPinButton(), NavPinButtonProps, RAIL (+5 more)

### Community 39 - "Service Brand Marks"
Cohesion: 0.22
Nodes (10): SERVICES, GoogleCalendarMark(), DiscordMark(), ExportMark(), FeedMark(), GitHubMark(), MarkProps, SlackMark() (+2 more)

### Community 40 - "Architecture Notes (README)"
Cohesion: 0.17
Nodes (12): zustand, tailwindcss, Layered Dependency Rule (app→pages→widgets→features→entities→shared), Feature-Sliced Design, Optimistic Update Strategy, React 19, Sonner (toasts), Tailwind CSS (+4 more)

### Community 41 - "Auth Session Store"
Cohesion: 0.21
Nodes (8): authApi, OAuthAvailability, OAuthProvider, SessionState, SessionStatus, useCurrentUser(), useSessionStore, SignOut

### Community 42 - "Note Connector Layer"
Cohesion: 0.23
Nodes (9): Listener, Point, PositionBus, centreOf(), ConnectorLayer(), ConnectorLayerProps, curveBetween(), headTransform() (+1 more)

### Community 43 - "Board Gestures & Overlays"
Cohesion: 0.18
Nodes (4): MarqueeOptions, Rect, ConnectBannerProps, SelectionBarProps

### Community 44 - "Nav Preferences Store"
Cohesion: 0.23
Nodes (11): DEFAULTS, NavEdge, NavPreferencesState, PinnedEdges, RailScope, read(), readRailScope(), StoredPreferences (+3 more)

### Community 45 - "Task Filters"
Cohesion: 0.18
Nodes (9): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PROJECT_SCOPES, STATUS_SWATCH, STATUSES, TaskFiltersProps (+1 more)

### Community 46 - "Activity API & Types"
Cohesion: 0.29
Nodes (5): activityApi, ActivityEntry, ActivityPage, ActivityType, RevertResult

### Community 47 - "CLI Panels & Commands"
Cohesion: 0.25
Nodes (3): CLI_DOCS_URL, CliCommandList(), DocsLink()

### Community 48 - "Project Chat Dock"
Cohesion: 0.22
Nodes (5): ChatDockState, PersistedDock, restored, useChatDock, write()

### Community 49 - "Task Filter Controls"
Cohesion: 0.18
Nodes (9): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PROJECT_SCOPES, STATUS_SWATCH, STATUSES, TaskFiltersProps (+1 more)

### Community 50 - "HTML Sanitiser"
Cohesion: 0.24
Nodes (9): ALLOWED_ATTRIBUTES, ALLOWED_STYLE_PROPERTIES, ALLOWED_TAGS, clean(), DISCARDED_TAGS, GLOBAL_ATTRIBUTES, isSafeUrl(), sanitizeDocumentHtml() (+1 more)

### Community 51 - "Admin API & Types"
Cohesion: 0.31
Nodes (8): adminApi, adminTokenStore, client, AdminReport, AdminSession, AdminStats, AdminUserRow, BanPayload

### Community 52 - "Webhooks Panel"
Cohesion: 0.20
Nodes (7): ALL_EVENTS, ComposeRequest, EVENT_LABEL, FLAVOUR_LABEL, FLAVOUR_PLACEHOLDER, WebhookRowProps, WebhooksPanelProps

### Community 53 - "Query Cache Persistence"
Cohesion: 0.31
Nodes (9): clearPersistedQueries(), hydrateQueryCache(), isPersistable(), PERSISTED_PREFIXES, PersistedBlob, PersistedEntry, persistQueryCache(), read() (+1 more)

### Community 54 - "Autumn Skin Decor"
Cohesion: 0.20
Nodes (7): AutumnFall(), AutumnHedge(), AutumnHedgeProps, FALLING, LeafProps, LeafTone, TONE_FILL

### Community 55 - "Chat & Whiteboard API"
Cohesion: 0.28
Nodes (7): chatApi, whiteboardApi, ChatDelivery, ChatMessage, WhiteboardElement, WhiteboardElementType, WhiteboardStrokeData

### Community 56 - "OAuth Sign-in Buttons"
Cohesion: 0.25
Nodes (6): ASSUME_BOTH, LABELS, MARKS, OAuthButtons(), OAuthButtonsProps, readRemembered()

### Community 57 - "Roster & Reporting"
Cohesion: 0.25
Nodes (5): ReportUserDialog(), ReportUserDialogProps, ASSIGNABLE_ROLES, ROLE_ICON, RosterPanelProps

### Community 58 - "Import Tracker"
Cohesion: 0.33
Nodes (7): TrackerState, useImportTracker, ImportRow(), ImportRowProps, ImportTracker(), isLive(), STEP_LABEL

### Community 59 - "Package Metadata"
Cohesion: 0.25
Nodes (7): description, engines, node, name, private, type, version

### Community 60 - "Organization Dialog"
Cohesion: 0.25
Nodes (4): ASSIGNABLE_ROLES, InviteListProps, OrganizationDialogProps, ProjectPickerProps

### Community 61 - "Organization Members Panel"
Cohesion: 0.25
Nodes (4): ASSIGNABLE_ROLES, InviteFormProps, MemberRowProps, OrganizationMembersPanelProps

### Community 62 - "Organization Projects Board"
Cohesion: 0.29
Nodes (6): Lane, laneOf(), LANES, OrganizationProjectsBoard(), OrganizationProjectsBoardProps, ProjectCardProps

### Community 63 - "Rich Text Editor"
Cohesion: 0.25
Nodes (4): COLORS, PromptKind, RichTextEditorProps, SIZES

### Community 64 - "Task Detail & Note Checklist"
Cohesion: 0.29
Nodes (4): NoteCardProps, NoteChecklist(), NoteChecklistProps, TaskDetailModalProps

### Community 65 - "Project Changelog"
Cohesion: 0.29
Nodes (6): APPEARANCE, ChangelogRowProps, dayKey(), ProjectChangelog(), ProjectChangelogProps, SENTENCE

### Community 66 - "Hidden Sidebar Nav"
Cohesion: 0.29
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 67 - "Motion & Drag Dependencies"
Cohesion: 0.29
Nodes (7): @dnd-kit/core, framer-motion, @dnd-kit/core, framer-motion, 60fps Animation Rules, Two-tool Drag & Drop strategy, style-src 'self' 'unsafe-inline'

### Community 68 - "npm Scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, icons, lint, preview, typecheck

### Community 69 - "Shell Route Prefetch"
Cohesion: 0.38
Nodes (4): AGENDA_PREFETCH, rememberedBoardPage(), useRouteIntentPrefetch(), useShellPrefetch()

### Community 70 - "Status Task Board (DnD)"
Cohesion: 0.33
Nodes (4): COLUMNS, DraggableTask(), lockedHint(), TaskBoardProps

### Community 71 - "Teams Panel"
Cohesion: 0.29
Nodes (3): TeamComposerProps, TeamRowProps, TeamsPanelProps

### Community 72 - "Dashboard Page"
Cohesion: 0.33
Nodes (3): DashboardPage(), rankUpNext(), TONES

### Community 73 - "Shared React Hooks"
Cohesion: 0.38
Nodes (3): useIsDesktop(), useIsTouchDevice(), useMediaQuery()

### Community 74 - "Runic Transliteration"
Cohesion: 0.33
Nodes (5): DIGRAPHS, LETTERS, RuneToken, runeTokens(), toRunes()

### Community 75 - "Intent Prefetch"
Cohesion: 0.38
Nodes (5): forget(), IntentHandlers, isSpeculationWelcome(), lastPrefetchedAt, useIntentPrefetch()

### Community 76 - "File Attachment Fields"
Cohesion: 0.38
Nodes (6): extensionOf(), FileAttachmentField(), FileAttachmentFieldProps, FileAttachmentRow(), FileAttachmentRowProps, formatFileSize()

### Community 77 - "Hidden Sidebar Widget"
Cohesion: 0.29
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 78 - "Vercel Deploy Config"
Cohesion: 0.29
Nodes (6): buildCommand, framework, headers, outputDirectory, rewrites, $schema

### Community 79 - "Skin Picker"
Cohesion: 0.33
Nodes (3): SkinDefinition, SkinPreview, SKINS

### Community 80 - "Whiteboard Tools"
Cohesion: 0.47
Nodes (5): isStroke(), readImageSize(), Tool, Whiteboard(), WhiteboardProps

### Community 81 - "Document Byline"
Cohesion: 0.40
Nodes (4): DocumentByline(), DocumentBylineProps, DocumentCreatorStampProps, nameFor()

### Community 84 - "Image Preparation"
Cohesion: 0.47
Nodes (5): encodeAt(), PreparedImage, prepareImage(), PrepareOptions, scaleToFit()

### Community 85 - "Edge Reveal Hook"
Cohesion: 0.33
Nodes (3): Edge, KeepOut, Options

### Community 86 - "Avatar & Avatar Stack"
Cohesion: 0.33
Nodes (5): Avatar(), AvatarProps, AvatarStack(), AvatarStackProps, SIZES

### Community 87 - "Input & Textarea"
Cohesion: 0.33
Nodes (5): FieldShellProps, Input, InputProps, Textarea, TextareaProps

### Community 88 - "Project Rail Widget"
Cohesion: 0.40
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 89 - "Whiteboard Widget"
Cohesion: 0.47
Nodes (5): adoptStroke(), isStroke(), Tool, Whiteboard(), WhiteboardProps

### Community 91 - "Project Rail Items"
Cohesion: 0.50
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 92 - "Invite Picker"
Cohesion: 0.40
Nodes (3): InvitePickerProps, Person, Tab

### Community 93 - "Notes Board Toolbar"
Cohesion: 0.40
Nodes (3): BoardTool, BoardToolbarProps, TOOLS

### Community 97 - "Task Composer"
Cohesion: 0.40
Nodes (3): EMPTY_ROSTER, PRIORITIES, TaskComposerProps

### Community 98 - "CLI Device Approval Page"
Cohesion: 0.60
Nodes (3): CliAuthorizePage(), prettyCode(), RequestCard()

### Community 99 - "Personal Agenda Page"
Cohesion: 0.50
Nodes (3): AgendaRowProps, dayKey(), MeetingsPage()

### Community 101 - "Task Menu Page"
Cohesion: 0.60
Nodes (3): AgendaSkeleton(), isSameDay(), TaskMenuPage()

### Community 102 - "Build Environment Config"
Cohesion: 0.50
Nodes (4): apiUrl, env, resolveApiUrl(), stripTrailingSlash()

### Community 104 - "Expandable Stage"
Cohesion: 0.40
Nodes (4): ExpandableStage(), ExpandableStageProps, ExpandToggle(), ExpandToggleProps

### Community 105 - "Runic Decor"
Cohesion: 0.50
Nodes (4): Mark, nextMark(), RuneScribe(), STAVES

### Community 108 - "PWA & Deployment Notes"
Cohesion: 0.50
Nodes (4): iOS/Safari PWA specifics, npm Scripts (dev/build/preview/typecheck/icons), vite-plugin-pwa / Workbox PWA setup, Vercel Deployment (vercel.json)

### Community 109 - "Document Plain Text"
Cohesion: 0.67
Nodes (3): escapeText(), MAX_PLAIN_TEXT_CHARS, plainTextToHtml()

### Community 112 - "Board Image Drop"
Cohesion: 0.67
Nodes (3): fitImage(), ImageDropOptions, useImageDrop()

### Community 113 - "Board Ink Layer"
Cohesion: 0.67
Nodes (3): InkLayer(), InkLayerProps, toPath()

### Community 115 - "Invitations Page"
Cohesion: 0.67
Nodes (3): byNewest(), InvitationsPage(), UnifiedInvitation

### Community 119 - "Recycle Bin Page"
Cohesion: 0.67
Nodes (3): Bin, daysUntil(), RecycleBinPage()

### Community 123 - "Runic Text Rendering"
Cohesion: 0.67
Nodes (3): RunicText(), RunicTextProps, seedOf()

### Community 124 - "Zoomable Image"
Cohesion: 0.67
Nodes (3): clamp(), ZoomableImage(), ZoomableImageProps

## Knowledge Gaps
- **565 isolated node(s):** `name`, `private`, `version`, `type`, `description` (+560 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **51 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Runtime Dependencies` to `Motion & Drag Dependencies`, `Architecture Notes (README)`, `dnd-kit Sortable (dependency)`, `dnd-kit Utilities (dependency)`, `React DOM (dependency)`, `Socket.IO Client (dependency)`, `Package Metadata`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Dev Dependencies` to `Architecture Notes (README)`, `Package Metadata`, `Security Policy & CSP`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Why does `installApiWarmOnIntent()` connect `Shared API Client` to `App Providers, Router & Theme`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _565 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Note & Board Sync` be split into smaller, more focused modules?**
  _Cohesion score 0.05561105561105561 - nodes in this community are weakly interconnected._
- **Should `Task API & Queries` be split into smaller, more focused modules?**
  _Cohesion score 0.05194805194805195 - nodes in this community are weakly interconnected._
- **Should `Integration Clients (GitHub/Calendar/Webhooks)` be split into smaller, more focused modules?**
  _Cohesion score 0.05367231638418079 - nodes in this community are weakly interconnected._