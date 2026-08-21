# Graph Report - .  (2026-08-21)

## Corpus Check
- 51 files · ~152,857 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1373 nodes · 1832 edges · 147 communities (91 shown, 56 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 101 edges (avg confidence: 0.54)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Notes & Whiteboard API
- Task API & Completion Rules
- Edge Affordance & Nav Pin
- App Bootstrap & Theme Init
- Auth Scene Desk Objects
- PostCSS Build Config
- Project API & Queries
- TS App Config
- Task View Layouts
- Shared UI Primitives
- Paper Skin Icon Set
- Vite/Node Build Config
- Runic Alphabet Reference
- Button Component
- i18n Locale System
- Hazard Skin Icon Set
- Icon Generation Script
- User Upload API
- Document API & Queries
- Floating Shortcuts Store
- Skin Catalogue
- Autumn Skin Icon Set
- Edge Affordance Component
- Frontend Dependencies
- Eldritch Skin Decor
- Architecture Principles (FSD)
- Note Connector Position Bus
- Board Gesture Hooks
- Runic Skin Icon Set
- Underwater Skin Icon Set
- Volcano Skin Icon Set
- Task Filters Constants
- Chat Dock Store
- Task Filters UI
- Shared UI Constants
- Date Formatting Helpers
- HTML Sanitizer
- Eldritch Skin Icon Set
- Newspaper Skin Icon Set
- Space Skin Icon Set
- Autumn Skin Decor
- App Branding & Icons
- Chat & Whiteboard API
- Notification API & Queries
- Auth API & Session Store
- Nav Preferences Store
- AI Suggestions API
- Rich Text Editor
- Hidden Sidebar Nav
- Touch/Desktop Hooks
- Hidden Sidebar Component
- Whiteboard Tool Logic
- Vercel Deploy Config
- Skin Picker UI
- Whiteboard Component
- Animation Dependencies
- Document Byline
- Task Board Columns
- Image Prepare/Upload
- Avatar Component
- Input/Textarea Fields
- Text Board Widget
- Chat Pin (Dock Tack)
- Project Rail Widget
- Board Toolbar
- Notes Board Page
- Env Config Resolution
- Colour Utilities
- Expandable Stage
- Route Error Boundary
- Project Rail UI
- Layout Switcher
- Skin Motion Hook
- PWA & Deploy Docs
- Note Marquee Selection
- Ink Layer (Freehand)
- Chat Pin Component
- Roster Panel
- Task Composer
- Project Page
- Theme Gallery Page
- Edge Reveal Hook
- Select Dropdown
- Task Type Tag
- Floating Shortcut Layer
- Settings Page (root)
- Top Navigation (root)
- Tear-Off Gesture Hook
- Tear-Off Ghost UI
- Language Toggle
- Notes Board Pager
- Notification Bell
- Create Project Dialog
- Task Detail Modal
- Dashboard Page
- Recycle Bin Page
- Settings Page
- Task Menu Page
- Underwater Skin Decor
- Project Chat Widget
- Top Navigation
- TS Root Config
- date-fns Dependency
- dnd-kit Sortable Dep
- lucide-react Dependency
- React Dependency
- react-dom Dependency
- react-hook-form Dependency
- react-router-dom Dependency
- socket.io-client Dependency
- tailwind-merge Dependency
- zod Dependency
- PWA Manifest & Icon
- PWA App Identity
- Hidden Edge Menu Design
- App Layout Shell
- Theme Toggle
- Invitations Page
- Not Found Page
- Offline Cache Purge
- Query Key Registry
- cn() Classname Helper
- Project Dashboard Widget
- Tailwind Config
- Vite Deploy Guard
- PostCSS Config File
- Maskable App Icon
- CSS Theme Variables
- Tailwind Config
- Vite Build Config
- PostCSS Config
- PWA Maskable Icon
- Query Key Registry
- Maskable App Icon
- CSS Theme Variables

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `compilerOptions` - 13 edges
3. `useBoardCache()` - 13 edges
4. `useProjectBoardCache()` - 11 edges
5. `GlyphSet` - 10 edges
6. `Task Studio README` - 9 edges
7. `useInvalidateTasks()` - 9 edges
8. `Task` - 9 edges
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

## Communities (147 total, 56 thin omitted)

### Community 0 - "Notes & Whiteboard API"
Cohesion: 0.05
Nodes (57): boardApi, noteApi, EditableField, markLocalNoteEdit(), mergeRemoteNote(), pending, PendingEdit, prune() (+49 more)

### Community 1 - "Task API & Completion Rules"
Cohesion: 0.06
Nodes (53): taskApi, blockingAssigneeCount(), canCompleteTask(), completionBlockedReason(), CompletionContext, completionProgress(), isSharedTask(), outstandingAssignees() (+45 more)

### Community 2 - "Edge Affordance & Nav Pin"
Cohesion: 0.06
Nodes (33): CENTRE, EdgeAffordance(), EdgeAffordanceProps, GRADIENT, NavPinButton(), NavPinButtonProps, RAIL, RAIL_TONE (+25 more)

### Community 3 - "App Bootstrap & Theme Init"
Cohesion: 0.05
Nodes (39): index.html Entry Document, SKINS Skin-Name Lookup Map, STEAMPUNK-to-VINTAGE Backward-Compat Alias, Pre-Paint Theme Bootstrap Script, viewport-fit=cover Safe-Area Rationale, App(), AppProviders(), QueryProvider() (+31 more)

### Community 4 - "Auth Scene Desk Objects"
Cohesion: 0.05
Nodes (18): AuthScene(), DeskObject(), DeskObjectProps, floatTransition(), AuthShell(), AuthShellProps, Phase, api (+10 more)

### Community 5 - "PostCSS Build Config"
Cohesion: 0.09
Nodes (21): ListProjectsParams, projectApi, patchProjectPinned(), patchRosterRemoval(), seedProjectFrom(), useProject(), useProjectIntentPrefetch(), useRemoveMember() (+13 more)

### Community 6 - "Project API & Queries"
Cohesion: 0.06
Nodes (33): autoprefixer, description, devDependencies, autoprefixer, postcss, @types/node, @types/react, @types/react-dom (+25 more)

### Community 7 - "TS App Config"
Cohesion: 0.07
Nodes (27): DOM, DOM.Iterable, src, vite/client, vite-plugin-pwa/client, compilerOptions, baseUrl, isolatedModules (+19 more)

### Community 8 - "Task View Layouts"
Cohesion: 0.12
Nodes (22): DEFAULTS, LAYOUTS_FOR, LayoutSurface, read(), Stored, TaskLayout, useTaskLayout(), write() (+14 more)

### Community 9 - "Shared UI Primitives"
Cohesion: 0.12
Nodes (23): Badge(), BadgeProps, Collapsible(), CollapsibleProps, ColorPicker(), ColorPickerProps, EmptyState(), EmptyStateProps (+15 more)

### Community 10 - "Paper Skin Icon Set"
Cohesion: 0.20
Nodes (18): meetingApi, byStart(), invalidateAgenda(), listKey(), removeMeeting(), upsertMeeting(), useCompleteMeeting(), useCreateMeeting() (+10 more)

### Community 11 - "Vite/Node Build Config"
Cohesion: 0.12
Nodes (12): isRigidPaper(), MARKS, PageStack(), paperFor(), PAPERS, PostItGlyph(), PostItMark(), PostItMarkProps (+4 more)

### Community 12 - "Runic Alphabet Reference"
Cohesion: 0.11
Nodes (18): node, scripts/**/*.mjs, vite.config.ts, compilerOptions, allowSyntheticDefaultImports, isolatedModules, lib, module (+10 more)

### Community 13 - "Button Component"
Cohesion: 0.18
Nodes (13): organizationApi, useAttachProject(), useCreateOrganization(), useDeleteOrganization(), useDetachProject(), useOrganizationRefresh(), useUpdateOrganization(), AttachableProject (+5 more)

### Community 14 - "i18n Locale System"
Cohesion: 0.12
Nodes (14): Button, ButtonProps, GAPS, Size, SIZES, Variant, VARIANTS, Modal() (+6 more)

### Community 15 - "Hazard Skin Icon Set"
Cohesion: 0.19
Nodes (15): detectLocale(), LocaleState, substitute(), syncDocumentLang(), Translate, useLocale(), useLocaleStore, useT() (+7 more)

### Community 16 - "Icon Generation Script"
Cohesion: 0.21
Nodes (16): DATE_INPUT_MAX, DATE_INPUT_MIN, dateLocale(), formatDateTime(), formatDayLabel(), formatDeadline(), formatDeadlineDate(), formatRelative() (+8 more)

### Community 17 - "User Upload API"
Cohesion: 0.16
Nodes (15): BRAND, BRAND_DEEP, chunk(), crc32(), crcTable, drawIcon(), encodePng(), FOLD (+7 more)

### Community 18 - "Document API & Queries"
Cohesion: 0.17
Nodes (13): PresignedUpload, putObject(), UploadedImage, uploadImage(), UploadImageOptions, UploadScope, userApi, AuthSession (+5 more)

### Community 19 - "Floating Shortcuts Store"
Cohesion: 0.26
Nodes (10): documentApi, useAdoptDocument(), useCreateDocument(), useDeleteDocument(), useDocumentListCache(), useProjectDocumentsRealtime(), useUpdateDocument(), CreateDocumentPayload (+2 more)

### Community 20 - "Skin Catalogue"
Cohesion: 0.26
Nodes (12): clampToViewport(), FloatingShortcut, PILL, read(), ShortcutIcon, ShortcutsState, useFloatingShortcuts, write() (+4 more)

### Community 21 - "Autumn Skin Icon Set"
Cohesion: 0.18
Nodes (11): MeetingComposer(), MeetingComposerProps, nextHour(), dayKey(), MeetingRow, MeetingRowProps, MeetingsPanel(), MeetingsPanelProps (+3 more)

### Community 22 - "Edge Affordance Component"
Cohesion: 0.19
Nodes (8): deepLink(), NotificationBell(), NotificationOptIn(), DesktopNotice, hasDeclinedNotifications(), isSupported(), NotificationAccess, requestNotificationAccess()

### Community 23 - "Frontend Dependencies"
Cohesion: 0.23
Nodes (9): SETTINGS_SKIN_LIMIT, SKIN_BY_VALUE, SKIN_CATALOG, SkinDefinition, SkinPreview, leaf(), notch(), SkinMock() (+1 more)

### Community 24 - "Eldritch Skin Decor"
Cohesion: 0.14
Nodes (13): CENTRE, EdgeAffordance(), EdgeAffordanceProps, GRADIENT, IRIS_GRADIENT, NavPinButton(), NavPinButtonProps, RAIL (+5 more)

### Community 25 - "Architecture Principles (FSD)"
Cohesion: 0.15
Nodes (13): axios, date-fns, @dnd-kit/modifiers, @dnd-kit/utilities, @hookform/resolvers, dependencies, axios, date-fns (+5 more)

### Community 26 - "Note Connector Position Bus"
Cohesion: 0.27
Nodes (10): aiApi, AiSuggestion, ProjectTaskSuggestion, SubtaskSuggestion, JobEvent, StreamStatus, useSuggestionStream(), AiPanel() (+2 more)

### Community 27 - "Board Gesture Hooks"
Cohesion: 0.18
Nodes (10): DirectionArrow(), DirectionArrowProps, EldritchTendrils(), EldritchTendrilsProps, GazeArrow(), GazeArrowProps, nextSighting(), Sighting (+2 more)

### Community 28 - "Runic Skin Icon Set"
Cohesion: 0.17
Nodes (12): zustand, tailwindcss, Layered Dependency Rule (app→pages→widgets→features→entities→shared), Feature-Sliced Design, Optimistic Update Strategy, React 19, Sonner (toasts), Tailwind CSS (+4 more)

### Community 29 - "Underwater Skin Icon Set"
Cohesion: 0.23
Nodes (9): Listener, Point, PositionBus, centreOf(), ConnectorLayer(), ConnectorLayerProps, curveBetween(), headTransform() (+1 more)

### Community 30 - "Volcano Skin Icon Set"
Cohesion: 0.18
Nodes (4): MarqueeOptions, Rect, ConnectBannerProps, SelectionBarProps

### Community 31 - "Task Filters Constants"
Cohesion: 0.17
Nodes (11): BOARD_INK_COLORS, CONNECTOR_COLORS, EDGE_REVEAL_PX, MAX_BOARD_PAGES, NOTE_COLORS, STORAGE_KEYS, TASK_COLORS, TASK_PRIORITY_META (+3 more)

### Community 32 - "Chat Dock Store"
Cohesion: 0.17
Nodes (3): ELDRITCH_GLYPHS, EldritchMark(), Glyph()

### Community 33 - "Task Filters UI"
Cohesion: 0.17
Nodes (3): GlyphProps, HAZARD_GLYPHS, HazardMark()

### Community 37 - "Eldritch Skin Icon Set"
Cohesion: 0.18
Nodes (9): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PROJECT_SCOPES, STATUS_SWATCH, STATUSES, TaskFiltersProps (+1 more)

### Community 38 - "Newspaper Skin Icon Set"
Cohesion: 0.24
Nodes (7): authApi, OAuthAvailability, OAuthProvider, SessionState, SessionStatus, useCurrentUser(), useSessionStore

### Community 39 - "Space Skin Icon Set"
Cohesion: 0.22
Nodes (5): ChatDockState, PersistedDock, restored, useChatDock, write()

### Community 40 - "Autumn Skin Decor"
Cohesion: 0.18
Nodes (9): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PROJECT_SCOPES, STATUS_SWATCH, STATUSES, TaskFiltersProps (+1 more)

### Community 41 - "App Branding & Icons"
Cohesion: 0.24
Nodes (9): ALLOWED_ATTRIBUTES, ALLOWED_STYLE_PROPERTIES, ALLOWED_TAGS, clean(), DISCARDED_TAGS, GLOBAL_ATTRIBUTES, isSafeUrl(), sanitizeDocumentHtml() (+1 more)

### Community 45 - "Nav Preferences Store"
Cohesion: 0.31
Nodes (5): notificationApi, dropNotification(), useNotificationActions(), AppNotification, NotificationType

### Community 46 - "AI Suggestions API"
Cohesion: 0.31
Nodes (9): clearPersistedQueries(), hydrateQueryCache(), isPersistable(), PERSISTED_PREFIXES, PersistedBlob, PersistedEntry, persistQueryCache(), read() (+1 more)

### Community 47 - "Rich Text Editor"
Cohesion: 0.27
Nodes (9): DEFAULTS, NavEdge, NavPreferencesState, PinnedEdges, read(), StoredPreferences, useIsNavPinned(), useNavPreferences (+1 more)

### Community 48 - "Hidden Sidebar Nav"
Cohesion: 0.20
Nodes (7): AutumnFall(), AutumnHedge(), AutumnHedgeProps, FALLING, LeafProps, LeafTone, TONE_FILL

### Community 49 - "Touch/Desktop Hooks"
Cohesion: 0.29
Nodes (9): AnchorValue, NO_MEETINGS, NO_TASKS, parseAnchor(), plain(), TextBoard(), TextBoardProps, toDownloadableHtml() (+1 more)

### Community 50 - "Hidden Sidebar Component"
Cohesion: 0.28
Nodes (8): Task Studio Branding, App Icon Design (Sticky Note on Purple Gradient), favicon.svg (App Icon), Paper Sheet Gradient (Yellow/Gold), Peeled-Corner Sheet of Paper Icon (Task/Document Motif), Rounded Square Tile Shape, Text/Task Lines on Sheet, Tile Background Gradient (Indigo)

### Community 51 - "Whiteboard Tool Logic"
Cohesion: 0.28
Nodes (7): chatApi, whiteboardApi, ChatDelivery, ChatMessage, WhiteboardElement, WhiteboardElementType, WhiteboardStrokeData

### Community 52 - "Vercel Deploy Config"
Cohesion: 0.25
Nodes (4): COLORS, PromptKind, RichTextEditorProps, SIZES

### Community 53 - "Skin Picker UI"
Cohesion: 0.29
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 54 - "Whiteboard Component"
Cohesion: 0.43
Nodes (5): AppLayout(), AGENDA_PREFETCH, rememberedBoardPage(), useRouteIntentPrefetch(), useShellPrefetch()

### Community 55 - "Animation Dependencies"
Cohesion: 0.29
Nodes (3): LABELS, MARKS, OAuthButtonsProps

### Community 56 - "Document Byline"
Cohesion: 0.38
Nodes (3): useIsDesktop(), useIsTouchDevice(), useMediaQuery()

### Community 57 - "Task Board Columns"
Cohesion: 0.33
Nodes (5): DIGRAPHS, LETTERS, RuneToken, runeTokens(), toRunes()

### Community 58 - "Image Prepare/Upload"
Cohesion: 0.38
Nodes (5): forget(), IntentHandlers, isSpeculationWelcome(), lastPrefetchedAt, useIntentPrefetch()

### Community 59 - "Avatar Component"
Cohesion: 0.43
Nodes (5): GlyphSet, NavGlyphKey, GLYPH_SETS, NavGlyph(), NavGlyphProps

### Community 60 - "Input/Textarea Fields"
Cohesion: 0.29
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 61 - "Text Board Widget"
Cohesion: 0.29
Nodes (6): buildCommand, framework, headers, outputDirectory, rewrites, $schema

### Community 62 - "Chat Pin (Dock Tack)"
Cohesion: 0.33
Nodes (3): SkinDefinition, SkinPreview, SKINS

### Community 63 - "Project Rail Widget"
Cohesion: 0.47
Nodes (5): isStroke(), readImageSize(), Tool, Whiteboard(), WhiteboardProps

### Community 64 - "Board Toolbar"
Cohesion: 0.33
Nodes (6): @dnd-kit/core, framer-motion, @dnd-kit/core, framer-motion, 60fps Animation Rules, Two-tool Drag & Drop strategy

### Community 65 - "Notes Board Page"
Cohesion: 0.40
Nodes (4): DocumentByline(), DocumentBylineProps, DocumentCreatorStampProps, nameFor()

### Community 68 - "Expandable Stage"
Cohesion: 0.47
Nodes (5): encodeAt(), PreparedImage, prepareImage(), PrepareOptions, scaleToFit()

### Community 69 - "Route Error Boundary"
Cohesion: 0.33
Nodes (3): Edge, KeepOut, Options

### Community 70 - "Project Rail UI"
Cohesion: 0.33
Nodes (5): Avatar(), AvatarProps, AvatarStack(), AvatarStackProps, SIZES

### Community 71 - "Layout Switcher"
Cohesion: 0.33
Nodes (5): FieldShellProps, Input, InputProps, Textarea, TextareaProps

### Community 72 - "Skin Motion Hook"
Cohesion: 0.47
Nodes (5): adoptStroke(), isStroke(), Tool, Whiteboard(), WhiteboardProps

### Community 74 - "Note Marquee Selection"
Cohesion: 0.50
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 75 - "Ink Layer (Freehand)"
Cohesion: 0.40
Nodes (3): BoardTool, BoardToolbarProps, TOOLS

### Community 77 - "Roster Panel"
Cohesion: 0.40
Nodes (3): EMPTY_ROSTER, PRIORITIES, TaskComposerProps

### Community 78 - "Task Composer"
Cohesion: 0.50
Nodes (3): AgendaRowProps, dayKey(), MeetingsPage()

### Community 79 - "Project Page"
Cohesion: 0.60
Nodes (3): AgendaSkeleton(), isSameDay(), TaskMenuPage()

### Community 80 - "Theme Gallery Page"
Cohesion: 0.50
Nodes (4): apiUrl, env, resolveApiUrl(), stripTrailingSlash()

### Community 82 - "Edge Reveal Hook"
Cohesion: 0.40
Nodes (4): ExpandableStage(), ExpandableStageProps, ExpandToggle(), ExpandToggleProps

### Community 84 - "Task Type Tag"
Cohesion: 0.50
Nodes (4): Mark, nextMark(), RuneScribe(), STAVES

### Community 85 - "Floating Shortcut Layer"
Cohesion: 0.50
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 88 - "Tear-Off Gesture Hook"
Cohesion: 0.50
Nodes (4): iOS/Safari PWA specifics, npm Scripts (dev/build/preview/typecheck/icons), vite-plugin-pwa / Workbox PWA setup, Vercel Deployment (vercel.json)

### Community 90 - "Language Toggle"
Cohesion: 0.67
Nodes (3): fitImage(), ImageDropOptions, useImageDrop()

### Community 91 - "Notes Board Pager"
Cohesion: 0.67
Nodes (3): InkLayer(), InkLayerProps, toPath()

### Community 97 - "Settings Page"
Cohesion: 0.67
Nodes (3): RunicText(), RunicTextProps, seedOf()

### Community 98 - "Task Menu Page"
Cohesion: 0.67
Nodes (3): clamp(), ZoomableImage(), ZoomableImageProps

## Knowledge Gaps
- **424 isolated node(s):** `name`, `private`, `version`, `type`, `description` (+419 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **56 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Architecture Principles (FSD)` to `Board Toolbar`, `PostCSS Config File`, `Maskable App Icon`, `CSS Theme Variables`, `Tailwind Config`, `Project API & Queries`, `Runic Skin Icon Set`, `Not Found Page`, `Offline Cache Purge`, `Query Key Registry`, `cn() Classname Helper`, `Project Dashboard Widget`, `Tailwind Config`, `Vite Deploy Guard`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Project API & Queries` to `Runic Skin Icon Set`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Why does `Task Studio README` connect `Runic Skin Icon Set` to `Board Toolbar`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _424 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Notes & Whiteboard API` be split into smaller, more focused modules?**
  _Cohesion score 0.05126582278481013 - nodes in this community are weakly interconnected._
- **Should `Task API & Completion Rules` be split into smaller, more focused modules?**
  _Cohesion score 0.06151062867480778 - nodes in this community are weakly interconnected._
- **Should `Edge Affordance & Nav Pin` be split into smaller, more focused modules?**
  _Cohesion score 0.05551020408163265 - nodes in this community are weakly interconnected._