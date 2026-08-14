# Graph Report - .  (2026-08-13)

## Corpus Check
- 12 files · ~81,715 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1036 nodes · 1304 edges · 120 communities (72 shown, 48 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 60 edges (avg confidence: 0.55)
- Token cost: 41,000 input · 150 output

## Community Hubs (Navigation)
- Notes Board API & Queries
- Edge-Reveal Nav Chrome
- Task API & Completion Rules
- App Shell & Theme Pre-paint Init
- Build Tooling (PostCSS/Autoprefixer)
- Project API & Queries
- TS/Vite Project Config
- Task Layout Views & Store
- Auth Desk Scene & Floating Objects
- Shared UI Primitives
- Vite/Node Build Config
- Skin-Specific Paper Icon Variants
- API Client & Session Refresh
- Icon Generation Script
- Floating Shortcuts Store
- Button Primitive
- Edge Affordance Component
- Eldritch Theme Icon Set
- Frontend Dependencies
- Project Document API & Queries
- User API & Upload
- Skin Catalogue & Search
- Architecture Principles (FSD, Layering)
- Whiteboard Position Bus
- Board Marquee & Pointer Gestures
- Task Filters Types
- Task Filters UI
- Shared App Constants
- Date Formatting Helpers
- HTML Sanitiser (Client)
- Chat Dock Store
- Hazard Theme Icon Set
- Newsprint Theme Icon Set
- Space Theme Icon Set
- App Branding & Icon Assets
- Notification API & Queries
- Auth API & Session Store
- Nav Pin Preferences Store
- Eldritch Tendrils & Gaze Decor
- Nav Glyph Set Dispatch
- Chat & Whiteboard API Types
- AI Suggestions API
- Rich Text Editor Toolbar
- Route Error Boundary
- Hidden Sidebar Nav
- Shared UI Hooks
- Hidden Sidebar Component (dup cluster)
- Whiteboard Stroke Helpers
- Vercel Deployment Config
- Theme Gallery Preview Mock
- Whiteboard Tool State
- 60fps Animation Conventions
- Task Board DnD Columns
- Avatar Component
- Input/Textarea Primitives
- Chat Pin Drag Gesture
- Project Rail Nav
- Whiteboard Toolbar
- Expandable Full-Screen Stage
- Project Rail (dup cluster)
- Project Text Board Widget
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 112
- Community 117
- Community 118

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `compilerOptions` - 13 edges
3. `useBoardCache()` - 12 edges
4. `useProjectBoardCache()` - 10 edges
5. `Task Studio README` - 9 edges
6. `toDate()` - 9 edges
7. `useInvalidateTasks()` - 8 edges
8. `scripts` - 7 edges
9. `RouteBoundary` - 6 edges
10. `Note` - 6 edges

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
- **Pre-paint Theme/Skin Initialization Flow** — index_theme_init_script, index_skins_map, index_theme_storage_keys, src_app_providers_theme_provider_skin_attribute [INFERRED 0.85]
- **Performance-first Interaction Design Pattern** — readme_useedgereveal, readme_drag_and_drop_design, readme_60fps_rules [INFERRED 0.85]
- **PWA/iOS Delivery Flow** — readme_pwa_workbox, readme_ios_safari_specifics, readme_npm_scripts, readme_vercel_deployment [INFERRED 0.75]

## Communities (120 total, 48 thin omitted)

### Community 0 - "Notes Board API & Queries"
Cohesion: 0.06
Nodes (43): boardApi, noteApi, useAddBoardStroke(), useBoardCache(), useBoardPages(), useClearBoard(), useClearBoardStrokes(), useCreateBoardNote() (+35 more)

### Community 1 - "Edge-Reveal Nav Chrome"
Cohesion: 0.06
Nodes (33): CENTRE, EdgeAffordance(), EdgeAffordanceProps, GRADIENT, NavPinButton(), NavPinButtonProps, RAIL, RAIL_TONE (+25 more)

### Community 2 - "Task API & Completion Rules"
Cohesion: 0.08
Nodes (34): taskApi, blockingAssigneeCount(), canCompleteTask(), completionBlockedReason(), CompletionContext, completionProgress(), isSharedTask(), outstandingAssignees() (+26 more)

### Community 3 - "App Shell & Theme Pre-paint Init"
Cohesion: 0.06
Nodes (35): index.html (App Shell), SKINS Fallback Map, Pre-paint Theme Init Script, localStorage Theme Persistence Keys (task-studio:theme, task-studio:theme-skin), App(), AppProviders(), QueryProvider(), NOTIFICATION_TOAST (+27 more)

### Community 4 - "Build Tooling (PostCSS/Autoprefixer)"
Cohesion: 0.06
Nodes (33): autoprefixer, description, devDependencies, autoprefixer, postcss, @types/node, @types/react, @types/react-dom (+25 more)

### Community 5 - "Project API & Queries"
Cohesion: 0.10
Nodes (12): ListProjectsParams, projectApi, MemberProductivity, PendingInvitation, Project, ProjectDashboard, ProjectInvitation, ProjectListItem (+4 more)

### Community 6 - "TS/Vite Project Config"
Cohesion: 0.07
Nodes (27): DOM, DOM.Iterable, src, vite/client, vite-plugin-pwa/client, compilerOptions, baseUrl, isolatedModules (+19 more)

### Community 7 - "Task Layout Views & Store"
Cohesion: 0.12
Nodes (22): DEFAULTS, LAYOUTS_FOR, LayoutSurface, read(), Stored, TaskLayout, useTaskLayout(), write() (+14 more)

### Community 8 - "Auth Desk Scene & Floating Objects"
Cohesion: 0.11
Nodes (7): AuthScene(), DeskObject(), DeskObjectProps, floatTransition(), AuthShell(), AuthShellProps, Phase

### Community 9 - "Shared UI Primitives"
Cohesion: 0.14
Nodes (20): Badge(), BadgeProps, Collapsible(), CollapsibleProps, ColorPicker(), ColorPickerProps, EmptyState(), EmptyStateProps (+12 more)

### Community 10 - "Vite/Node Build Config"
Cohesion: 0.11
Nodes (18): node, scripts/**/*.mjs, vite.config.ts, compilerOptions, allowSyntheticDefaultImports, isolatedModules, lib, module (+10 more)

### Community 11 - "Skin-Specific Paper Icon Variants"
Cohesion: 0.14
Nodes (11): isRigidPaper(), PageStack(), paperFor(), PAPERS, PostItGlyph(), PostItMark(), PostItMarkProps, PushPinProps (+3 more)

### Community 12 - "API Client & Session Refresh"
Cohesion: 0.15
Nodes (7): api, RetriableConfig, sessionExpiredHandlers, connectSocket(), emitWithAck(), getSocket(), tokenStore

### Community 13 - "Icon Generation Script"
Cohesion: 0.16
Nodes (15): BRAND, BRAND_DEEP, chunk(), crc32(), crcTable, drawIcon(), encodePng(), FOLD (+7 more)

### Community 14 - "Floating Shortcuts Store"
Cohesion: 0.22
Nodes (10): clampToViewport(), FloatingShortcut, PILL, read(), ShortcutIcon, ShortcutsState, useFloatingShortcuts, write() (+2 more)

### Community 15 - "Button Primitive"
Cohesion: 0.15
Nodes (11): Button, ButtonProps, Size, SIZES, Variant, VARIANTS, Modal(), ModalProps (+3 more)

### Community 16 - "Edge Affordance Component"
Cohesion: 0.14
Nodes (13): CENTRE, EdgeAffordance(), EdgeAffordanceProps, GRADIENT, IRIS_GRADIENT, NavPinButton(), NavPinButtonProps, RAIL (+5 more)

### Community 17 - "Eldritch Theme Icon Set"
Cohesion: 0.18
Nodes (4): EldritchMark(), Glyph(), GlyphProps, GlyphSet

### Community 18 - "Frontend Dependencies"
Cohesion: 0.15
Nodes (13): axios, date-fns, @dnd-kit/modifiers, @dnd-kit/utilities, @hookform/resolvers, dependencies, axios, date-fns (+5 more)

### Community 19 - "Project Document API & Queries"
Cohesion: 0.29
Nodes (8): documentApi, useCreateDocument(), useDeleteDocument(), useInvalidateDocuments(), useUpdateDocument(), CreateDocumentPayload, ProjectDocument, UpdateDocumentPayload

### Community 20 - "User API & Upload"
Cohesion: 0.21
Nodes (9): PresignedUpload, UploadScope, userApi, AuthSession, CurrentUser, SKIN_LABELS, ThemePreference, ThemeSkin (+1 more)

### Community 21 - "Skin Catalogue & Search"
Cohesion: 0.24
Nodes (8): SETTINGS_SKIN_LIMIT, SKIN_BY_VALUE, SKIN_CATALOG, SkinDefinition, SkinPreview, notch(), SkinMock(), SkinMockProps

### Community 22 - "Architecture Principles (FSD, Layering)"
Cohesion: 0.17
Nodes (12): zustand, tailwindcss, Layered Dependency Rule (app→pages→widgets→features→entities→shared), Feature-Sliced Design, Optimistic Update Strategy, React 19, Sonner (toasts), Tailwind CSS (+4 more)

### Community 23 - "Whiteboard Position Bus"
Cohesion: 0.23
Nodes (9): Listener, Point, PositionBus, centreOf(), ConnectorLayer(), ConnectorLayerProps, curveBetween(), headTransform() (+1 more)

### Community 24 - "Board Marquee & Pointer Gestures"
Cohesion: 0.18
Nodes (4): MarqueeOptions, Rect, ConnectBannerProps, SelectionBarProps

### Community 25 - "Task Filters Types"
Cohesion: 0.18
Nodes (9): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PROJECT_SCOPES, STATUS_SWATCH, STATUSES, TaskFiltersProps (+1 more)

### Community 26 - "Task Filters UI"
Cohesion: 0.18
Nodes (9): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PROJECT_SCOPES, STATUS_SWATCH, STATUSES, TaskFiltersProps (+1 more)

### Community 27 - "Shared App Constants"
Cohesion: 0.18
Nodes (10): BOARD_INK_COLORS, CONNECTOR_COLORS, EDGE_REVEAL_PX, MAX_BOARD_PAGES, NOTE_COLORS, STORAGE_KEYS, TASK_COLORS, TASK_PRIORITY_META (+2 more)

### Community 28 - "Date Formatting Helpers"
Cohesion: 0.33
Nodes (9): formatDateTime(), formatDayLabel(), formatDeadline(), formatDeadlineDate(), formatRelative(), formatTime(), formatWindow(), toDate() (+1 more)

### Community 29 - "HTML Sanitiser (Client)"
Cohesion: 0.24
Nodes (9): ALLOWED_ATTRIBUTES, ALLOWED_STYLE_PROPERTIES, ALLOWED_TAGS, clean(), DISCARDED_TAGS, GLOBAL_ATTRIBUTES, isSafeUrl(), sanitizeDocumentHtml() (+1 more)

### Community 30 - "Chat Dock Store"
Cohesion: 0.24
Nodes (5): ChatDockState, PersistedDock, restored, useChatDock, write()

### Community 34 - "App Branding & Icon Assets"
Cohesion: 0.28
Nodes (8): Task Studio Branding, App Icon Design (Sticky Note on Purple Gradient), favicon.svg (App Icon), Paper Sheet Gradient (Yellow/Gold), Peeled-Corner Sheet of Paper Icon (Task/Document Motif), Rounded Square Tile Shape, Text/Task Lines on Sheet, Tile Background Gradient (Indigo)

### Community 35 - "Notification API & Queries"
Cohesion: 0.28
Nodes (3): notificationApi, AppNotification, NotificationType

### Community 36 - "Auth API & Session Store"
Cohesion: 0.31
Nodes (5): authApi, SessionState, SessionStatus, useCurrentUser(), useSessionStore

### Community 37 - "Nav Pin Preferences Store"
Cohesion: 0.31
Nodes (8): DEFAULTS, NavEdge, NavPreferencesState, PinnedEdges, read(), useIsNavPinned(), useNavPreferences, write()

### Community 38 - "Eldritch Tendrils & Gaze Decor"
Cohesion: 0.25
Nodes (7): EldritchTendrils(), EldritchTendrilsProps, GazeArrow(), GazeArrowProps, nextSighting(), Sighting, WanderingEye()

### Community 39 - "Nav Glyph Set Dispatch"
Cohesion: 0.25
Nodes (8): ELDRITCH_GLYPHS, NavGlyphKey, HAZARD_GLYPHS, GLYPH_SETS, NavGlyph(), NavGlyphProps, NEWSPAPER_GLYPHS, SPACE_GLYPHS

### Community 40 - "Chat & Whiteboard API Types"
Cohesion: 0.32
Nodes (6): chatApi, whiteboardApi, ChatMessage, WhiteboardElement, WhiteboardElementType, WhiteboardStrokeData

### Community 41 - "AI Suggestions API"
Cohesion: 0.32
Nodes (5): aiApi, AiSuggestion, SubtaskSuggestion, WorkflowInsight, SEVERITY_STYLE

### Community 42 - "Rich Text Editor Toolbar"
Cohesion: 0.25
Nodes (4): COLORS, PromptKind, RichTextEditorProps, SIZES

### Community 43 - "Route Error Boundary"
Cohesion: 0.25
Nodes (3): RouteBoundary, RouteBoundaryProps, RouteBoundaryState

### Community 44 - "Hidden Sidebar Nav"
Cohesion: 0.29
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 45 - "Shared UI Hooks"
Cohesion: 0.38
Nodes (3): useIsDesktop(), useIsTouchDevice(), useMediaQuery()

### Community 46 - "Hidden Sidebar Component (dup cluster)"
Cohesion: 0.29
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 47 - "Whiteboard Stroke Helpers"
Cohesion: 0.43
Nodes (6): adoptStroke(), isStroke(), readImageSize(), Tool, Whiteboard(), WhiteboardProps

### Community 48 - "Vercel Deployment Config"
Cohesion: 0.29
Nodes (6): buildCommand, framework, headers, outputDirectory, rewrites, $schema

### Community 49 - "Theme Gallery Preview Mock"
Cohesion: 0.33
Nodes (3): SkinDefinition, SkinPreview, SKINS

### Community 50 - "Whiteboard Tool State"
Cohesion: 0.47
Nodes (5): isStroke(), readImageSize(), Tool, Whiteboard(), WhiteboardProps

### Community 51 - "60fps Animation Conventions"
Cohesion: 0.33
Nodes (6): @dnd-kit/core, framer-motion, @dnd-kit/core, framer-motion, 60fps Animation Rules, Two-tool Drag & Drop strategy

### Community 53 - "Avatar Component"
Cohesion: 0.33
Nodes (5): Avatar(), AvatarProps, AvatarStack(), AvatarStackProps, SIZES

### Community 54 - "Input/Textarea Primitives"
Cohesion: 0.33
Nodes (5): FieldShellProps, Input, InputProps, Textarea, TextareaProps

### Community 56 - "Project Rail Nav"
Cohesion: 0.50
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 57 - "Whiteboard Toolbar"
Cohesion: 0.40
Nodes (3): BoardTool, BoardToolbarProps, TOOLS

### Community 59 - "Expandable Full-Screen Stage"
Cohesion: 0.40
Nodes (4): ExpandableStage(), ExpandableStageProps, ExpandToggle(), ExpandToggleProps

### Community 60 - "Project Rail (dup cluster)"
Cohesion: 0.50
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 61 - "Project Text Board Widget"
Cohesion: 0.60
Nodes (4): TextBoard(), TextBoardProps, toDownloadableHtml(), toFileName()

### Community 64 - "Community 64"
Cohesion: 0.50
Nodes (4): iOS/Safari PWA specifics, npm Scripts (dev/build/preview/typecheck/icons), vite-plugin-pwa / Workbox PWA setup, Vercel Deployment (vercel.json)

### Community 66 - "Community 66"
Cohesion: 0.67
Nodes (3): InkLayer(), InkLayerProps, toPath()

### Community 70 - "Community 70"
Cohesion: 0.83
Nodes (3): fitImage(), NotesBoardPage(), readImageSize()

### Community 76 - "Community 76"
Cohesion: 0.50
Nodes (3): Select(), SelectOption, SelectProps

## Knowledge Gaps
- **345 isolated node(s):** `name`, `private`, `version`, `type`, `description` (+340 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **48 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Frontend Dependencies` to `Community 96`, `Community 97`, `Community 98`, `Community 99`, `Build Tooling (PostCSS/Autoprefixer)`, `Community 100`, `Community 101`, `Community 102`, `Community 103`, `Community 104`, `60fps Animation Conventions`, `Architecture Principles (FSD, Layering)`, `Community 94`, `Community 95`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Build Tooling (PostCSS/Autoprefixer)` to `Architecture Principles (FSD, Layering)`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `Task Studio README` connect `Architecture Principles (FSD, Layering)` to `60fps Animation Conventions`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _345 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Notes Board API & Queries` be split into smaller, more focused modules?**
  _Cohesion score 0.06292966684294024 - nodes in this community are weakly interconnected._
- **Should `Edge-Reveal Nav Chrome` be split into smaller, more focused modules?**
  _Cohesion score 0.05551020408163265 - nodes in this community are weakly interconnected._
- **Should `Task API & Completion Rules` be split into smaller, more focused modules?**
  _Cohesion score 0.0782312925170068 - nodes in this community are weakly interconnected._