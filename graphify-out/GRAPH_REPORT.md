# Graph Report - C:/Users/jorda/OneDrive/Documentos/GitHub/Task-Studio/Task-Studio-UI  (2026-08-12)

## Corpus Check
- 19 files · ~72,669 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 918 nodes · 1102 edges · 113 communities (68 shown, 45 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.67)
- Token cost: 46,222 input · 0 output

## Community Hubs (Navigation)
- Notes Board Data Layer
- Ghost Duplicate (Edge Reveal Menu Chrome)
- App Bootstrap & Providers
- Task API & Data Layer
- Build Tooling Dependencies
- Project API & Data Layer
- TypeScript App Config
- Task Layout Switching
- Auth Scene Desk Illustration
- Shared UI Primitives
- Vite & Node Config
- API Client & Socket Setup
- Icon Generation Script
- Floating Shortcuts Store
- Button & Modal Primitives
- Third-Party UI Dependencies
- User API & Profile Types
- Project Architecture & Stack
- Board Connector Layer
- Board Gesture Handling
- Skinned Stationery Icons
- Ghost Duplicate (Task Filters)
- Space Theme Reference Screenshot
- Task Filters
- Design System Constants
- Date Formatting Utilities
- Edge Reveal Menu Chrome
- Project Chat Dock
- App Branding & Icon Design
- Notifications API & Data Layer
- Nav Preferences Store
- Chat & Whiteboard API
- AI Suggestions Panel
- Route Error Boundary
- Ghost Duplicate (Hidden Sidebar Nav)
- Shared Hooks
- Hidden Sidebar Nav
- Vercel Deployment Config
- Ghost Duplicate (Skin Picker UI)
- Ghost Duplicate (Project Whiteboard)
- Drag & Drop / Motion Deps
- Theme Skin Init & Migration
- Task Board (dnd-kit)
- Skin Picker UI
- Avatar Components
- Form Field Primitives
- Project Whiteboard
- Ghost Duplicate (Chat Pin Gesture)
- Ghost Duplicate (Project Rail Nav)
- Session Store
- Board Toolbar
- Per-Skin Motion Curves
- Expandable Full-Screen Stage
- Project Rail Nav
- Ghost Duplicate (Task Layout Switching)
- Ghost Duplicate (Per-Skin Motion Curves)
- PWA & Deployment Setup
- Board Selection Helpers
- Board Ink Drawing Layer
- Chat Pin Gesture
- Project Roster Panel
- Task Composer Form
- Notes Board Page
- Project Page Shell
- Env Config
- Edge Reveal Hook
- Select Primitive
- Ghost Duplicate (Task Type Tag)
- Ghost Duplicate (Settings Page)
- Ghost Duplicate (Top Navigation Bar)
- Tear-Off Drag Hook
- Tear-Off Ghost Preview
- Board Pager
- Notification Bell
- Create Project Dialog
- Task Detail Modal
- Recycle Bin Page
- Settings Page
- Task Menu Page
- Project Chat Window
- Top Navigation Bar
- Root TS Config
- Third-Party UI Dependencies
- date-fns Dependency
- dnd-kit Sortable Dependency
- lucide-react Dependency
- React Dependency
- react-dom Dependency
- react-hook-form Dependency
- react-router-dom Dependency
- socket.io-client Dependency
- tailwind-merge Dependency
- zod Dependency
- PWA Icon (192px) & Manifest
- PWA Icon (512px) & App Identity
- Hidden Edge Menu Design Doc
- Auth API
- Query Key Registry
- iOS Safe-Area Rationale
- Maskable App Icon
- CSS Variable Theme System

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
- **Hero Conversion Flow: Stat, Copy, CTA Driving Job Exploration** — spacethemeexample_job_stat_card, spacethemeexample_explore_job_cta_button, spacethemeexample_hero_section, spacethemeexample_job_board_purpose [INFERRED 0.75]
- **Space-Themed Brand Identity Elements** — spacethemeexample_brand_logo_i_need_more_space_2097, spacethemeexample_space_explore_badge, spacethemeexample_dark_space_ui_theme, spacethemeexample_moon_illustration [INFERRED 0.75]
- **Performance-first Interaction Design Pattern** — readme_useedgereveal, readme_drag_and_drop_design, readme_60fps_rules [INFERRED 0.85]
- **PWA/iOS Delivery Flow** — readme_pwa_workbox, readme_ios_safari_specifics, readme_npm_scripts, readme_vercel_deployment [INFERRED 0.75]

## Communities (113 total, 45 thin omitted)

