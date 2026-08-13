# Graph Report - .  (2026-08-13)

## Corpus Check
- 46 files · ~78,657 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1024 nodes · 1288 edges · 113 communities (67 shown, 46 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 60 edges (avg confidence: 0.55)
- Token cost: 47,000 input · 594 output

## Community Hubs (Navigation)
- Notes Board API & Queries
- Edge-Reveal Nav Chrome
- Task API & Completion Rules
- App Shell & Theme Pre-paint Init
- Nav Glyph Kit & Hazard Icons
- Expandable Full-Screen Stage
- Build Tooling (PostCSS/Autoprefixer)
- Project API & Queries
- TS/Vite Project Config
- Task Layout Views & Store
- Auth Desk Scene & Floating Objects
- Vite/Node Build Config
- Button Primitive
- Skin-Specific Paper Icon Variants
- API Client & Session Refresh
- Icon Generation Script
- Floating Shortcuts Store
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
- Edge Affordance Component
- Eldritch Theme Icon Set
- Chat Dock Store
- App Branding & Icon Assets
- Notification API & Queries
- Auth API & Session Store
- Nav Pin Preferences Store
- Chat & Whiteboard API Types
- AI Suggestions API
- Rich Text Editor Toolbar
- Hidden Sidebar Nav
- Shared UI Hooks
- Hidden Sidebar Component (dup cluster)
- Whiteboard Stroke Helpers
- Vercel Deployment Config
- Whiteboard Image Sizing
- Whiteboard Tool State
- 60fps Animation Conventions
- Task Board DnD Columns
- Avatar Component
- Input/Textarea Primitives
- Chat Pin Drag Gesture
- Project Rail Nav
- Whiteboard Toolbar
- Project Rail (dup cluster)
- Project Text Board Widget
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
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
- Community 105
- Community 110
- Community 111

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

## Communities (113 total, 46 thin omitted)

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

### Community 4 - "Nav Glyph Kit & Hazard Icons"
Cohesion: 0.07
Nodes (13): Glyph(), GlyphProps, GlyphSet, NavGlyphKey, HAZARD_GLYPHS, HazardMark(), GLYPH_SETS, NavGlyph() (+5 more)

### Community 5 - "Expandable Full-Screen Stage"
Cohesion: 0.09
Nodes (30): ExpandableStage(), ExpandableStageProps, ExpandToggle(), ExpandToggleProps, Badge(), BadgeProps, Collapsible(), CollapsibleProps (+22 more)

### Community 6 - "Build Tooling (PostCSS/Autoprefixer)"
Cohesion: 0.06
Nodes (33): autoprefixer, description, devDependencies, autoprefixer, postcss, @types/node, @types/react, @types/react-dom (+25 more)

### Community 7 - "Project API & Queries"
Cohesion: 0.10
Nodes (12): ListProjectsParams, projectApi, MemberProductivity, PendingInvitation, Project, ProjectDashboard, ProjectInvitation, ProjectListItem (+4 more)

### Community 8 - "TS/Vite Project Config"
Cohesion: 0.07
Nodes (27): DOM, DOM.Iterable, src, vite/client, vite-plugin-pwa/client, compilerOptions, baseUrl, isolatedModules (+19 more)

### Community 9 - "Task Layout Views & Store"
Cohesion: 0.12
Nodes (22): DEFAULTS, LAYOUTS_FOR, LayoutSurface, read(), Stored, TaskLayout, useTaskLayout(), write() (+14 more)

### Community 10 - "Auth Desk Scene & Floating Objects"
Cohesion: 0.11
Nodes (7): AuthScene(), DeskObject(), DeskObjectProps, floatTransition(), AuthShell(), AuthShellProps, Phase

### Community 11 - "Vite/Node Build Config"
Cohesion: 0.11
Nodes (18): node, scripts/**/*.mjs, vite.config.ts, compilerOptions, allowSyntheticDefaultImports, isolatedModules, lib, module (+10 more)

### Community 12 - "Button Primitive"
Cohesion: 0.12
Nodes (11): Button, ButtonProps, Size, SIZES, Variant, VARIANTS, Modal(), ModalProps (+3 more)

### Community 13 - "Skin-Specific Paper Icon Variants"
Cohesion: 0.14
Nodes (11): isRigidPaper(), PageStack(), paperFor(), PAPERS, PostItGlyph(), PostItMark(), PostItMarkProps, PushPinProps (+3 more)

### Community 14 - "API Client & Session Refresh"
Cohesion: 0.15
Nodes (7): api, RetriableConfig, sessionExpiredHandlers, connectSocket(), emitWithAck(), getSocket(), tokenStore

### Community 15 - "Icon Generation Script"
Cohesion: 0.16
Nodes (15): BRAND, BRAND_DEEP, chunk(), crc32(), crcTable, drawIcon(), encodePng(), FOLD (+7 more)

### Community 16 - "Floating Shortcuts Store"
Cohesion: 0.22
Nodes (10): clampToViewport(), FloatingShortcut, PILL, read(), ShortcutIcon, ShortcutsState, useFloatingShortcuts, write() (+2 more)

### Community 17 - "Frontend Dependencies"
Cohesion: 0.15
Nodes (13): axios, date-fns, @dnd-kit/modifiers, @dnd-kit/utilities, @hookform/resolvers, dependencies, axios, date-fns (+5 more)

### Community 18 - "Project Document API & Queries"
Cohesion: 0.29
Nodes (8): documentApi, useCreateDocument(), useDeleteDocument(), useInvalidateDocuments(), useUpdateDocument(), CreateDocumentPayload, ProjectDocument, UpdateDocumentPayload

### Community 19 - "User API & Upload"
Cohesion: 0.21
Nodes (9): PresignedUpload, UploadScope, userApi, AuthSession, CurrentUser, SKIN_LABELS, ThemePreference, ThemeSkin (+1 more)

### Community 20 - "Skin Catalogue & Search"
Cohesion: 0.24
Nodes (8): SETTINGS_SKIN_LIMIT, SKIN_BY_VALUE, SKIN_CATALOG, SkinDefinition, SkinPreview, notch(), SkinMock(), SkinMockProps

### Community 21 - "Architecture Principles (FSD, Layering)"
Cohesion: 0.17
Nodes (12): zustand, tailwindcss, Layered Dependency Rule (app→pages→widgets→features→entities→shared), Feature-Sliced Design, Optimistic Update Strategy, React 19, Sonner (toasts), Tailwind CSS (+4 more)

### Community 22 - "Whiteboard Position Bus"
Cohesion: 0.23
Nodes (9): Listener, Point, PositionBus, centreOf(), ConnectorLayer(), ConnectorLayerProps, curveBetween(), headTransform() (+1 more)

### Community 23 - "Board Marquee & Pointer Gestures"
Cohesion: 0.18
Nodes (4): MarqueeOptions, Rect, ConnectBannerProps, SelectionBarProps

### Community 24 - "Task Filters Types"
Cohesion: 0.18
Nodes (9): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PROJECT_SCOPES, STATUS_SWATCH, STATUSES, TaskFiltersProps (+1 more)

### Community 25 - "Task Filters UI"
Cohesion: 0.18
Nodes (9): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PROJECT_SCOPES, STATUS_SWATCH, STATUSES, TaskFiltersProps (+1 more)

### Community 26 - "Shared App Constants"
Cohesion: 0.18
Nodes (10): BOARD_INK_COLORS, CONNECTOR_COLORS, EDGE_REVEAL_PX, MAX_BOARD_PAGES, NOTE_COLORS, STORAGE_KEYS, TASK_COLORS, TASK_PRIORITY_META (+2 more)

### Community 27 - "Date Formatting Helpers"
Cohesion: 0.33
Nodes (9): formatDateTime(), formatDayLabel(), formatDeadline(), formatDeadlineDate(), formatRelative(), formatTime(), formatWindow(), toDate() (+1 more)

### Community 28 - "HTML Sanitiser (Client)"
Cohesion: 0.24
Nodes (9): ALLOWED_ATTRIBUTES, ALLOWED_STYLE_PROPERTIES, ALLOWED_TAGS, clean(), DISCARDED_TAGS, GLOBAL_ATTRIBUTES, isSafeUrl(), sanitizeDocumentHtml() (+1 more)

### Community 29 - "Edge Affordance Component"
Cohesion: 0.18
Nodes (10): CENTRE, EdgeAffordance(), EdgeAffordanceProps, GRADIENT, NavPinButton(), NavPinButtonProps, RAIL, SWELL (+2 more)

### Community 31 - "Chat Dock Store"
Cohesion: 0.24
Nodes (5): ChatDockState, PersistedDock, restored, useChatDock, write()

### Community 32 - "App Branding & Icon Assets"
Cohesion: 0.28
Nodes (8): Task Studio Branding, App Icon Design (Sticky Note on Purple Gradient), favicon.svg (App Icon), Paper Sheet Gradient (Yellow/Gold), Peeled-Corner Sheet of Paper Icon (Task/Document Motif), Rounded Square Tile Shape, Text/Task Lines on Sheet, Tile Background Gradient (Indigo)

### Community 33 - "Notification API & Queries"
Cohesion: 0.28
Nodes (3): notificationApi, AppNotification, NotificationType

### Community 34 - "Auth API & Session Store"
Cohesion: 0.31
Nodes (5): authApi, SessionState, SessionStatus, useCurrentUser(), useSessionStore

### Community 35 - "Nav Pin Preferences Store"
Cohesion: 0.31
Nodes (8): DEFAULTS, NavEdge, NavPreferencesState, PinnedEdges, read(), useIsNavPinned(), useNavPreferences, write()

### Community 36 - "Chat & Whiteboard API Types"
Cohesion: 0.32
Nodes (6): chatApi, whiteboardApi, ChatMessage, WhiteboardElement, WhiteboardElementType, WhiteboardStrokeData

### Community 37 - "AI Suggestions API"
Cohesion: 0.32
Nodes (5): aiApi, AiSuggestion, SubtaskSuggestion, WorkflowInsight, SEVERITY_STYLE

### Community 38 - "Rich Text Editor Toolbar"
Cohesion: 0.25
Nodes (4): COLORS, PromptKind, RichTextEditorProps, SIZES

### Community 39 - "Hidden Sidebar Nav"
Cohesion: 0.29
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 40 - "Shared UI Hooks"
Cohesion: 0.38
Nodes (3): useIsDesktop(), useIsTouchDevice(), useMediaQuery()

### Community 41 - "Hidden Sidebar Component (dup cluster)"
Cohesion: 0.29
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 42 - "Whiteboard Stroke Helpers"
Cohesion: 0.43
Nodes (6): adoptStroke(), isStroke(), readImageSize(), Tool, Whiteboard(), WhiteboardProps

### Community 43 - "Vercel Deployment Config"
Cohesion: 0.29
Nodes (6): buildCommand, framework, headers, outputDirectory, rewrites, $schema

### Community 44 - "Whiteboard Image Sizing"
Cohesion: 0.33
Nodes (3): SkinDefinition, SkinPreview, SKINS

### Community 45 - "Whiteboard Tool State"
Cohesion: 0.47
Nodes (5): isStroke(), readImageSize(), Tool, Whiteboard(), WhiteboardProps

### Community 46 - "60fps Animation Conventions"
Cohesion: 0.33
Nodes (6): @dnd-kit/core, framer-motion, @dnd-kit/core, framer-motion, 60fps Animation Rules, Two-tool Drag & Drop strategy

### Community 48 - "Avatar Component"
Cohesion: 0.33
Nodes (5): Avatar(), AvatarProps, AvatarStack(), AvatarStackProps, SIZES

### Community 49 - "Input/Textarea Primitives"
Cohesion: 0.33
Nodes (5): FieldShellProps, Input, InputProps, Textarea, TextareaProps

### Community 51 - "Project Rail Nav"
Cohesion: 0.50
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 52 - "Whiteboard Toolbar"
Cohesion: 0.40
Nodes (3): BoardTool, BoardToolbarProps, TOOLS

### Community 54 - "Project Rail (dup cluster)"
Cohesion: 0.50
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 55 - "Project Text Board Widget"
Cohesion: 0.60
Nodes (4): TextBoard(), TextBoardProps, toDownloadableHtml(), toFileName()

### Community 58 - "Community 58"
Cohesion: 0.50
Nodes (4): iOS/Safari PWA specifics, npm Scripts (dev/build/preview/typecheck/icons), vite-plugin-pwa / Workbox PWA setup, Vercel Deployment (vercel.json)

### Community 60 - "Community 60"
Cohesion: 0.67
Nodes (3): InkLayer(), InkLayerProps, toPath()

### Community 64 - "Community 64"
Cohesion: 0.83
Nodes (3): fitImage(), NotesBoardPage(), readImageSize()

## Knowledge Gaps
- **339 isolated node(s):** `name`, `private`, `version`, `type`, `description` (+334 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **46 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Frontend Dependencies` to `Community 96`, `Community 97`, `Build Tooling (PostCSS/Autoprefixer)`, `60fps Animation Conventions`, `Architecture Principles (FSD, Layering)`, `Community 87`, `Community 88`, `Community 89`, `Community 90`, `Community 91`, `Community 92`, `Community 93`, `Community 94`, `Community 95`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Build Tooling (PostCSS/Autoprefixer)` to `Architecture Principles (FSD, Layering)`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _339 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Notes Board API & Queries` be split into smaller, more focused modules?**
  _Cohesion score 0.06292966684294024 - nodes in this community are weakly interconnected._
- **Should `Edge-Reveal Nav Chrome` be split into smaller, more focused modules?**
  _Cohesion score 0.05551020408163265 - nodes in this community are weakly interconnected._
- **Should `Task API & Completion Rules` be split into smaller, more focused modules?**
  _Cohesion score 0.0782312925170068 - nodes in this community are weakly interconnected._
- **Should `App Shell & Theme Pre-paint Init` be split into smaller, more focused modules?**
  _Cohesion score 0.05603864734299517 - nodes in this community are weakly interconnected._