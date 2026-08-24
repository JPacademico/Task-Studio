# Graph Report - C:\Users\jorda\OneDrive\Documentos\GitHub\Task-Studio\Task-Studio-UI  (2026-08-24)

## Corpus Check
- 55 files · ~176,724 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1474 nodes · 1974 edges · 149 communities (100 shown, 49 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 103 edges (avg confidence: 0.54)
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
- Frontend Dependencies
- UI Primitives Kit
- Meeting API & Cache
- Studio Skin Icons
- Build Tooling Deps
- Node/Vite Build Config
- Button Component
- i18n Locale Engine
- Date Formatting Utils
- Icon Generation Script
- Image Upload Client
- Document API & Cache
- Floating Shortcuts Store
- Notification API & Cache
- Team API & Cache
- Meeting Composer UI
- Notification Bell UI
- Skin Catalog Data
- Edge Affordance Component
- AI Suggestion Streaming
- Direction Arrow & Eldritch Decor
- Architecture & Stack Notes
- Board Connector Layer
- Board Marquee Gestures
- Board & Task Constants
- Nav Rail Preferences
- Eldritch Skin Icons
- Hazard Skin Icons
- Runic Skin Icons
- Underwater Skin Icons
- Volcano Skin Icons
- Task Filters Config
- Auth API & Session
- Chat Dock Store
- Task Filters UI
- HTML Sanitizer
- Autumn Skin Icons
- Newspaper Skin Icons
- Space Skin Icons
- Query Cache Persistence
- Autumn Decor Elements
- Text Board Editor
- App Branding Assets
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
- Nav Glyph Kit
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
- Avatar Components
- Input Field Component
- Project Rail Widget
- Whiteboard Component (variant)
- Chat Pin Widget
- Project Rail (dup)
- Board Toolbar UI
- Organization Banner UI
- Task Composer UI
- Personal Agenda Page
- Organization Page Shell
- Task Menu Page
- API Env Config
- Expandable Stage UI
- Route Error Boundary
- Runic Decor Elements
- Select Popup Component
- Layout Switcher UI
- Skin Motion Hook
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
- Skin Motion (variant)
- Runic Text (variant)
- Zoomable Image UI
- Task Type Tag
- Settings Page (variant)
- Top Navigation Bar
- Pending Tasks Widget
- Tear-off Drag Hook
- Tear-off Ghost UI
- Language Toggle UI
- Board Pager UI
- Board Skeleton Loader
- Create Project Dialog
- Project Settings Dialog
- Task Detail Modal
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
- Query Key Registry
- Maskable Icon Asset
- CSS Theme Variables

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `compilerOptions` - 13 edges
3. `useBoardCache()` - 13 edges
4. `useProjectBoardCache()` - 11 edges
5. `GlyphSet` - 10 edges
6. `Note` - 10 edges
7. `useOrganizationRefresh()` - 10 edges
8. `Task Studio README` - 9 edges
9. `toDate()` - 9 edges
10. `GlyphProps` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Task Studio README` --references--> `@dnd-kit/core`  [EXTRACTED]
  README.md → package.json
- `Task Studio README` --references--> `framer-motion`  [EXTRACTED]
  README.md → package.json
- `Task Studio README` --references--> `zustand`  [EXTRACTED]
  README.md → package.json
- `Two-tool Drag & Drop strategy` --references--> `@dnd-kit/core`  [EXTRACTED]
  README.md → package.json
- `Two-tool Drag & Drop strategy` --references--> `framer-motion`  [EXTRACTED]
  README.md → package.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Pre-Paint Theme/Skin Bootstrap Flow** — index_theme_bootstrap_script, index_skins_map, index_steampunk_vintage_alias, src_app_providers_theme_provider_skin_attribute [INFERRED 0.85]
- **Performance-first Interaction Design Pattern** — readme_useedgereveal, readme_drag_and_drop_design, readme_60fps_rules [INFERRED 0.85]
- **PWA/iOS Delivery Flow** — readme_pwa_workbox, readme_ios_safari_specifics, readme_npm_scripts, readme_vercel_deployment [INFERRED 0.75]

## Communities (149 total, 49 thin omitted)

### Community 0 - "Post-it Board Sync"
Cohesion: 0.05
Nodes (59): boardApi, noteApi, EditableField, markLocalNoteEdit(), mergeRemoteNote(), pending, PendingEdit, prune() (+51 more)

### Community 1 - "Task Completion Logic"
Cohesion: 0.06
Nodes (59): taskApi, blockingAssigneeCount(), canCompleteTask(), completionBlockedReason(), CompletionContext, completionProgress(), isSharedTask(), outstandingAssignees() (+51 more)

### Community 2 - "App Bootstrap & Theming"
Cohesion: 0.05
Nodes (40): index.html Entry Document, SKINS Skin-Name Lookup Map, STEAMPUNK-to-VINTAGE Backward-Compat Alias, Pre-Paint Theme Bootstrap Script, viewport-fit=cover Safe-Area Rationale, App(), AppProviders(), QueryProvider() (+32 more)

### Community 3 - "Edge Rail Affordance"
Cohesion: 0.06
Nodes (33): CENTRE, EdgeAffordance(), EdgeAffordanceProps, GRADIENT, NavPinButton(), NavPinButtonProps, RAIL, RAIL_TONE (+25 more)

### Community 4 - "Auth Desk Scene"
Cohesion: 0.05
Nodes (18): AuthScene(), DeskObject(), DeskObjectProps, floatTransition(), AuthShell(), AuthShellProps, Phase, api (+10 more)

### Community 5 - "Project API & Cache"
Cohesion: 0.09
Nodes (21): ListProjectsParams, projectApi, patchProjectPinned(), patchRosterRemoval(), seedProjectFrom(), useProject(), useProjectIntentPrefetch(), useRemoveMember() (+13 more)

### Community 6 - "Organization API & Cache"
Cohesion: 0.09
Nodes (26): organizationApi, useAttachProject(), useCreateOrganization(), useDeleteOrganization(), useDetachProject(), useInviteToOrganization(), useOrganizationRefresh(), useRemoveOrganizationMember() (+18 more)

### Community 7 - "Task Layout Preferences"
Cohesion: 0.10
Nodes (24): DEFAULTS, LAYOUTS_FOR, LayoutSurface, read(), Stored, TaskLayout, useTaskLayout(), write() (+16 more)

### Community 8 - "Vite/TS Client Config"
Cohesion: 0.07
Nodes (27): DOM, DOM.Iterable, src, vite/client, vite-plugin-pwa/client, compilerOptions, baseUrl, isolatedModules (+19 more)

### Community 9 - "Frontend Dependencies"
Cohesion: 0.07
Nodes (27): axios, clsx, date-fns, @dnd-kit/modifiers, @hookform/resolvers, lucide-react, dependencies, axios (+19 more)

### Community 10 - "UI Primitives Kit"
Cohesion: 0.12
Nodes (22): Badge(), BadgeProps, Collapsible(), CollapsibleProps, ColorPicker(), ColorPickerProps, EmptyState(), EmptyStateProps (+14 more)

### Community 11 - "Meeting API & Cache"
Cohesion: 0.17
Nodes (20): meetingApi, byStart(), invalidateAgenda(), organizationKey(), projectKey(), removeMeeting(), upsertMeeting(), useCompleteMeeting() (+12 more)

### Community 12 - "Studio Skin Icons"
Cohesion: 0.12
Nodes (12): isRigidPaper(), MARKS, PageStack(), paperFor(), PAPERS, PostItGlyph(), PostItMark(), PostItMarkProps (+4 more)

### Community 13 - "Build Tooling Deps"
Cohesion: 0.11
Nodes (19): autoprefixer, devDependencies, autoprefixer, postcss, @types/node, @types/react, @types/react-dom, typescript (+11 more)

### Community 14 - "Node/Vite Build Config"
Cohesion: 0.11
Nodes (18): node, scripts/**/*.mjs, vite.config.ts, compilerOptions, allowSyntheticDefaultImports, isolatedModules, lib, module (+10 more)

### Community 15 - "Button Component"
Cohesion: 0.12
Nodes (14): Button, ButtonProps, GAPS, Size, SIZES, Variant, VARIANTS, Modal() (+6 more)

### Community 16 - "i18n Locale Engine"
Cohesion: 0.19
Nodes (15): detectLocale(), LocaleState, substitute(), syncDocumentLang(), Translate, useLocale(), useLocaleStore, useT() (+7 more)

### Community 17 - "Date Formatting Utils"
Cohesion: 0.21
Nodes (16): DATE_INPUT_MAX, DATE_INPUT_MIN, dateLocale(), formatDateTime(), formatDayLabel(), formatDeadline(), formatDeadlineDate(), formatRelative() (+8 more)

### Community 18 - "Icon Generation Script"
Cohesion: 0.16
Nodes (15): BRAND, BRAND_DEEP, chunk(), crc32(), crcTable, drawIcon(), encodePng(), FOLD (+7 more)

### Community 19 - "Image Upload Client"
Cohesion: 0.17
Nodes (13): PresignedUpload, putObject(), UploadedImage, uploadImage(), UploadImageOptions, UploadScope, userApi, AuthSession (+5 more)

### Community 20 - "Document API & Cache"
Cohesion: 0.26
Nodes (10): documentApi, useAdoptDocument(), useCreateDocument(), useDeleteDocument(), useDocumentListCache(), useProjectDocumentsRealtime(), useUpdateDocument(), CreateDocumentPayload (+2 more)

### Community 21 - "Floating Shortcuts Store"
Cohesion: 0.26
Nodes (12): clampToViewport(), FloatingShortcut, PILL, read(), ShortcutIcon, ShortcutsState, useFloatingShortcuts, write() (+4 more)

### Community 22 - "Notification API & Cache"
Cohesion: 0.21
Nodes (6): notificationApi, dropNotification(), useNotificationActions(), AppNotification, NotificationPayload, NotificationType

### Community 23 - "Team API & Cache"
Cohesion: 0.30
Nodes (11): teamApi, keyFor(), useCreateTeam(), useDeleteTeam(), useTeamRefresh(), useTeams(), useUpdateTeam(), CreateTeamPayload (+3 more)

### Community 24 - "Meeting Composer UI"
Cohesion: 0.18
Nodes (11): MeetingComposer(), MeetingComposerProps, nextHour(), dayKey(), MeetingRow, MeetingRowProps, MeetingsPanel(), MeetingsPanelProps (+3 more)

### Community 25 - "Notification Bell UI"
Cohesion: 0.19
Nodes (8): deepLink(), NotificationBell(), NotificationOptIn(), DesktopNotice, hasDeclinedNotifications(), isSupported(), NotificationAccess, requestNotificationAccess()

### Community 26 - "Skin Catalog Data"
Cohesion: 0.23
Nodes (9): SETTINGS_SKIN_LIMIT, SKIN_BY_VALUE, SKIN_CATALOG, SkinDefinition, SkinPreview, leaf(), notch(), SkinMock() (+1 more)

### Community 27 - "Edge Affordance Component"
Cohesion: 0.14
Nodes (13): CENTRE, EdgeAffordance(), EdgeAffordanceProps, GRADIENT, IRIS_GRADIENT, NavPinButton(), NavPinButtonProps, RAIL (+5 more)

### Community 28 - "AI Suggestion Streaming"
Cohesion: 0.27
Nodes (10): aiApi, AiSuggestion, ProjectTaskSuggestion, SubtaskSuggestion, JobEvent, StreamStatus, useSuggestionStream(), AiPanel() (+2 more)

### Community 29 - "Direction Arrow & Eldritch Decor"
Cohesion: 0.18
Nodes (10): DirectionArrow(), DirectionArrowProps, EldritchTendrils(), EldritchTendrilsProps, GazeArrow(), GazeArrowProps, nextSighting(), Sighting (+2 more)

### Community 30 - "Architecture & Stack Notes"
Cohesion: 0.17
Nodes (12): zustand, tailwindcss, Layered Dependency Rule (app→pages→widgets→features→entities→shared), Feature-Sliced Design, Optimistic Update Strategy, React 19, Sonner (toasts), Tailwind CSS (+4 more)

### Community 31 - "Board Connector Layer"
Cohesion: 0.23
Nodes (9): Listener, Point, PositionBus, centreOf(), ConnectorLayer(), ConnectorLayerProps, curveBetween(), headTransform() (+1 more)

### Community 32 - "Board Marquee Gestures"
Cohesion: 0.18
Nodes (4): MarqueeOptions, Rect, ConnectBannerProps, SelectionBarProps

### Community 33 - "Board & Task Constants"
Cohesion: 0.17
Nodes (11): BOARD_INK_COLORS, CONNECTOR_COLORS, EDGE_REVEAL_PX, MAX_BOARD_PAGES, NOTE_COLORS, STORAGE_KEYS, TASK_COLORS, TASK_PRIORITY_META (+3 more)

### Community 34 - "Nav Rail Preferences"
Cohesion: 0.23
Nodes (11): DEFAULTS, NavEdge, NavPreferencesState, PinnedEdges, RailScope, read(), readRailScope(), StoredPreferences (+3 more)

### Community 35 - "Eldritch Skin Icons"
Cohesion: 0.17
Nodes (3): ELDRITCH_GLYPHS, EldritchMark(), Glyph()

### Community 36 - "Hazard Skin Icons"
Cohesion: 0.17
Nodes (3): GlyphProps, HAZARD_GLYPHS, HazardMark()

### Community 40 - "Task Filters Config"
Cohesion: 0.18
Nodes (9): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PROJECT_SCOPES, STATUS_SWATCH, STATUSES, TaskFiltersProps (+1 more)

### Community 41 - "Auth API & Session"
Cohesion: 0.24
Nodes (7): authApi, OAuthAvailability, OAuthProvider, SessionState, SessionStatus, useCurrentUser(), useSessionStore

### Community 42 - "Chat Dock Store"
Cohesion: 0.22
Nodes (5): ChatDockState, PersistedDock, restored, useChatDock, write()

### Community 43 - "Task Filters UI"
Cohesion: 0.18
Nodes (9): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PROJECT_SCOPES, STATUS_SWATCH, STATUSES, TaskFiltersProps (+1 more)

### Community 44 - "HTML Sanitizer"
Cohesion: 0.24
Nodes (9): ALLOWED_ATTRIBUTES, ALLOWED_STYLE_PROPERTIES, ALLOWED_TAGS, clean(), DISCARDED_TAGS, GLOBAL_ATTRIBUTES, isSafeUrl(), sanitizeDocumentHtml() (+1 more)

### Community 48 - "Query Cache Persistence"
Cohesion: 0.31
Nodes (9): clearPersistedQueries(), hydrateQueryCache(), isPersistable(), PERSISTED_PREFIXES, PersistedBlob, PersistedEntry, persistQueryCache(), read() (+1 more)

### Community 49 - "Autumn Decor Elements"
Cohesion: 0.20
Nodes (7): AutumnFall(), AutumnHedge(), AutumnHedgeProps, FALLING, LeafProps, LeafTone, TONE_FILL

### Community 50 - "Text Board Editor"
Cohesion: 0.29
Nodes (9): AnchorValue, NO_MEETINGS, NO_TASKS, parseAnchor(), plain(), TextBoard(), TextBoardProps, toDownloadableHtml() (+1 more)

### Community 51 - "App Branding Assets"
Cohesion: 0.28
Nodes (8): Task Studio Branding, App Icon Design (Sticky Note on Purple Gradient), favicon.svg (App Icon), Paper Sheet Gradient (Yellow/Gold), Peeled-Corner Sheet of Paper Icon (Task/Document Motif), Rounded Square Tile Shape, Text/Task Lines on Sheet, Tile Background Gradient (Indigo)

### Community 52 - "Chat & Whiteboard API"
Cohesion: 0.28
Nodes (7): chatApi, whiteboardApi, ChatDelivery, ChatMessage, WhiteboardElement, WhiteboardElementType, WhiteboardStrokeData

### Community 53 - "Package Manifest"
Cohesion: 0.25
Nodes (7): description, engines, node, name, private, type, version

### Community 54 - "Organization Create Dialog"
Cohesion: 0.25
Nodes (4): ASSIGNABLE_ROLES, InviteListProps, OrganizationDialogProps, ProjectPickerProps

### Community 55 - "Organization Members Panel"
Cohesion: 0.25
Nodes (4): ASSIGNABLE_ROLES, InviteFormProps, MemberRowProps, OrganizationMembersPanelProps

### Community 56 - "Organization Projects Board"
Cohesion: 0.29
Nodes (6): Lane, laneOf(), LANES, OrganizationProjectsBoard(), OrganizationProjectsBoardProps, ProjectCardProps

### Community 57 - "Rich Text Editor"
Cohesion: 0.25
Nodes (4): COLORS, PromptKind, RichTextEditorProps, SIZES

### Community 58 - "Teams Panel UI"
Cohesion: 0.25
Nodes (3): TeamComposerProps, TeamRowProps, TeamsPanelProps

### Community 59 - "Hidden Sidebar Nav"
Cohesion: 0.29
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 60 - "NPM Scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, icons, lint, preview, typecheck

### Community 61 - "App Layout Shell"
Cohesion: 0.43
Nodes (5): AppLayout(), AGENDA_PREFETCH, rememberedBoardPage(), useRouteIntentPrefetch(), useShellPrefetch()

### Community 62 - "OAuth Buttons UI"
Cohesion: 0.29
Nodes (3): LABELS, MARKS, OAuthButtonsProps

### Community 63 - "Reusable UI Hooks"
Cohesion: 0.38
Nodes (3): useIsDesktop(), useIsTouchDevice(), useMediaQuery()

### Community 64 - "Runic Text Encoding"
Cohesion: 0.33
Nodes (5): DIGRAPHS, LETTERS, RuneToken, runeTokens(), toRunes()

### Community 65 - "Route Intent Prefetch"
Cohesion: 0.38
Nodes (5): forget(), IntentHandlers, isSpeculationWelcome(), lastPrefetchedAt, useIntentPrefetch()

### Community 66 - "Nav Glyph Kit"
Cohesion: 0.43
Nodes (5): GlyphSet, NavGlyphKey, GLYPH_SETS, NavGlyph(), NavGlyphProps

### Community 67 - "Hidden Sidebar (dup)"
Cohesion: 0.29
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 68 - "Vercel Deploy Config"
Cohesion: 0.29
Nodes (6): buildCommand, framework, headers, outputDirectory, rewrites, $schema

### Community 69 - "Skin Picker UI"
Cohesion: 0.33
Nodes (3): SkinDefinition, SkinPreview, SKINS

### Community 70 - "Whiteboard Canvas"
Cohesion: 0.47
Nodes (5): isStroke(), readImageSize(), Tool, Whiteboard(), WhiteboardProps

### Community 71 - "DnD & Motion Libs"
Cohesion: 0.33
Nodes (6): @dnd-kit/core, framer-motion, @dnd-kit/core, framer-motion, 60fps Animation Rules, Two-tool Drag & Drop strategy

### Community 72 - "Document Byline UI"
Cohesion: 0.40
Nodes (4): DocumentByline(), DocumentBylineProps, DocumentCreatorStampProps, nameFor()

### Community 75 - "Project Roster Panel"
Cohesion: 0.33
Nodes (3): ASSIGNABLE_ROLES, ROLE_ICON, RosterPanelProps

### Community 76 - "Image Prep Utils"
Cohesion: 0.47
Nodes (5): encodeAt(), PreparedImage, prepareImage(), PrepareOptions, scaleToFit()

### Community 77 - "Edge Reveal Hook"
Cohesion: 0.33
Nodes (3): Edge, KeepOut, Options

### Community 78 - "Avatar Components"
Cohesion: 0.33
Nodes (5): Avatar(), AvatarProps, AvatarStack(), AvatarStackProps, SIZES

### Community 79 - "Input Field Component"
Cohesion: 0.33
Nodes (5): FieldShellProps, Input, InputProps, Textarea, TextareaProps

### Community 80 - "Project Rail Widget"
Cohesion: 0.40
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 81 - "Whiteboard Component (variant)"
Cohesion: 0.47
Nodes (5): adoptStroke(), isStroke(), Tool, Whiteboard(), WhiteboardProps

### Community 83 - "Project Rail (dup)"
Cohesion: 0.50
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 84 - "Board Toolbar UI"
Cohesion: 0.40
Nodes (3): BoardTool, BoardToolbarProps, TOOLS

### Community 86 - "Task Composer UI"
Cohesion: 0.40
Nodes (3): EMPTY_ROSTER, PRIORITIES, TaskComposerProps

### Community 87 - "Personal Agenda Page"
Cohesion: 0.50
Nodes (3): AgendaRowProps, dayKey(), MeetingsPage()

### Community 89 - "Task Menu Page"
Cohesion: 0.60
Nodes (3): AgendaSkeleton(), isSameDay(), TaskMenuPage()

### Community 90 - "API Env Config"
Cohesion: 0.50
Nodes (4): apiUrl, env, resolveApiUrl(), stripTrailingSlash()

### Community 92 - "Expandable Stage UI"
Cohesion: 0.40
Nodes (4): ExpandableStage(), ExpandableStageProps, ExpandToggle(), ExpandToggleProps

### Community 94 - "Runic Decor Elements"
Cohesion: 0.50
Nodes (4): Mark, nextMark(), RuneScribe(), STAVES

### Community 95 - "Select Popup Component"
Cohesion: 0.40
Nodes (4): PopupBox, Select(), SelectOption, SelectProps

### Community 98 - "PWA/Deploy Notes"
Cohesion: 0.50
Nodes (4): iOS/Safari PWA specifics, npm Scripts (dev/build/preview/typecheck/icons), vite-plugin-pwa / Workbox PWA setup, Vercel Deployment (vercel.json)

### Community 100 - "Image Drop Hook"
Cohesion: 0.67
Nodes (3): fitImage(), ImageDropOptions, useImageDrop()

### Community 101 - "Whiteboard Ink Layer"
Cohesion: 0.67
Nodes (3): InkLayer(), InkLayerProps, toPath()

### Community 103 - "Invitations Page"
Cohesion: 0.67
Nodes (3): byNewest(), InvitationsPage(), UnifiedInvitation

### Community 109 - "Runic Text (variant)"
Cohesion: 0.67
Nodes (3): RunicText(), RunicTextProps, seedOf()

### Community 110 - "Zoomable Image UI"
Cohesion: 0.67
Nodes (3): clamp(), ZoomableImage(), ZoomableImageProps

## Knowledge Gaps
- **452 isolated node(s):** `name`, `private`, `version`, `type`, `description` (+447 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **49 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Frontend Dependencies` to `DnD Sortable Lib`, `DnD Utilities Lib`, `React Core Lib`, `Toast Notifications Lib`, `DnD & Motion Libs`, `Package Manifest`, `Architecture & Stack Notes`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Build Tooling Deps` to `Package Manifest`, `Architecture & Stack Notes`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Why does `Task Studio README` connect `Architecture & Stack Notes` to `DnD & Motion Libs`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _452 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Post-it Board Sync` be split into smaller, more focused modules?**
  _Cohesion score 0.05299608551641072 - nodes in this community are weakly interconnected._
- **Should `Task Completion Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.057511737089201875 - nodes in this community are weakly interconnected._
- **Should `App Bootstrap & Theming` be split into smaller, more focused modules?**
  _Cohesion score 0.05019607843137255 - nodes in this community are weakly interconnected._