### Community 0 - "Notes Board Data Layer"
Cohesion: 0.06
Nodes (43): boardApi, noteApi, useAddBoardStroke(), useBoardCache(), useBoardPages(), useClearBoard(), useClearBoardStrokes(), useCreateBoardNote() (+35 more)

### Community 1 - "Ghost Duplicate (Edge Reveal Menu Chrome)"
Cohesion: 0.06
Nodes (33): CENTRE, EdgeAffordance(), EdgeAffordanceProps, GRADIENT, NavPinButton(), NavPinButtonProps, RAIL, RAIL_TONE (+25 more)

### Community 2 - "App Bootstrap & Providers"
Cohesion: 0.07
Nodes (29): App(), AppProviders(), QueryProvider(), NOTIFICATION_TOAST, RealtimeContext, RealtimeContextValue, RealtimeProvider(), roomHolders (+21 more)

### Community 3 - "Task API & Data Layer"
Cohesion: 0.08
Nodes (25): taskApi, useCreateTask(), useDeleteTask(), useInvalidateTasks(), usePurgeTask(), useRestoreTask(), useToggleMyCompletion(), useUpdateTask() (+17 more)

### Community 4 - "Build Tooling Dependencies"
Cohesion: 0.06
Nodes (33): autoprefixer, description, devDependencies, autoprefixer, postcss, @types/node, @types/react, @types/react-dom (+25 more)

### Community 5 - "Project API & Data Layer"
Cohesion: 0.10
Nodes (12): ListProjectsParams, projectApi, MemberProductivity, PendingInvitation, Project, ProjectDashboard, ProjectInvitation, ProjectListItem (+4 more)

### Community 6 - "TypeScript App Config"
Cohesion: 0.07
Nodes (27): DOM, DOM.Iterable, src, vite/client, vite-plugin-pwa/client, compilerOptions, baseUrl, isolatedModules (+19 more)

### Community 7 - "Task Layout Switching"
Cohesion: 0.12
Nodes (22): DEFAULTS, LAYOUTS_FOR, LayoutSurface, read(), Stored, TaskLayout, useTaskLayout(), write() (+14 more)

### Community 8 - "Auth Scene Desk Illustration"
Cohesion: 0.11
Nodes (7): AuthScene(), DeskObject(), DeskObjectProps, floatTransition(), AuthShell(), AuthShellProps, Phase

### Community 9 - "Shared UI Primitives"
Cohesion: 0.14
Nodes (20): Badge(), BadgeProps, Collapsible(), CollapsibleProps, ColorPicker(), ColorPickerProps, EmptyState(), EmptyStateProps (+12 more)

### Community 10 - "Vite & Node Config"
Cohesion: 0.11
Nodes (18): node, scripts/**/*.mjs, vite.config.ts, compilerOptions, allowSyntheticDefaultImports, isolatedModules, lib, module (+10 more)

### Community 11 - "API Client & Socket Setup"
Cohesion: 0.15
Nodes (7): api, RetriableConfig, sessionExpiredHandlers, connectSocket(), emitWithAck(), getSocket(), tokenStore

### Community 12 - "Icon Generation Script"
Cohesion: 0.16
Nodes (15): BRAND, BRAND_DEEP, chunk(), crc32(), crcTable, drawIcon(), encodePng(), FOLD (+7 more)

### Community 13 - "Floating Shortcuts Store"
Cohesion: 0.22
Nodes (10): clampToViewport(), FloatingShortcut, PILL, read(), ShortcutIcon, ShortcutsState, useFloatingShortcuts, write() (+2 more)

### Community 14 - "Button & Modal Primitives"
Cohesion: 0.15
Nodes (11): Button, ButtonProps, Size, SIZES, Variant, VARIANTS, Modal(), ModalProps (+3 more)

### Community 15 - "Third-Party UI Dependencies"
Cohesion: 0.15
Nodes (13): axios, @dnd-kit/modifiers, @dnd-kit/utilities, @hookform/resolvers, dependencies, axios, @dnd-kit/modifiers, @dnd-kit/utilities (+5 more)

### Community 16 - "User API & Profile Types"
Cohesion: 0.21
Nodes (9): PresignedUpload, UploadScope, userApi, AuthSession, CurrentUser, SKIN_LABELS, ThemePreference, ThemeSkin (+1 more)

### Community 17 - "Project Architecture & Stack"
Cohesion: 0.17
Nodes (12): zustand, tailwindcss, Layered Dependency Rule (app→pages→widgets→features→entities→shared), Feature-Sliced Design, Optimistic Update Strategy, React 19, Sonner (toasts), Tailwind CSS (+4 more)

