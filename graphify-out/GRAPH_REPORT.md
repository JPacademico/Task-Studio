# Graph Report - C:/Users/jorda/OneDrive/Documentos/GitHub/Task-Studio/Task-Studio-UI  (2026-09-11)

## Corpus Check
- 24 files · ~364,139 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2077 nodes · 2816 edges · 210 communities (152 shown, 58 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 66 edges (avg confidence: 0.67)
- Token cost: 329,000 input · 2,950 output

## Community Hubs (Navigation)
- Task API & Completion Rules
- Edge Affordance & Nav Rail
- App Bootstrap, Router & Providers
- Project API & Queries
- Archive & Document Access UI
- Shared UI Primitives & Attachments
- Skin Decor & Hover Hint
- User API & Import MIME Rules
- API Client, Auth Tokens & Warm-up
- Document API & Queries
- Organization API & Queries
- Meeting & Room API
- App Icon Generator & Assets
- Task View Layout Store
- Task Board Columns
- Integration API (Figma, Calendar)
- TypeScript & Vite Config
- Auth Scene Desk Animation
- Date Window Helpers
- Build Tooling Dependencies
- Landing Page Hero & Nav
- Task Group API & Queries
- Button Component
- Node & Vite Tooling Config
- AI Suggestions API
- Meeting Composer & Panel
- Landing Page & Demo Board
- Landing Page Demo Panels
- Shared Constants
- Calendar Integration Types
- Whiteboard Query Hooks
- Board Import & Create Project
- Icon Generation Script
- Note & Board API Types
- Project Board Notes Queries
- Floating Shortcuts Store
- Landing Page & Demo Board
- Landing Integrations Strip
- Notification API & Copy
- Team API & Queries
- Theme Skin Catalog
- Edge Affordance Component
- Landing Page Demo Panels
- Auth API & Session Store
- Whiteboard Connector Layer
- Direction Arrow & Eldritch Decor
- Board Gestures & Overlays
- Nav Preferences Store
- Task Filters
- Architecture & Animation Conventions
- Lava Button & Skin Loader
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
- Roster & Report User UI
- Desktop Notifications Permission
- Import Tracker UI
- Package Manifest
- Landing Page Hero & Nav
- Post-it Note Component
- Organization Dialog & Invite
- Organization Members Panel
- Organization Projects Board
- Rich Text Editor
- Note Checklist & Task Detail
- Project Changelog UI
- Hidden Sidebar Nav
- Architecture & Animation Conventions
- Landing Nav & Lava Link
- Package Manifest
- App Layout & Shell Prefetch
- Webhooks API Types
- Teams Panel UI
- Dashboard Page
- Landing Hero 3D Field
- Landing Page & Demo Board
- Shared UI Hooks
- Intent Prefetch Hook
- File Attachment Field
- Hidden Sidebar Nav (UI)
- Vercel Deployment Config
- Whiteboard Component
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
- PWA & CSP Script Config
- Favicon & Brand Mark SVG
- Organization Banner UI
- Chat Pin Component (UI)
- Figma Link Dialog
- Repository Link Dialog
- Task Composer UI
- CLI Authorize Page
- Landing Shader Wash
- Meetings Page
- Organization Page
- Task Menu Page
- Pricing Table Component
- Environment Config
- Color Helpers
- Canvas Render Budget
- Write Order Sequencing
- Expandable Stage Component
- Runic Skin Decor
- Layout Switcher UI
- Skin Motion Hook
- Expandable Stage UI
- PWA & Deployment Notes
- Select Dropdown UI
- API Tokens API
- CLI Device Auth API
- Lava Goo SVG Filter
- Board Selection Helpers
- Image Drop Hook
- Whiteboard Ink Layer
- Admin Page
- Invitations Page
- Notes Board Page
- Organizations Page
- Project Page & Tabs
- Theme Gallery Page
- Skin Motion Hook (lib)
- Text Clamp Helpers
- Card Press Hook
- Runic Text Component
- Vite CSP Config
- Nib Cursor Preview
- Floating Shortcut Layer
- Settings Page
- Top Navigation
- Auth Token Storage Notes
- Project Window Chip
- Pending Tasks Widget
- API Tokens Panel
- Calendar Connection Panel
- CLI Machines Panel
- Tear-off Shortcut Hook
- Tear-off Ghost Component
- Language Toggle
- Board Loading Skeleton
- Settings Page (UI)
- Project Chat Widget
- Project Dashboard Metrics
- Top Navigation (UI)
- TypeScript Project References
- Frontend Dependencies
- Frontend Dependencies
- Frontend Dependencies
- Frontend Dependencies
- Frontend Dependencies
- Paper Design Shaders Dependency
- Frontend Dependencies
- Frontend Dependencies
- Frontend Dependencies
- Frontend Dependencies
- React Three Fiber Dependency
- Frontend Dependencies
- Frontend Dependencies
- PWA App Icon
- Hidden Edge Menus Design
- Calendar Feed Panel
- Calendar Sync Badge
- Branch Commit Prompt
- Not Found Page
- App Icon Mark
- Theme CSS Variables
- Cache Headers Policy
- Permissions Policy Header
- Referrer Policy Header
- Content-Type Sniffing Guard

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `Content-Security-Policy` - 14 edges
3. `useBoardCache()` - 14 edges
4. `compilerOptions` - 13 edges
5. `useProjectBoardCache()` - 12 edges
6. `StudioLetter()` - 12 edges
7. `toDate()` - 11 edges
8. `useDocumentListCache()` - 10 edges
9. `Task Studio README` - 9 edges
10. `useOrganizationRefresh()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Handwritten 't' glyph stroke paths` --shares_data_with--> `StudioLetter()`  [INFERRED]
  public/favicon.svg → src/shared/ui/studio-letter.tsx
- `Apple Touch Icon (Task Studio Brand Mark)` --conceptually_related_to--> `drawIcon()`  [INFERRED]
  public/apple-touch-icon.png → scripts/generate-icons.mjs
- `Icon-192 Brand Mark` --shares_data_with--> `drawIcon()`  [INFERRED]
  public/icons/icon-192.png → scripts/generate-icons.mjs
- `favicon.svg (browser tab icon)` --shares_data_with--> `StudioLetter()`  [INFERRED]
  public/favicon.svg → src/shared/ui/studio-letter.tsx
- `Task Studio README` --references--> `@dnd-kit/core`  [EXTRACTED]
  README.md → package.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Pre-React document bootstrap (theme, gooey filter, app mount)** — index_theme_init_script, index_lava_goo_filter, index_main_tsx_entry [INFERRED 0.75]
- **CSP as second line of defense for token theft and HTML injection** — security_content_security_policy, security_localstorage_tokens, security_contenteditable_sanitizer [EXTRACTED 1.00]
- **PDF preview via API-gated blob frame** — security_frame_src, security_documentapi_sourceobjecturl, security_cloudflare_r2 [INFERRED 0.85]
- **vercel.json response header set** — security_vercel_json, security_content_security_policy, security_strict_transport_security, security_x_content_type_options, security_x_frame_options, security_referrer_policy, security_permissions_policy, security_cache_control [EXTRACTED 1.00]
- **Performance-first Interaction Design Pattern** — readme_useedgereveal, readme_drag_and_drop_design, readme_60fps_rules [INFERRED 0.85]
- **PWA/iOS Delivery Flow** — readme_pwa_workbox, readme_ios_safari_specifics, readme_npm_scripts, readme_vercel_deployment [INFERRED 0.75]

## Communities (210 total, 58 thin omitted)

### Community 0 - "Task API & Completion Rules"
Cohesion: 0.05
Nodes (62): taskApi, blockingAssigneeCount(), canCompleteTask(), completionBlockedReason(), CompletionContext, completionProgress(), isSharedTask(), outstandingAssignees() (+54 more)

### Community 1 - "Edge Affordance & Nav Rail"
Cohesion: 0.06
Nodes (33): CENTRE, EdgeAffordance(), EdgeAffordanceProps, GRADIENT, NavPinButton(), NavPinButtonProps, RAIL, RAIL_TONE (+25 more)

### Community 2 - "App Bootstrap, Router & Providers"
Cohesion: 0.05
Nodes (39): App(), AppProviders(), QueryProvider(), NOTIFICATION_TOAST, RealtimeContext, RealtimeContextValue, RealtimeMeta, RealtimeProvider() (+31 more)

### Community 3 - "Project API & Queries"
Cohesion: 0.06
Nodes (24): ListProjectsParams, projectApi, patchProjectPinned(), patchRosterRemoval(), seedProjectFrom(), useProject(), useProjectIntentPrefetch(), useRemoveMember() (+16 more)

### Community 4 - "Archive & Document Access UI"
Cohesion: 0.06
Nodes (39): ArchiveDocument(), ArchiveDocumentProps, depthOf(), leafOf(), BoardGauge(), DocumentAccessDialog(), DocumentAccessDialogProps, DocumentDownloadMenu() (+31 more)

### Community 5 - "Shared UI Primitives & Attachments"
Cohesion: 0.07
Nodes (38): extensionOf(), FileAttachmentField(), FileAttachmentFieldProps, FileAttachmentRow(), FileAttachmentRowProps, formatFileSize(), NavGlyphKey, GoogleCalendarMark() (+30 more)

### Community 6 - "Skin Decor & Hover Hint"
Cohesion: 0.06
Nodes (39): BOARD_EXPORT_MIME, classifyImportFile(), DOCUMENT_ACCEPT, DOCUMENT_MIME_TYPES, EXTENSION_MIME, IMPORT_ACCEPT, IMPORT_ARCHIVE_MIME, IMPORT_DOCUMENT_MIME (+31 more)

### Community 7 - "User API & Import MIME Rules"
Cohesion: 0.08
Nodes (24): api, apiIsWarm(), ensureApiAwake(), CLIENT_ID, CLIENT_ID_HEADER, isApiWarm(), refreshAccessToken(), refreshSession() (+16 more)

### Community 8 - "API Client, Auth Tokens & Warm-up"
Cohesion: 0.11
Nodes (23): AutumnMark(), EldritchMark(), GlyphProps, HazardMark(), NewspaperMark(), RunicMark(), SpaceMark(), isRigidPaper() (+15 more)

### Community 9 - "Document API & Queries"
Cohesion: 0.09
Nodes (29): documentApi, useAdoptDocument(), useCreateDocument(), useCreateFigmaPage(), useDeleteDocument(), useDocumentListCache(), useImportDocument(), useProjectDocumentsRealtime() (+21 more)

### Community 10 - "Organization API & Queries"
Cohesion: 0.09
Nodes (25): organizationApi, useAttachProject(), useCreateOrganization(), useDetachProject(), useInviteToOrganization(), useOrganizationRefresh(), useRemoveOrganizationMember(), useRevokeOrganizationInvitation() (+17 more)

### Community 11 - "Meeting & Room API"
Cohesion: 0.12
Nodes (32): meetingApi, meetingRoomApi, byStart(), invalidateAgenda(), invalidateInheritedRooms(), organizationKey(), projectKey(), removeMeeting() (+24 more)

### Community 12 - "App Icon Generator & Assets"
Cohesion: 0.08
Nodes (29): Apple Touch Icon (Task Studio Brand Mark), Icon-192 Brand Mark, Icon-512 Post-it Note Brand Mark, Maskable 512 Icon (Post-it Mark, Full-Bleed Tile), Why Maskable Icons Keep Their Background Tile, BAR, BRAND, BRAND_DEEP (+21 more)

### Community 13 - "Task View Layout Store"
Cohesion: 0.07
Nodes (5): ConnectFigmaPayload, figmaApi, rememberedFigmaAvailability(), rememberFigmaAvailability(), useFigmaAvailability()

### Community 14 - "Task Board Columns"
Cohesion: 0.10
Nodes (24): DEFAULTS, LAYOUTS_FOR, LayoutSurface, read(), Stored, TaskLayout, useTaskLayout(), write() (+16 more)

### Community 15 - "Integration API (Figma, Calendar)"
Cohesion: 0.09
Nodes (20): byDeadline(), ColumnOverflow(), ColumnOverflowToggle(), useColumnCapacity(), COLUMNS, DraggableTask(), lockedHint(), TaskBoard() (+12 more)

### Community 16 - "TypeScript & Vite Config"
Cohesion: 0.07
Nodes (27): DOM, DOM.Iterable, src, vite/client, vite-plugin-pwa/client, compilerOptions, baseUrl, isolatedModules (+19 more)

### Community 17 - "Auth Scene Desk Animation"
Cohesion: 0.10
Nodes (7): AuthScene(), DeskObject(), DeskObjectProps, floatTransition(), AuthShell(), AuthShellProps, Phase

### Community 18 - "Date Window Helpers"
Cohesion: 0.18
Nodes (22): DATE_WINDOW_YEARS, dateInputBounds(), dateInputMax(), dateInputMin(), dateLocale(), dayInputMax(), dayInputMin(), formatCalendarDate() (+14 more)

### Community 19 - "Build Tooling Dependencies"
Cohesion: 0.12
Nodes (14): billingApi, BillingInterval, BillingSummary, BroadcastFlavour, Currency, Limit, Plan, PlanCatalogue (+6 more)

### Community 20 - "Landing Page Hero & Nav"
Cohesion: 0.11
Nodes (12): FeatureCarousel(), FeatureNotes(), NOTES, PiticoMark(), Reveal(), ENTER, EXIT, REST (+4 more)

### Community 21 - "Task Group API & Queries"
Cohesion: 0.09
Nodes (20): autoprefixer, devDependencies, autoprefixer, postcss, tailwindcss, @types/node, @types/react, @types/react-dom (+12 more)

### Community 22 - "Button Component"
Cohesion: 0.15
Nodes (15): AiAllowance, aiApi, AiStatus, AiSuggestion, ProjectTaskSuggestion, SubtaskSuggestion, useInvalidateAllowance(), useSuggestDraftSubtasks() (+7 more)

### Community 23 - "Node & Vite Tooling Config"
Cohesion: 0.17
Nodes (13): taskGroupApi, invalidateGroups(), orderKey, useCreateTaskGroup(), useDeleteTaskGroup(), useReorderTaskGroups(), useUpdateTaskGroup(), CreateTaskGroupPayload (+5 more)

### Community 24 - "AI Suggestions API"
Cohesion: 0.12
Nodes (13): Button, buttonClasses(), ButtonProps, GAPS, Size, SIZES, Variant, VARIANTS (+5 more)

### Community 25 - "Meeting Composer & Panel"
Cohesion: 0.11
Nodes (18): node, scripts/**/*.mjs, vite.config.ts, compilerOptions, allowSyntheticDefaultImports, isolatedModules, lib, module (+10 more)

### Community 26 - "Landing Page & Demo Board"
Cohesion: 0.14
Nodes (13): MeetingComposer(), MeetingComposerProps, nextHour(), dayKey(), MeetingRow, MeetingRowProps, MeetingsPanel(), MeetingsPanelProps (+5 more)

### Community 27 - "Landing Page Demo Panels"
Cohesion: 0.15
Nodes (12): COLUMNS, DemoBoard(), LANES, RESIDENTS, DemoChat(), MESSAGES, DemoFrame(), DemoFrameProps (+4 more)

### Community 28 - "Shared Constants"
Cohesion: 0.19
Nodes (15): detectLocale(), LocaleState, substitute(), syncDocumentLang(), Translate, useLocale(), useLocaleStore, useT() (+7 more)

### Community 29 - "Calendar Integration Types"
Cohesion: 0.12
Nodes (16): RFC-5321, BOARD_INK_COLORS, CONNECTOR_COLORS, EDGE_REVEAL_PX, GROUP_COLUMNS_PER_PAGE, MAX_BOARD_PAGES, MAX_GROUPS_PER_PROJECT, MAX_TASK_NOTES (+8 more)

### Community 30 - "Whiteboard Query Hooks"
Cohesion: 0.17
Nodes (15): calendarApi, BoardImportSource, CalendarConnection, CalendarFeedSecret, CalendarFeedStatus, CalendarSettingsPayload, CalendarStatus, CalendarSyncResult (+7 more)

### Community 31 - "Board Import & Create Project"
Cohesion: 0.21
Nodes (14): useAddBoardStroke(), useBoardCache(), useBoardPages(), useClearBoard(), useClearBoardStrokes(), useCreateBoardNote(), useCreateNoteLink(), useDeleteBoardNote() (+6 more)

### Community 32 - "Icon Generation Script"
Cohesion: 0.15
Nodes (10): BoardImportPanel(), BoardImportPanelProps, sourceFor(), CreateProjectDialogProps, Mode, GithubImportPanel(), GithubImportPanelProps, ProjectSettingsDialogProps (+2 more)

### Community 33 - "Note & Board API Types"
Cohesion: 0.13
Nodes (16): base-uri 'self', Cloudflare R2 (bucket-specific hostname), connect-src 'self' https: wss:, Content-Security-Policy, contentEditable innerHTML + sanitiser (defense in depth), documentApi.sourceObjectUrl, form-action 'self', frame-ancestors 'none' (+8 more)

### Community 34 - "Project Board Notes Queries"
Cohesion: 0.23
Nodes (13): BoardPage, BoardSnapshot, BoardStroke, CreateBoardStrokePayload, CreateNoteLinkPayload, CreateNotePayload, ListNotesParams, NoteKind (+5 more)

### Community 35 - "Floating Shortcuts Store"
Cohesion: 0.24
Nodes (13): boardApi, useCreateProjectNote(), useCreateProjectNoteLink(), useDeleteProjectNote(), useDeleteProjectNoteLink(), useGroupProjectNotes(), usePatchProjectNotes(), usePatchProjectPositions() (+5 more)

### Community 36 - "Landing Page & Demo Board"
Cohesion: 0.26
Nodes (12): clampToViewport(), FloatingShortcut, PILL, read(), ShortcutIcon, ShortcutsState, useFloatingShortcuts, write() (+4 more)

### Community 37 - "Landing Integrations Strip"
Cohesion: 0.19
Nodes (12): IntegrationsStrip(), Service, SERVICES, DiscordMark(), ExportMark(), FeedMark(), FigmaMark(), GitHubMark() (+4 more)

### Community 38 - "Notification API & Copy"
Cohesion: 0.21
Nodes (6): notificationApi, dropNotification(), useNotificationActions(), AppNotification, NotificationPayload, NotificationType

### Community 39 - "Team API & Queries"
Cohesion: 0.30
Nodes (11): teamApi, keyFor(), useCreateTeam(), useDeleteTeam(), useTeamRefresh(), useTeams(), useUpdateTeam(), CreateTeamPayload (+3 more)

### Community 40 - "Theme Skin Catalog"
Cohesion: 0.20
Nodes (10): formatBytesCeiling(), formatBytesUsed(), formatPrice(), usageFraction(), BLURB, FeatureRow, FEATURES, PLAN_NAME (+2 more)

### Community 41 - "Edge Affordance Component"
Cohesion: 0.23
Nodes (9): SETTINGS_SKIN_LIMIT, SKIN_BY_VALUE, SKIN_CATALOG, SkinDefinition, SkinPreview, leaf(), notch(), SkinMock() (+1 more)

### Community 42 - "Landing Page Demo Panels"
Cohesion: 0.21
Nodes (11): DemoCommit(), DemoMeetings(), DemoNotes(), DemoPages(), DemoUndo(), DemoWhiteboard(), PAGE_LINES, WALL (+3 more)

### Community 43 - "Auth API & Session Store"
Cohesion: 0.14
Nodes (13): CENTRE, EdgeAffordance(), EdgeAffordanceProps, GRADIENT, IRIS_GRADIENT, NavPinButton(), NavPinButtonProps, RAIL (+5 more)

### Community 44 - "Whiteboard Connector Layer"
Cohesion: 0.15
Nodes (13): axios, dependencies, axios, @shadergradient/react, sonner, tailwind-merge, three, zod (+5 more)

### Community 45 - "Direction Arrow & Eldritch Decor"
Cohesion: 0.18
Nodes (10): DirectionArrow(), DirectionArrowProps, EldritchTendrils(), EldritchTendrilsProps, GazeArrow(), GazeArrowProps, nextSighting(), Sighting (+2 more)

### Community 46 - "Board Gestures & Overlays"
Cohesion: 0.21
Nodes (8): authApi, OAuthAvailability, OAuthProvider, SessionState, SessionStatus, useCurrentUser(), useSessionStore, SignOut

### Community 47 - "Nav Preferences Store"
Cohesion: 0.23
Nodes (9): Listener, Point, PositionBus, centreOf(), ConnectorLayer(), ConnectorLayerProps, curveBetween(), headTransform() (+1 more)

### Community 48 - "Task Filters"
Cohesion: 0.18
Nodes (4): MarqueeOptions, Rect, ConnectBannerProps, SelectionBarProps

### Community 49 - "Architecture & Animation Conventions"
Cohesion: 0.23
Nodes (11): DEFAULTS, NavEdge, NavPreferencesState, PinnedEdges, RailScope, read(), readRailScope(), StoredPreferences (+3 more)

### Community 50 - "Lava Button & Skin Loader"
Cohesion: 0.18
Nodes (8): LavaButton, LavaButtonProps, SIZES, BLOBS, LavaSurface(), BODY, SkinLoaderProps, skinLoaderWantsCaption()

### Community 51 - "CLI Commands UI"
Cohesion: 0.18
Nodes (9): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PROJECT_SCOPES, STATUS_SWATCH, STATUSES, TaskFiltersProps (+1 more)

### Community 52 - "Chat Dock Store"
Cohesion: 0.18
Nodes (11): zustand, Layered Dependency Rule (app→pages→widgets→features→entities→shared), Feature-Sliced Design, Optimistic Update Strategy, React 19, Sonner (toasts), Tailwind CSS, TanStack Query (+3 more)

### Community 53 - "Task Filters UI"
Cohesion: 0.29
Nodes (5): activityApi, ActivityEntry, ActivityPage, ActivityType, RevertResult

### Community 54 - "CLI Docs Content"
Cohesion: 0.29
Nodes (9): adminApi, adminTokenStore, client, AdminReport, AdminSession, AdminStats, AdminUserRow, BanPayload (+1 more)

### Community 55 - "HTML Sanitiser Rules"
Cohesion: 0.25
Nodes (3): CLI_DOCS_URL, CliCommandList(), DocsLink()

### Community 56 - "Optimistic Note Updates"
Cohesion: 0.22
Nodes (5): ChatDockState, PersistedDock, restored, useChatDock, write()

### Community 57 - "Admin API & Session"
Cohesion: 0.18
Nodes (9): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PROJECT_SCOPES, STATUS_SWATCH, STATUSES, TaskFiltersProps (+1 more)

### Community 58 - "Webhooks Panel UI"
Cohesion: 0.22
Nodes (7): DOCS, DocsCommand, DocsDocument, DocsGroup, DocsSection, en, ptBR

### Community 59 - "Query Cache Persistence"
Cohesion: 0.24
Nodes (9): ALLOWED_ATTRIBUTES, ALLOWED_STYLE_PROPERTIES, ALLOWED_TAGS, clean(), DISCARDED_TAGS, GLOBAL_ATTRIBUTES, isSafeUrl(), sanitizeDocumentHtml() (+1 more)

### Community 60 - "Autumn Skin Decor"
Cohesion: 0.20
Nodes (7): adoptServerNote(), CreateNoteRequest, geometryDiffers(), optimisticNote(), pendingNoteId(), PlaceholderContext, splitCreateRequest()

### Community 61 - "PWA Shell & Theme Init"
Cohesion: 0.20
Nodes (7): ALL_EVENTS, ComposeRequest, EVENT_LABEL, FLAVOUR_LABEL, FLAVOUR_PLACEHOLDER, WebhookRowProps, WebhooksPanelProps

### Community 62 - "Chat & Whiteboard API Types"
Cohesion: 0.31
Nodes (9): clearPersistedQueries(), hydrateQueryCache(), isPersistable(), PERSISTED_PREFIXES, PersistedBlob, PersistedEntry, persistQueryCache(), read() (+1 more)

### Community 63 - "Local Note Edit Tracking"
Cohesion: 0.20
Nodes (7): AutumnFall(), AutumnHedge(), AutumnHedgeProps, FALLING, LeafProps, LeafTone, TONE_FILL

### Community 64 - "Roster & Report User UI"
Cohesion: 0.28
Nodes (7): chatApi, whiteboardApi, ChatDelivery, ChatMessage, WhiteboardElement, WhiteboardElementType, WhiteboardStrokeData

### Community 65 - "Desktop Notifications Permission"
Cohesion: 0.25
Nodes (8): EditableField, markLocalNoteEdit(), mergeRemoteNote(), pending, PendingEdit, prune(), releaseLocalNoteEdit(), Note

### Community 66 - "Import Tracker UI"
Cohesion: 0.25
Nodes (6): ASSUME_BOTH, LABELS, MARKS, OAuthButtons(), OAuthButtonsProps, readRemembered()

### Community 67 - "Package Manifest"
Cohesion: 0.25
Nodes (5): ReportUserDialog(), ReportUserDialogProps, ASSIGNABLE_ROLES, ROLE_ICON, RosterPanelProps

### Community 68 - "Landing Page Hero & Nav"
Cohesion: 0.28
Nodes (7): HeroField, buildField(), CardSpec, Field(), NOTE_TONES, seeded(), TONE_OPACITY

### Community 69 - "Post-it Note Component"
Cohesion: 0.28
Nodes (4): DesktopNotice, isSupported(), NotificationAccess, requestNotificationAccess()

### Community 70 - "Organization Dialog & Invite"
Cohesion: 0.31
Nodes (7): TrackerState, useImportTracker, ImportRow(), ImportRowProps, ImportTracker(), isLive(), STEP_LABEL

### Community 71 - "Organization Members Panel"
Cohesion: 0.25
Nodes (7): description, engines, node, name, private, type, version

### Community 72 - "Organization Projects Board"
Cohesion: 0.29
Nodes (5): NoteAuthorStamp(), NoteAuthorStampProps, NoteHandle, PostIt, PostItProps

### Community 73 - "Rich Text Editor"
Cohesion: 0.25
Nodes (4): ASSIGNABLE_ROLES, InviteListProps, OrganizationDialogProps, ProjectPickerProps

### Community 74 - "Note Checklist & Task Detail"
Cohesion: 0.25
Nodes (4): ASSIGNABLE_ROLES, InviteFormProps, MemberRowProps, OrganizationMembersPanelProps

### Community 75 - "Project Changelog UI"
Cohesion: 0.29
Nodes (6): Lane, laneOf(), LANES, OrganizationProjectsBoard(), OrganizationProjectsBoardProps, ProjectCardProps

### Community 76 - "Hidden Sidebar Nav"
Cohesion: 0.25
Nodes (4): COLORS, PromptKind, RichTextEditorProps, SIZES

### Community 77 - "Architecture & Animation Conventions"
Cohesion: 0.29
Nodes (4): NoteCardProps, NoteChecklist(), NoteChecklistProps, TaskDetailModalProps

### Community 78 - "Landing Nav & Lava Link"
Cohesion: 0.36
Nodes (6): LandingNav(), scrollToSection(), scrollToTop(), GAPS, LavaLink(), LavaLinkProps

### Community 79 - "Package Manifest"
Cohesion: 0.29
Nodes (6): APPEARANCE, ChangelogRowProps, dayKey(), ProjectChangelog(), ProjectChangelogProps, SENTENCE

### Community 80 - "App Layout & Shell Prefetch"
Cohesion: 0.29
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 81 - "Webhooks API Types"
Cohesion: 0.29
Nodes (7): @dnd-kit/core, framer-motion, @dnd-kit/core, framer-motion, 60fps Animation Rules, Two-tool Drag & Drop strategy, style-src 'self' 'unsafe-inline'

### Community 82 - "Teams Panel UI"
Cohesion: 0.29
Nodes (7): scripts, build, dev, icons, lint, preview, typecheck

### Community 83 - "Dashboard Page"
Cohesion: 0.38
Nodes (4): AGENDA_PREFETCH, rememberedBoardPage(), useRouteIntentPrefetch(), useShellPrefetch()

### Community 84 - "Landing Hero 3D Field"
Cohesion: 0.33
Nodes (6): webhooksApi, CreatedWebhook, ProjectWebhook, WebhookEvent, WebhookPayloadDraft, WebhookTestResult

### Community 85 - "Landing Page & Demo Board"
Cohesion: 0.29
Nodes (3): TeamComposerProps, TeamRowProps, TeamsPanelProps

### Community 86 - "Shared UI Hooks"
Cohesion: 0.33
Nodes (3): DashboardPage(), rankUpNext(), TONES

### Community 87 - "Intent Prefetch Hook"
Cohesion: 0.38
Nodes (3): useIsDesktop(), useIsTouchDevice(), useMediaQuery()

### Community 88 - "File Attachment Field"
Cohesion: 0.33
Nodes (5): DIGRAPHS, LETTERS, RuneToken, runeTokens(), toRunes()

### Community 89 - "Hidden Sidebar Nav (UI)"
Cohesion: 0.38
Nodes (6): readPalette(), ThemePalette, ThemeToken, TOKENS, tripletToHex(), useThemePalette()

### Community 90 - "Vercel Deployment Config"
Cohesion: 0.38
Nodes (5): forget(), IntentHandlers, isSpeculationWelcome(), lastPrefetchedAt, useIntentPrefetch()

### Community 91 - "Whiteboard Component"
Cohesion: 0.29
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 92 - "Document Byline Component"
Cohesion: 0.29
Nodes (6): buildCommand, framework, headers, outputDirectory, rewrites, $schema

### Community 93 - "Board Import API"
Cohesion: 0.33
Nodes (3): SkinDefinition, SkinPreview, SKINS

### Community 94 - "Note Recycle Bin Queries"
Cohesion: 0.47
Nodes (5): isStroke(), readImageSize(), Tool, Whiteboard(), WhiteboardProps

### Community 95 - "Connections Panel UI"
Cohesion: 0.40
Nodes (4): DocumentByline(), DocumentBylineProps, DocumentCreatorStampProps, nameFor()

### Community 96 - "Organization Dashboard"
Cohesion: 0.40
Nodes (5): importsApi, BoardImportPayload, CancelImportResult, RepositoryImportJob, RepositoryImportPayload

### Community 100 - "Input & Textarea Components"
Cohesion: 0.40
Nodes (4): AdminPage(), DURATIONS, planLabel(), PLANS

### Community 101 - "Project Rail Nav"
Cohesion: 0.47
Nodes (5): encodeAt(), PreparedImage, prepareImage(), PrepareOptions, scaleToFit()

### Community 102 - "Whiteboard Component (UI)"
Cohesion: 0.33
Nodes (3): Edge, KeepOut, Options

### Community 103 - "Chat Pin Component"
Cohesion: 0.33
Nodes (5): Avatar(), AvatarProps, AvatarStack(), AvatarStackProps, SIZES

### Community 104 - "Project Rail Nav (UI)"
Cohesion: 0.33
Nodes (5): FieldShellProps, Input, InputProps, Textarea, TextareaProps

### Community 105 - "Invite Picker UI"
Cohesion: 0.40
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 106 - "Board Undo History"
Cohesion: 0.47
Nodes (5): adoptStroke(), isStroke(), Tool, Whiteboard(), WhiteboardProps

### Community 108 - "Notification Bell & Opt-in"
Cohesion: 0.50
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 109 - "PWA & CSP Script Config"
Cohesion: 0.40
Nodes (5): vite-plugin-pwa, /registerSW.js, script-src 'self', public/theme-init.js, vite-plugin-pwa

### Community 110 - "Favicon & Brand Mark SVG"
Cohesion: 0.50
Nodes (5): favicon.svg (browser tab icon), Gold paper linearGradient definition, Rotated Post-it note shape with peeled corner, Handwritten 't' glyph stroke paths, StudioMark()

### Community 111 - "Organization Banner UI"
Cohesion: 0.40
Nodes (3): InvitePickerProps, Person, Tab

### Community 112 - "Chat Pin Component (UI)"
Cohesion: 0.50
Nodes (4): BoardAction, BoardHistory, isTypingTarget(), useBoardHistory()

### Community 113 - "Figma Link Dialog"
Cohesion: 0.40
Nodes (3): BoardTool, BoardToolbarProps, TOOLS

### Community 114 - "Repository Link Dialog"
Cohesion: 0.60
Nodes (3): deepLink(), NotificationBell(), NotificationOptIn()

### Community 119 - "Organization Page"
Cohesion: 0.40
Nodes (3): EMPTY_ROSTER, PRIORITIES, TaskComposerProps

### Community 120 - "Task Menu Page"
Cohesion: 0.60
Nodes (3): CliAuthorizePage(), prettyCode(), RequestCard()

### Community 121 - "Pricing Table Component"
Cohesion: 0.70
Nodes (4): featuresOf(), preferredCurrency(), PricingTable(), useFocusedPlan()

### Community 122 - "Environment Config"
Cohesion: 0.40
Nodes (3): ShaderGradient, ShaderGradientCanvas, ShaderWashProps

### Community 123 - "Color Helpers"
Cohesion: 0.50
Nodes (3): AgendaRowProps, dayKey(), MeetingsPage()

### Community 125 - "Write Order Sequencing"
Cohesion: 0.50
Nodes (3): Bin, daysUntil(), ExpiryBadge()

### Community 126 - "Expandable Stage Component"
Cohesion: 0.60
Nodes (3): AgendaSkeleton(), isSameDay(), TaskMenuPage()

### Community 127 - "Runic Skin Decor"
Cohesion: 0.50
Nodes (4): apiUrl, env, resolveApiUrl(), stripTrailingSlash()

### Community 129 - "Layout Switcher UI"
Cohesion: 0.50
Nodes (3): isCapableDevice(), NetworkInformation, useCanvasBudget()

### Community 130 - "Skin Motion Hook"
Cohesion: 0.40
Nodes (3): chains, sequences, writeSequence

### Community 131 - "Expandable Stage UI"
Cohesion: 0.40
Nodes (4): ExpandableStage(), ExpandableStageProps, ExpandToggle(), ExpandToggleProps

### Community 132 - "PWA & Deployment Notes"
Cohesion: 0.50
Nodes (4): Mark, nextMark(), RuneScribe(), STAVES

### Community 133 - "Select Dropdown UI"
Cohesion: 0.40
Nodes (4): PopupBox, Select(), SelectOption, SelectProps

### Community 136 - "Lava Goo SVG Filter"
Cohesion: 0.50
Nodes (4): lava-goo SVG metaball filter, React app entry script (/src/main.tsx), Metaball (gooey blob) visual effect, theme-init.js pre-paint script tag

### Community 137 - "Board Selection Helpers"
Cohesion: 0.50
Nodes (4): iOS/Safari PWA specifics, npm Scripts (dev/build/preview/typecheck/icons), vite-plugin-pwa / Workbox PWA setup, Vercel Deployment (vercel.json)

### Community 138 - "Image Drop Hook"
Cohesion: 0.67
Nodes (3): escapeText(), MAX_PLAIN_TEXT_CHARS, plainTextToHtml()

### Community 139 - "Whiteboard Ink Layer"
Cohesion: 0.50
Nodes (3): tokensApi, ApiToken, CreatedApiToken

### Community 142 - "Notes Board Page"
Cohesion: 0.67
Nodes (3): fitImage(), ImageDropOptions, useImageDrop()

### Community 143 - "Organizations Page"
Cohesion: 0.67
Nodes (3): InkLayer(), InkLayerProps, toPath()

### Community 144 - "Project Page & Tabs"
Cohesion: 0.67
Nodes (3): byNewest(), InvitationsPage(), UnifiedInvitation

### Community 151 - "Vite CSP Config"
Cohesion: 0.67
Nodes (3): CardPressHandlers, isOwnedByInnerControl(), useCardPress()

### Community 152 - "Nib Cursor Preview"
Cohesion: 0.67
Nodes (3): NibCursor(), NibPreview(), ringDiameter()

### Community 153 - "Floating Shortcut Layer"
Cohesion: 0.67
Nodes (3): RunicText(), RunicTextProps, seedOf()

### Community 154 - "Settings Page"
Cohesion: 0.67
Nodes (3): clamp(), ZoomableImage(), ZoomableImageProps

### Community 160 - "API Tokens Panel"
Cohesion: 1.00
Nodes (3): Structural fix: httpOnly cookie on shared parent domain, Access/refresh tokens stored in localStorage, shared/api/token-store (token-store.ts)

## Knowledge Gaps
- **654 isolated node(s):** `chatApi`, `whiteboardApi`, `SessionStatus`, `SessionState`, `container` (+649 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **58 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Whiteboard Connector Layer` to `Frontend Dependencies`, `Chat Dock Store`, `Organization Members Panel`, `Webhooks API Types`, `Frontend Dependencies`, `Frontend Dependencies`, `Paper Design Shaders Dependency`, `Frontend Dependencies`, `Frontend Dependencies`, `Frontend Dependencies`, `React Three Fiber Dependency`, `Frontend Dependencies`, `Frontend Dependencies`, `PWA App Icon`, `Hidden Edge Menus Design`, `Calendar Feed Panel`, `Calendar Sync Badge`, `Branch Commit Prompt`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `Content-Security-Policy` connect `Note & Board API Types` to `API Tokens Panel`, `Webhooks API Types`, `PWA & CSP Script Config`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Why does `DiscordMark()` connect `Landing Integrations Strip` to `Shared UI Primitives & Attachments`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `chatApi`, `whiteboardApi`, `SessionStatus` to the rest of the system?**
  _654 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Task API & Completion Rules` be split into smaller, more focused modules?**
  _Cohesion score 0.05160628844839371 - nodes in this community are weakly interconnected._
- **Should `Edge Affordance & Nav Rail` be split into smaller, more focused modules?**
  _Cohesion score 0.05551020408163265 - nodes in this community are weakly interconnected._
- **Should `App Bootstrap, Router & Providers` be split into smaller, more focused modules?**
  _Cohesion score 0.05142857142857143 - nodes in this community are weakly interconnected._