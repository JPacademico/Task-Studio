# Graph Report - .  (2026-08-26)

## Corpus Check
- 38 files · ~210,748 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1594 nodes · 2144 edges · 155 communities (109 shown, 46 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 104 edges (avg confidence: 0.54)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Post-it Board Sync
- Task Completion Logic
- App Bootstrap & Theming
- Edge Rail Affordance
- Auth Desk Scene
- Project API & Cache
- Organization API & Cache
- Task Layout Preferences
- Vite/TS Client Config
- UI Primitives Kit
- Frontend Dependencies
- Meeting API & Cache
- Studio Skin Icons
- Build Tooling Deps
- Date Formatting Utils
- Image Upload Client
- Node/Vite Build Config
- Button Component
- i18n Locale Engine
- Runic Skin Icons
- Icon Generation Script
- Notification API & Cache
- Document API & Cache
- Team API & Cache
- Floating Shortcuts Store
- Meeting Composer UI
- Notification Bell UI
- Skin Catalog Data
- Edge Affordance Component
- AI Suggestion Streaming
- Text Board & Document Access
- Architecture & Stack Notes
- Board Connector Layer
- Board Marquee Gestures
- Board & Task Constants
- Nav Rail Preferences
- Eldritch Skin Icons
- Hazard Skin Icons
- Underwater Skin Icons
- Volcano Skin Icons
- Text Board Editor
- Auth API & Session
- Chat Dock Store
- Task Filters UI
- HTML Sanitizer
- Autumn Skin Icons
- Newspaper Skin Icons
- Space Skin Icons
- Query Cache Persistence
- Autumn Decor Elements
- App Branding Assets
- Task Filters Config
- Chat & Whiteboard API
- Package Manifest
- Organization Create Dialog
- Organization Members Panel
- Organization Projects Board
- Rich Text Editor
- Teams Panel UI
- Hidden Sidebar Nav
- NPM Scripts
- App Layout Shell
- OAuth Buttons UI
- Reusable UI Hooks
- Runic Text Encoding
- Route Intent Prefetch
- Avatar Components
- File Attachment UI
- Hidden Sidebar (dup)
- Vercel Deploy Config
- Skin Picker UI
- Whiteboard Canvas
- DnD & Motion Libs
- Document Byline UI
- Task Board DnD
- Organization Dashboard UI
- Project Roster Panel
- Image Prep Utils
- Edge Reveal Hook
- Input Field Component
- Project Rail Widget
- Whiteboard Component (variant)
- Chat Pin Widget
- Project Rail (dup)
- Board Toolbar UI
- Invite Picker
- Task Composer UI
- Personal Agenda Page
- Organization Page Shell
- Task Menu Page
- API Env Config
- Colour Utilities
- Skin Motion (variant)
- Expandable Stage UI
- Route Error Boundary
- Runic Decor Elements
- Select Popup Component
- Layout Switcher UI
- PWA/Deploy Notes
- Board Selection Logic
- Image Drop Hook
- Whiteboard Ink Layer
- Chat Pin (variant)
- Invitations Page
- Notes Board Page
- Organizations List Page
- Project Page Shell
- Theme Gallery Page
- Zoomable Image UI
- Task Type Tag
- Floating Shortcut Layer
- Settings Page (variant)
- Top Navigation Bar
- Pending Tasks Widget
- Tear-off Drag Hook
- Language Toggle UI
- Board Pager UI
- Board Skeleton Loader
- Project Settings Dialog
- Task Detail Modal
- Dashboard Page Shell
- Recycle Bin Page
- Settings Page
- Volcano Decor Elements
- Project Chat Widget
- Top Navigation (variant)
- TS Project References
- DnD Sortable Lib
- DnD Utilities Lib
- React Core Lib
- Toast Notifications Lib
- PWA Manifest Icons
- PWA App Identity
- Hidden Edge Menus
- Theme Toggle UI
- Not Found Page
- Offline Cache Purge
- Query Key Registry
- Classname Merge Util
- Project Dashboard Widget
- Maskable Icon Asset
- Maskable App Icon
- CSS Theme Variables

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `compilerOptions` - 13 edges
3. `useBoardCache()` - 13 edges
4. `useProjectBoardCache()` - 11 edges
5. `GlyphSet` - 10 edges
6. `useOrganizationRefresh()` - 10 edges
7. `Content-Security-Policy` - 10 edges
8. `vercel.json` - 10 edges
9. `Task Studio README` - 9 edges
10. `GlyphProps` - 9 edges

## Surprising Connections (you probably didn't know these)
- `SECURITY.md (Response Header Rationale)` --semantically_similar_to--> `<script src="/theme-init.js"> in index.html <head>`  [INFERRED] [semantically similar]
  SECURITY.md → index.html
- `Task Studio README` --references--> `@dnd-kit/core`  [EXTRACTED]
  README.md → package.json
- `Task Studio README` --references--> `framer-motion`  [EXTRACTED]
  README.md → package.json
- `Task Studio README` --references--> `zustand`  [EXTRACTED]
  README.md → package.json
- `Two-tool Drag & Drop strategy` --references--> `@dnd-kit/core`  [EXTRACTED]
  README.md → package.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CSP directives that together form the Content-Security-Policy** — security_content_security_policy, security_script_src, security_style_src, security_connect_src, security_img_media_src, security_lockdown_directives, security_upgrade_insecure_requests [EXTRACTED 1.00]
- **Layered defenses against script-based token theft** — security_content_security_policy, security_sanitiser, security_contenteditable_innerhtml_pattern, security_token_storage_localstorage [EXTRACTED 1.00]
- **Response headers configured in vercel.json** — vercel_json, security_hsts, security_x_content_type_options, security_x_frame_options, security_referrer_policy, security_permissions_policy, security_cache_control_assets, security_cache_control_sw [EXTRACTED 1.00]
- **Performance-first Interaction Design Pattern** — readme_useedgereveal, readme_drag_and_drop_design, readme_60fps_rules [INFERRED 0.85]
- **PWA/iOS Delivery Flow** — readme_pwa_workbox, readme_ios_safari_specifics, readme_npm_scripts, readme_vercel_deployment [INFERRED 0.75]

## Communities (155 total, 46 thin omitted)

### Community 0 - "Post-it Board Sync"
Cohesion: 0.06
Nodes (59): boardApi, noteApi, EditableField, markLocalNoteEdit(), mergeRemoteNote(), pending, PendingEdit, prune() (+51 more)

### Community 1 - "Task Completion Logic"
Cohesion: 0.06
Nodes (60): taskApi, blockingAssigneeCount(), canCompleteTask(), completionBlockedReason(), CompletionContext, completionProgress(), isSharedTask(), outstandingAssignees() (+52 more)

### Community 2 - "App Bootstrap & Theming"
Cohesion: 0.05
Nodes (21): AuthScene(), DeskObject(), DeskObjectProps, floatTransition(), AuthShell(), AuthShellProps, Phase, api (+13 more)

### Community 3 - "Edge Rail Affordance"
Cohesion: 0.06
Nodes (33): CENTRE, EdgeAffordance(), EdgeAffordanceProps, GRADIENT, NavPinButton(), NavPinButtonProps, RAIL, RAIL_TONE (+25 more)

### Community 4 - "Auth Desk Scene"
Cohesion: 0.07
Nodes (23): ListProjectsParams, projectApi, patchProjectPinned(), patchRosterRemoval(), seedProjectFrom(), useProject(), useProjectIntentPrefetch(), useRemoveMember() (+15 more)

### Community 5 - "Project API & Cache"
Cohesion: 0.06
Nodes (34): App(), AppProviders(), QueryProvider(), NOTIFICATION_TOAST, RealtimeContext, RealtimeContextValue, RealtimeProvider(), roomHolders (+26 more)

### Community 6 - "Organization API & Cache"
Cohesion: 0.09
Nodes (26): organizationApi, useAttachProject(), useCreateOrganization(), useDeleteOrganization(), useDetachProject(), useInviteToOrganization(), useOrganizationRefresh(), useRemoveOrganizationMember() (+18 more)

### Community 7 - "Task Layout Preferences"
Cohesion: 0.10
Nodes (24): DEFAULTS, LAYOUTS_FOR, LayoutSurface, read(), Stored, TaskLayout, useTaskLayout(), write() (+16 more)

### Community 8 - "Vite/TS Client Config"
Cohesion: 0.07
Nodes (27): DOM, DOM.Iterable, src, vite/client, vite-plugin-pwa/client, compilerOptions, baseUrl, isolatedModules (+19 more)

### Community 9 - "UI Primitives Kit"
Cohesion: 0.07
Nodes (27): axios, clsx, date-fns, @dnd-kit/modifiers, @hookform/resolvers, lucide-react, dependencies, axios (+19 more)

### Community 10 - "Frontend Dependencies"
Cohesion: 0.11
Nodes (23): Badge(), BadgeProps, Collapsible(), CollapsibleProps, ColorPicker(), ColorPickerProps, EmptyState(), EmptyStateProps (+15 more)

### Community 11 - "Meeting API & Cache"
Cohesion: 0.10
Nodes (25): iOS standalone / viewport-fit=cover hints, <script type="module" src="/src/main.tsx">, <script src="/theme-init.js"> in index.html <head>, public/theme-init.js, Cache-Control on /assets/*, Cache-Control on /sw.js, connect-src 'self' https: wss:, Content-Security-Policy (+17 more)

### Community 12 - "Studio Skin Icons"
Cohesion: 0.17
Nodes (20): meetingApi, byStart(), invalidateAgenda(), organizationKey(), projectKey(), removeMeeting(), upsertMeeting(), useCompleteMeeting() (+12 more)

### Community 13 - "Build Tooling Deps"
Cohesion: 0.11
Nodes (20): DOCUMENT_ACCEPT, DOCUMENT_MIME_TYPES, MAX_DOCUMENT_BYTES, PresignedUpload, putObject(), UploadedFile, UploadedImage, uploadFile() (+12 more)

### Community 14 - "Date Formatting Utils"
Cohesion: 0.19
Nodes (16): taskGroupApi, boardScope(), invalidateGroups(), isBoardBusy(), useCreateTaskGroup(), useDeleteTaskGroup(), useReorderTaskGroups(), useTagTask() (+8 more)

### Community 15 - "Image Upload Client"
Cohesion: 0.12
Nodes (15): Button, ButtonProps, GAPS, Size, SIZES, Variant, VARIANTS, Modal() (+7 more)

### Community 16 - "Node/Vite Build Config"
Cohesion: 0.12
Nodes (12): isRigidPaper(), MARKS, PageStack(), paperFor(), PAPERS, PostItGlyph(), PostItMark(), PostItMarkProps (+4 more)

### Community 17 - "Button Component"
Cohesion: 0.11
Nodes (19): autoprefixer, devDependencies, autoprefixer, postcss, @types/node, @types/react, @types/react-dom, typescript (+11 more)

### Community 18 - "i18n Locale Engine"
Cohesion: 0.11
Nodes (18): node, scripts/**/*.mjs, vite.config.ts, compilerOptions, allowSyntheticDefaultImports, isolatedModules, lib, module (+10 more)

### Community 19 - "Runic Skin Icons"
Cohesion: 0.13
Nodes (11): read(), Stored, useHiddenColumns(), write(), GroupTaskCard(), GroupTaskCardProps, RIBBON, GroupsBoard() (+3 more)

### Community 20 - "Icon Generation Script"
Cohesion: 0.22
Nodes (18): DATE_WINDOW_YEARS, dateInputBounds(), dateInputMax(), dateInputMin(), dateLocale(), formatDateTime(), formatDayLabel(), formatDeadline() (+10 more)

### Community 21 - "Notification API & Cache"
Cohesion: 0.18
Nodes (10): aiApi, AiSuggestion, ProjectTaskSuggestion, SubtaskSuggestion, JobEvent, StreamStatus, useSuggestionStream(), AiPanel() (+2 more)

### Community 22 - "Document API & Cache"
Cohesion: 0.19
Nodes (15): detectLocale(), LocaleState, substitute(), syncDocumentLang(), Translate, useLocale(), useLocaleStore, useT() (+7 more)

### Community 23 - "Team API & Cache"
Cohesion: 0.12
Nodes (16): RFC-5321, BOARD_INK_COLORS, CONNECTOR_COLORS, EDGE_REVEAL_PX, GROUP_COLUMNS_PER_PAGE, MAX_BOARD_PAGES, MAX_GROUPS_PER_PROJECT, MAX_TASK_NOTES (+8 more)

### Community 24 - "Floating Shortcuts Store"
Cohesion: 0.23
Nodes (12): documentApi, useAdoptDocument(), useCreateDocument(), useDeleteDocument(), useDocumentListCache(), useProjectDocumentsRealtime(), useSetDocumentEditors(), useUpdateDocument() (+4 more)

### Community 25 - "Meeting Composer UI"
Cohesion: 0.16
Nodes (15): BRAND, BRAND_DEEP, chunk(), crc32(), crcTable, drawIcon(), encodePng(), FOLD (+7 more)

### Community 26 - "Notification Bell UI"
Cohesion: 0.26
Nodes (12): clampToViewport(), FloatingShortcut, PILL, read(), ShortcutIcon, ShortcutsState, useFloatingShortcuts, write() (+4 more)

### Community 27 - "Skin Catalog Data"
Cohesion: 0.21
Nodes (6): notificationApi, dropNotification(), useNotificationActions(), AppNotification, NotificationPayload, NotificationType

### Community 28 - "Edge Affordance Component"
Cohesion: 0.30
Nodes (11): teamApi, keyFor(), useCreateTeam(), useDeleteTeam(), useTeamRefresh(), useTeams(), useUpdateTeam(), CreateTeamPayload (+3 more)

### Community 29 - "AI Suggestion Streaming"
Cohesion: 0.18
Nodes (11): MeetingComposer(), MeetingComposerProps, nextHour(), dayKey(), MeetingRow, MeetingRowProps, MeetingsPanel(), MeetingsPanelProps (+3 more)

### Community 30 - "Text Board & Document Access"
Cohesion: 0.19
Nodes (8): deepLink(), NotificationBell(), NotificationOptIn(), DesktopNotice, hasDeclinedNotifications(), isSupported(), NotificationAccess, requestNotificationAccess()

### Community 31 - "Architecture & Stack Notes"
Cohesion: 0.23
Nodes (9): SETTINGS_SKIN_LIMIT, SKIN_BY_VALUE, SKIN_CATALOG, SkinDefinition, SkinPreview, leaf(), notch(), SkinMock() (+1 more)

### Community 32 - "Board Connector Layer"
Cohesion: 0.14
Nodes (13): CENTRE, EdgeAffordance(), EdgeAffordanceProps, GRADIENT, IRIS_GRADIENT, NavPinButton(), NavPinButtonProps, RAIL (+5 more)

### Community 33 - "Board Marquee Gestures"
Cohesion: 0.20
Nodes (12): DocumentAccessDialog(), DocumentAccessDialogProps, AnchorValue, NO_MEETINGS, NO_ROSTER, NO_TASKS, parseAnchor(), plain() (+4 more)

### Community 34 - "Board & Task Constants"
Cohesion: 0.18
Nodes (10): DirectionArrow(), DirectionArrowProps, EldritchTendrils(), EldritchTendrilsProps, GazeArrow(), GazeArrowProps, nextSighting(), Sighting (+2 more)

### Community 35 - "Nav Rail Preferences"
Cohesion: 0.17
Nodes (12): zustand, tailwindcss, Layered Dependency Rule (app→pages→widgets→features→entities→shared), Feature-Sliced Design, Optimistic Update Strategy, React 19, Sonner (toasts), Tailwind CSS (+4 more)

### Community 36 - "Eldritch Skin Icons"
Cohesion: 0.23
Nodes (9): Listener, Point, PositionBus, centreOf(), ConnectorLayer(), ConnectorLayerProps, curveBetween(), headTransform() (+1 more)

### Community 37 - "Hazard Skin Icons"
Cohesion: 0.18
Nodes (4): MarqueeOptions, Rect, ConnectBannerProps, SelectionBarProps

### Community 38 - "Underwater Skin Icons"
Cohesion: 0.23
Nodes (11): DEFAULTS, NavEdge, NavPreferencesState, PinnedEdges, RailScope, read(), readRailScope(), StoredPreferences (+3 more)

### Community 39 - "Volcano Skin Icons"
Cohesion: 0.17
Nodes (3): ELDRITCH_GLYPHS, EldritchMark(), Glyph()

### Community 40 - "Text Board Editor"
Cohesion: 0.17
Nodes (3): GlyphProps, HAZARD_GLYPHS, HazardMark()

### Community 44 - "HTML Sanitizer"
Cohesion: 0.18
Nodes (9): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PROJECT_SCOPES, STATUS_SWATCH, STATUSES, TaskFiltersProps (+1 more)

### Community 45 - "Autumn Skin Icons"
Cohesion: 0.24
Nodes (7): authApi, OAuthAvailability, OAuthProvider, SessionState, SessionStatus, useCurrentUser(), useSessionStore

### Community 46 - "Newspaper Skin Icons"
Cohesion: 0.22
Nodes (5): ChatDockState, PersistedDock, restored, useChatDock, write()

### Community 47 - "Space Skin Icons"
Cohesion: 0.18
Nodes (9): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PROJECT_SCOPES, STATUS_SWATCH, STATUSES, TaskFiltersProps (+1 more)

### Community 48 - "Query Cache Persistence"
Cohesion: 0.24
Nodes (9): ALLOWED_ATTRIBUTES, ALLOWED_STYLE_PROPERTIES, ALLOWED_TAGS, clean(), DISCARDED_TAGS, GLOBAL_ATTRIBUTES, isSafeUrl(), sanitizeDocumentHtml() (+1 more)

### Community 52 - "Chat & Whiteboard API"
Cohesion: 0.31
Nodes (9): clearPersistedQueries(), hydrateQueryCache(), isPersistable(), PERSISTED_PREFIXES, PersistedBlob, PersistedEntry, persistQueryCache(), read() (+1 more)

### Community 53 - "Package Manifest"
Cohesion: 0.20
Nodes (7): AutumnFall(), AutumnHedge(), AutumnHedgeProps, FALLING, LeafProps, LeafTone, TONE_FILL

### Community 54 - "Organization Create Dialog"
Cohesion: 0.28
Nodes (8): Task Studio Branding, App Icon Design (Sticky Note on Purple Gradient), favicon.svg (App Icon), Paper Sheet Gradient (Yellow/Gold), Peeled-Corner Sheet of Paper Icon (Task/Document Motif), Rounded Square Tile Shape, Text/Task Lines on Sheet, Tile Background Gradient (Indigo)

### Community 55 - "Organization Members Panel"
Cohesion: 0.28
Nodes (7): chatApi, whiteboardApi, ChatDelivery, ChatMessage, WhiteboardElement, WhiteboardElementType, WhiteboardStrokeData

### Community 56 - "Organization Projects Board"
Cohesion: 0.25
Nodes (7): description, engines, node, name, private, type, version

### Community 57 - "Rich Text Editor"
Cohesion: 0.25
Nodes (4): ASSIGNABLE_ROLES, InviteListProps, OrganizationDialogProps, ProjectPickerProps

### Community 58 - "Teams Panel UI"
Cohesion: 0.25
Nodes (4): ASSIGNABLE_ROLES, InviteFormProps, MemberRowProps, OrganizationMembersPanelProps

### Community 59 - "Hidden Sidebar Nav"
Cohesion: 0.29
Nodes (6): Lane, laneOf(), LANES, OrganizationProjectsBoard(), OrganizationProjectsBoardProps, ProjectCardProps

### Community 60 - "NPM Scripts"
Cohesion: 0.25
Nodes (4): COLORS, PromptKind, RichTextEditorProps, SIZES

### Community 61 - "App Layout Shell"
Cohesion: 0.29
Nodes (4): NoteCardProps, NoteChecklist(), NoteChecklistProps, TaskDetailModalProps

### Community 62 - "OAuth Buttons UI"
Cohesion: 0.29
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 63 - "Reusable UI Hooks"
Cohesion: 0.29
Nodes (7): scripts, build, dev, icons, lint, preview, typecheck

### Community 64 - "Runic Text Encoding"
Cohesion: 0.43
Nodes (5): AppLayout(), AGENDA_PREFETCH, rememberedBoardPage(), useRouteIntentPrefetch(), useShellPrefetch()

### Community 65 - "Route Intent Prefetch"
Cohesion: 0.29
Nodes (3): LABELS, MARKS, OAuthButtonsProps

### Community 66 - "Avatar Components"
Cohesion: 0.33
Nodes (4): COLUMNS, DraggableTask(), lockedHint(), TaskBoardProps

### Community 67 - "File Attachment UI"
Cohesion: 0.29
Nodes (3): TeamComposerProps, TeamRowProps, TeamsPanelProps

### Community 68 - "Hidden Sidebar (dup)"
Cohesion: 0.38
Nodes (3): useIsDesktop(), useIsTouchDevice(), useMediaQuery()

### Community 69 - "Vercel Deploy Config"
Cohesion: 0.33
Nodes (5): DIGRAPHS, LETTERS, RuneToken, runeTokens(), toRunes()

### Community 70 - "Skin Picker UI"
Cohesion: 0.38
Nodes (5): forget(), IntentHandlers, isSpeculationWelcome(), lastPrefetchedAt, useIntentPrefetch()

### Community 71 - "Whiteboard Canvas"
Cohesion: 0.38
Nodes (6): extensionOf(), FileAttachmentField(), FileAttachmentFieldProps, FileAttachmentRow(), FileAttachmentRowProps, formatFileSize()

### Community 72 - "DnD & Motion Libs"
Cohesion: 0.43
Nodes (5): GlyphSet, NavGlyphKey, GLYPH_SETS, NavGlyph(), NavGlyphProps

### Community 73 - "Document Byline UI"
Cohesion: 0.29
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 74 - "Task Board DnD"
Cohesion: 0.29
Nodes (6): buildCommand, framework, headers, outputDirectory, rewrites, $schema

### Community 75 - "Organization Dashboard UI"
Cohesion: 0.33
Nodes (3): SkinDefinition, SkinPreview, SKINS

### Community 76 - "Project Roster Panel"
Cohesion: 0.47
Nodes (5): isStroke(), readImageSize(), Tool, Whiteboard(), WhiteboardProps

### Community 77 - "Image Prep Utils"
Cohesion: 0.33
Nodes (6): @dnd-kit/core, framer-motion, @dnd-kit/core, framer-motion, 60fps Animation Rules, Two-tool Drag & Drop strategy

### Community 78 - "Edge Reveal Hook"
Cohesion: 0.40
Nodes (4): DocumentByline(), DocumentBylineProps, DocumentCreatorStampProps, nameFor()

### Community 80 - "Project Rail Widget"
Cohesion: 0.33
Nodes (3): ASSIGNABLE_ROLES, ROLE_ICON, RosterPanelProps

### Community 81 - "Whiteboard Component (variant)"
Cohesion: 0.47
Nodes (5): encodeAt(), PreparedImage, prepareImage(), PrepareOptions, scaleToFit()

### Community 82 - "Chat Pin Widget"
Cohesion: 0.33
Nodes (3): Edge, KeepOut, Options

### Community 83 - "Project Rail (dup)"
Cohesion: 0.33
Nodes (5): Avatar(), AvatarProps, AvatarStack(), AvatarStackProps, SIZES

### Community 84 - "Board Toolbar UI"
Cohesion: 0.33
Nodes (5): FieldShellProps, Input, InputProps, Textarea, TextareaProps

### Community 85 - "Invite Picker"
Cohesion: 0.40
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 86 - "Task Composer UI"
Cohesion: 0.47
Nodes (5): adoptStroke(), isStroke(), Tool, Whiteboard(), WhiteboardProps

### Community 88 - "Organization Page Shell"
Cohesion: 0.50
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 89 - "Task Menu Page"
Cohesion: 0.40
Nodes (3): InvitePickerProps, Person, Tab

### Community 90 - "API Env Config"
Cohesion: 0.40
Nodes (3): BoardTool, BoardToolbarProps, TOOLS

### Community 93 - "Expandable Stage UI"
Cohesion: 0.40
Nodes (3): EMPTY_ROSTER, PRIORITIES, TaskComposerProps

### Community 94 - "Route Error Boundary"
Cohesion: 0.50
Nodes (3): AgendaRowProps, dayKey(), MeetingsPage()

### Community 96 - "Select Popup Component"
Cohesion: 0.60
Nodes (3): AgendaSkeleton(), isSameDay(), TaskMenuPage()

### Community 97 - "Layout Switcher UI"
Cohesion: 0.50
Nodes (4): apiUrl, env, resolveApiUrl(), stripTrailingSlash()

### Community 99 - "PWA/Deploy Notes"
Cohesion: 0.40
Nodes (4): ExpandableStage(), ExpandableStageProps, ExpandToggle(), ExpandToggleProps

### Community 101 - "Image Drop Hook"
Cohesion: 0.50
Nodes (4): Mark, nextMark(), RuneScribe(), STAVES

### Community 102 - "Whiteboard Ink Layer"
Cohesion: 0.40
Nodes (4): PopupBox, Select(), SelectOption, SelectProps

### Community 105 - "Notes Board Page"
Cohesion: 0.50
Nodes (4): iOS/Safari PWA specifics, npm Scripts (dev/build/preview/typecheck/icons), vite-plugin-pwa / Workbox PWA setup, Vercel Deployment (vercel.json)

### Community 107 - "Project Page Shell"
Cohesion: 0.67
Nodes (3): fitImage(), ImageDropOptions, useImageDrop()

### Community 108 - "Theme Gallery Page"
Cohesion: 0.67
Nodes (3): InkLayer(), InkLayerProps, toPath()

### Community 110 - "Zoomable Image UI"
Cohesion: 0.67
Nodes (3): byNewest(), InvitationsPage(), UnifiedInvitation

### Community 114 - "Top Navigation Bar"
Cohesion: 0.67
Nodes (3): Bin, daysUntil(), RecycleBinPage()

### Community 118 - "Language Toggle UI"
Cohesion: 0.67
Nodes (3): RunicText(), RunicTextProps, seedOf()

### Community 119 - "Board Pager UI"
Cohesion: 0.67
Nodes (3): clamp(), ZoomableImage(), ZoomableImageProps

## Knowledge Gaps
- **482 isolated node(s):** `name`, `private`, `version`, `type`, `description` (+477 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **46 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `RouteBoundary` connect `Board Selection Logic` to `Frontend Dependencies`, `Image Upload Client`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Why does `dependencies` connect `UI Primitives Kit` to `Nav Rail Preferences`, `Hidden Edge Menus`, `Theme Toggle UI`, `Not Found Page`, `Offline Cache Purge`, `Image Prep Utils`, `Organization Projects Board`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Button Component` to `Organization Projects Board`, `Nav Rail Preferences`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _482 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Post-it Board Sync` be split into smaller, more focused modules?**
  _Cohesion score 0.05561105561105561 - nodes in this community are weakly interconnected._
- **Should `Task Completion Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.05593607305936073 - nodes in this community are weakly interconnected._
- **Should `App Bootstrap & Theming` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._