### Community 18 - "Board Connector Layer"
Cohesion: 0.23
Nodes (9): Listener, Point, PositionBus, centreOf(), ConnectorLayer(), ConnectorLayerProps, curveBetween(), headTransform() (+1 more)

### Community 19 - "Board Gesture Handling"
Cohesion: 0.18
Nodes (4): MarqueeOptions, Rect, ConnectBannerProps, SelectionBarProps

### Community 20 - "Skinned Stationery Icons"
Cohesion: 0.17
Nodes (8): PageStack(), PostItGlyph(), PostItMark(), PostItMarkProps, PushPinProps, SendGlyph(), StudioMark(), StudioMarkProps

### Community 21 - "Ghost Duplicate (Task Filters)"
Cohesion: 0.18
Nodes (9): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PROJECT_SCOPES, STATUS_SWATCH, STATUSES, TaskFiltersProps (+1 more)

### Community 22 - "Space Theme Reference Screenshot"
Cohesion: 0.31
Nodes (11): Space Theme Job Board Landing Page (Screenshot), Brand Logo/Wordmark "_I Need More Space 2097_", Dark Space UI Theme, "Explore Job" Call-to-Action Button, Hero Section with Astronaut Illustration, "Job Available" Section Teaser (below fold), Job Board / Recruitment Landing Page Purpose, Job Availability Stat Card (Saturn, 2,197 Jobs Available) (+3 more)

### Community 23 - "Task Filters"
Cohesion: 0.18
Nodes (9): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PROJECT_SCOPES, STATUS_SWATCH, STATUSES, TaskFiltersProps (+1 more)

### Community 24 - "Design System Constants"
Cohesion: 0.18
Nodes (10): BOARD_INK_COLORS, CONNECTOR_COLORS, EDGE_REVEAL_PX, MAX_BOARD_PAGES, NOTE_COLORS, STORAGE_KEYS, TASK_COLORS, TASK_PRIORITY_META (+2 more)

### Community 25 - "Date Formatting Utilities"
Cohesion: 0.33
Nodes (9): formatDateTime(), formatDayLabel(), formatDeadline(), formatDeadlineDate(), formatRelative(), formatTime(), formatWindow(), toDate() (+1 more)

### Community 26 - "Edge Reveal Menu Chrome"
Cohesion: 0.18
Nodes (10): CENTRE, EdgeAffordance(), EdgeAffordanceProps, GRADIENT, NavPinButton(), NavPinButtonProps, RAIL, SWELL (+2 more)

### Community 27 - "Project Chat Dock"
Cohesion: 0.29
Nodes (7): ChatDockState, PersistedDock, restored, useChatDock, write(), ChatDock(), useProjectChatUnread()

### Community 28 - "App Branding & Icon Design"
Cohesion: 0.28
Nodes (8): Task Studio Branding, App Icon Design (Sticky Note on Purple Gradient), favicon.svg (App Icon), Paper Sheet Gradient (Yellow/Gold), Peeled-Corner Sheet of Paper Icon (Task/Document Motif), Rounded Square Tile Shape, Text/Task Lines on Sheet, Tile Background Gradient (Indigo)

### Community 29 - "Notifications API & Data Layer"
Cohesion: 0.28
Nodes (3): notificationApi, AppNotification, NotificationType

### Community 30 - "Nav Preferences Store"
Cohesion: 0.31
Nodes (8): DEFAULTS, NavEdge, NavPreferencesState, PinnedEdges, read(), useIsNavPinned(), useNavPreferences, write()

### Community 31 - "Chat & Whiteboard API"
Cohesion: 0.32
Nodes (6): chatApi, whiteboardApi, ChatMessage, WhiteboardElement, WhiteboardElementType, WhiteboardStrokeData

### Community 32 - "AI Suggestions Panel"
Cohesion: 0.32
Nodes (5): aiApi, AiSuggestion, SubtaskSuggestion, WorkflowInsight, SEVERITY_STYLE

### Community 33 - "Route Error Boundary"
Cohesion: 0.25
Nodes (3): RouteBoundary, RouteBoundaryProps, RouteBoundaryState

### Community 34 - "Ghost Duplicate (Hidden Sidebar Nav)"
Cohesion: 0.29
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 35 - "Shared Hooks"
Cohesion: 0.38
Nodes (3): useIsDesktop(), useIsTouchDevice(), useMediaQuery()

### Community 36 - "Hidden Sidebar Nav"
Cohesion: 0.29
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 37 - "Vercel Deployment Config"
Cohesion: 0.29
Nodes (6): buildCommand, framework, headers, outputDirectory, rewrites, $schema

### Community 38 - "Ghost Duplicate (Skin Picker UI)"
Cohesion: 0.33
Nodes (3): SkinDefinition, SkinPreview, SKINS

### Community 39 - "Ghost Duplicate (Project Whiteboard)"
Cohesion: 0.47
Nodes (5): isStroke(), readImageSize(), Tool, Whiteboard(), WhiteboardProps

### Community 40 - "Drag & Drop / Motion Deps"
Cohesion: 0.33
Nodes (6): @dnd-kit/core, framer-motion, @dnd-kit/core, framer-motion, 60fps Animation Rules, Two-tool Drag & Drop strategy

### Community 41 - "Theme Skin Init & Migration"
Cohesion: 0.33
Nodes (6): SKINS mapping object (stored skin name -> data-skin value), STEAMPUNK-to-VINTAGE legacy skin alias, localStorage key task-studio:theme, localStorage key task-studio:theme-skin, Theme Init IIFE (pre-paint theme/skin setter), SKIN_ATTRIBUTE (external, in theme-provider.tsx)

### Community 43 - "Skin Picker UI"
Cohesion: 0.33
Nodes (3): SkinDefinition, SkinPreview, SKINS

### Community 44 - "Avatar Components"
Cohesion: 0.33
Nodes (5): Avatar(), AvatarProps, AvatarStack(), AvatarStackProps, SIZES

### Community 45 - "Form Field Primitives"
Cohesion: 0.33
Nodes (5): FieldShellProps, Input, InputProps, Textarea, TextareaProps

### Community 46 - "Project Whiteboard"
Cohesion: 0.47
Nodes (5): isStroke(), readImageSize(), Tool, Whiteboard(), WhiteboardProps

### Community 48 - "Ghost Duplicate (Project Rail Nav)"
Cohesion: 0.50
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 49 - "Session Store"
Cohesion: 0.50
Nodes (4): SessionState, SessionStatus, useCurrentUser(), useSessionStore

### Community 50 - "Board Toolbar"
Cohesion: 0.40
Nodes (3): BoardTool, BoardToolbarProps, TOOLS

### Community 52 - "Per-Skin Motion Curves"
Cohesion: 0.40
Nodes (3): MARKER, REVEAL, STAGE

### Community 53 - "Expandable Full-Screen Stage"
Cohesion: 0.40
Nodes (4): ExpandableStage(), ExpandableStageProps, ExpandToggle(), ExpandToggleProps

### Community 54 - "Project Rail Nav"
Cohesion: 0.50
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 57 - "PWA & Deployment Setup"
Cohesion: 0.50
Nodes (4): iOS/Safari PWA specifics, npm Scripts (dev/build/preview/typecheck/icons), vite-plugin-pwa / Workbox PWA setup, Vercel Deployment (vercel.json)

### Community 59 - "Board Ink Drawing Layer"
Cohesion: 0.67
Nodes (3): InkLayer(), InkLayerProps, toPath()

### Community 63 - "Notes Board Page"
Cohesion: 0.83
Nodes (3): fitImage(), NotesBoardPage(), readImageSize()

### Community 67 - "Select Primitive"
Cohesion: 0.50
Nodes (3): Select(), SelectOption, SelectProps

## Knowledge Gaps
- **330 isolated node(s):** `name`, `private`, `version`, `type`, `description` (+325 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **45 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Third-Party UI Dependencies` to `Build Tooling Dependencies`, `Drag & Drop / Motion Deps`, `Project Architecture & Stack`, `Third-Party UI Dependencies`, `date-fns Dependency`, `dnd-kit Sortable Dependency`, `lucide-react Dependency`, `React Dependency`, `react-dom Dependency`, `react-hook-form Dependency`, `react-router-dom Dependency`, `socket.io-client Dependency`, `tailwind-merge Dependency`, `zod Dependency`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Build Tooling Dependencies` to `Project Architecture & Stack`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Why does `Task Studio README` connect `Project Architecture & Stack` to `Drag & Drop / Motion Deps`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _330 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Notes Board Data Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.06292966684294024 - nodes in this community are weakly interconnected._
- **Should `Ghost Duplicate (Edge Reveal Menu Chrome)` be split into smaller, more focused modules?**
  _Cohesion score 0.05551020408163265 - nodes in this community are weakly interconnected._
- **Should `App Bootstrap & Providers` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._