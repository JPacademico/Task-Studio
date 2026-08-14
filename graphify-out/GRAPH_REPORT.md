# Graph Report - .  (2026-08-14)

## Corpus Check
- 40 files · ~94,857 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1114 nodes · 1432 edges · 126 communities (75 shown, 51 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 85 edges (avg confidence: 0.56)
- Token cost: 89,588 input · 0 output

## Community Hubs (Navigation)
- Notes Board API & Queries
- Task API & Completion Rules
- Edge Reveal Affordance
- App Bootstrap & Theme Init
- Build Tooling Dependencies
- Project API & Queries
- App TypeScript Config
- Task Layout Store
- Auth Scene Desk Objects
- Shared UI Primitives
- Node/Vite TypeScript Config
- Post-it Paper Icon Variants
- Button & Modal Components
- API Client & Session Refresh
- Icon Generation Script
- Runic Alphabet & Transliteration
- Floating Shortcuts Store
- Eldritch Skin Icon Set
- Theme Skin Catalog
- Edge Affordance Gradients
- Core Runtime Dependencies
- Document API & Queries
- User API & Upload
- Direction Arrow & Eldritch Decor
- Architecture & Stack Notes
- Board Position Bus & Connectors
- Board Gesture Handling
- Task Filters Config
- Task Filters UI Component
- Shared App Constants
- Date Formatting Utilities
- HTML Sanitization
- Autumn Skin Icon Set
- Hazard Skin Icon Set
- Runic Skin Icon Set
- Space Skin Icon Set
- Chat Dock Store
- Autumn Decor (Falling Leaves)
- Newspaper Skin Icon Set
- App Branding & Icons
- Notification API & Queries
- Auth API & Session Store
- Nav Pin Preferences Store
- Chat & Whiteboard API Types
- AI Suggestions API & Panel
- Rich Text Editor
- Hidden Sidebar Nav (legacy)
- Shared React Hooks
- Nav Glyph Skin Dispatch
- Hidden Sidebar Widget
- Whiteboard Widget
- Vercel Deployment Config
- Skin Picker Component
- Whiteboard Tool Logic
- Drag & Animation Dependencies
- Document Byline Attribution
- Kanban Task Board
- Notes Board Page
- Avatar Component
- Input & Textarea Fields
- Text Board Widget
- Chat Pin Tack
- Project Rail (legacy)
- Board Toolbar
- Expandable Stage Wrapper
- Route Error Boundary
- Project Rail Widget
- Task Layout Switcher
- Skin Motion Curves (legacy)
- PWA & Deployment Notes
- Board Selection Geometry
- Board Ink Drawing Layer
- Chat Dock Pin Widget
- Project Roster Panel
- Task Composer Dialog
- Project Page Tabs
- Theme Gallery Page
- Environment Config
- Skin Motion Curves
- Edge Reveal Hook
- Runic Text Transliteration UI
- Select Dropdown Component
- Task Type Tag
- Settings Page (legacy)
- Top Navigation (legacy)
- Shortcut Tear-Off Gesture
- Tear-Off Ghost Preview
- Board Page Pager
- Notification Bell
- Create Project Dialog
- Task Detail Modal
- Recycle Bin Page
- Settings Page
- Task Menu Page
- Project Chat Widget
- Top Navigation Widget
- Root TypeScript Config
- date-fns Dependency
- dnd-kit Sortable Dependency
- lucide-react Dependency
- React Dependency
- React DOM Dependency
- React Hook Form Dependency
- React Router Dependency
- Socket.io Client Dependency
- tailwind-merge Dependency
- React Query Dependency
- Zod Dependency
- PWA Manifest Icon (192px)
- PWA Manifest Icon (512px)
- Hidden Edge Menu Design Notes
- React Query Key Registry
- Maskable App Icon
- CSS Variable Theme System Notes

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `compilerOptions` - 13 edges
3. `useBoardCache()` - 12 edges
4. `useProjectBoardCache()` - 10 edges
5. `Task Studio README` - 9 edges
6. `toDate()` - 9 edges
7. `GlyphSet` - 8 edges
8. `useInvalidateTasks()` - 8 edges
9. `scripts` - 7 edges
10. `GlyphProps` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Task Studio README` --references--> `@dnd-kit/core`  [EXTRACTED]
  README.md → package.json
- `Task Studio README` --references--> `framer-motion`  [EXTRACTED]
  README.md → package.json
- `Task Studio README` --references--> `zustand`  [EXTRACTED]
  README.md → package.json
- `SKINS localStorage-to-data-skin mapping` --shares_data_with--> `SKIN_ATTRIBUTE`  [INFERRED]
  index.html → src/app/providers/theme-provider.tsx
- `Elder Futhark Rune Alphabet (24 runes with transliterated names)` --conceptually_related_to--> `DIGRAPHS`  [INFERRED]
  runicTextureExample.png → src/shared/lib/runes.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Reference image and code files forming the runic UI theme's character/glyph system** — runictextureexample_image, src_shared_lib_runes_letters, src_shared_ui_runic_decor, src_shared_ui_runic_icons, src_shared_ui_runic_text [INFERRED 0.75]
- **Performance-first Interaction Design Pattern** — readme_useedgereveal, readme_drag_and_drop_design, readme_60fps_rules [INFERRED 0.85]
- **PWA/iOS Delivery Flow** — readme_pwa_workbox, readme_ios_safari_specifics, readme_npm_scripts, readme_vercel_deployment [INFERRED 0.75]

## Communities (126 total, 51 thin omitted)

### Community 0 - "Notes Board API & Queries"
Cohesion: 0.06
Nodes (43): boardApi, noteApi, useAddBoardStroke(), useBoardCache(), useBoardPages(), useClearBoard(), useClearBoardStrokes(), useCreateBoardNote() (+35 more)

### Community 1 - "Task API & Completion Rules"
Cohesion: 0.07
Nodes (42): taskApi, blockingAssigneeCount(), canCompleteTask(), completionBlockedReason(), CompletionContext, completionProgress(), isSharedTask(), outstandingAssignees() (+34 more)

### Community 2 - "Edge Reveal Affordance"
Cohesion: 0.06
Nodes (33): CENTRE, EdgeAffordance(), EdgeAffordanceProps, GRADIENT, NavPinButton(), NavPinButtonProps, RAIL, RAIL_TONE (+25 more)

### Community 3 - "App Bootstrap & Theme Init"
Cohesion: 0.06
Nodes (35): index.html (Task Studio entry HTML), /src/main.tsx module script entry point, #root mount element, SKINS localStorage-to-data-skin mapping, Pre-paint theme/skin init script, App(), AppProviders(), QueryProvider() (+27 more)

### Community 4 - "Build Tooling Dependencies"
Cohesion: 0.06
Nodes (33): autoprefixer, description, devDependencies, autoprefixer, postcss, @types/node, @types/react, @types/react-dom (+25 more)

### Community 5 - "Project API & Queries"
Cohesion: 0.09
Nodes (13): ListProjectsParams, projectApi, MemberProductivity, OverviewDelta, PendingInvitation, Project, ProjectDashboard, ProjectInvitation (+5 more)

### Community 6 - "App TypeScript Config"
Cohesion: 0.07
Nodes (27): DOM, DOM.Iterable, src, vite/client, vite-plugin-pwa/client, compilerOptions, baseUrl, isolatedModules (+19 more)

### Community 7 - "Task Layout Store"
Cohesion: 0.12
Nodes (22): DEFAULTS, LAYOUTS_FOR, LayoutSurface, read(), Stored, TaskLayout, useTaskLayout(), write() (+14 more)

### Community 8 - "Auth Scene Desk Objects"
Cohesion: 0.11
Nodes (7): AuthScene(), DeskObject(), DeskObjectProps, floatTransition(), AuthShell(), AuthShellProps, Phase

### Community 9 - "Shared UI Primitives"
Cohesion: 0.14
Nodes (20): Badge(), BadgeProps, Collapsible(), CollapsibleProps, ColorPicker(), ColorPickerProps, EmptyState(), EmptyStateProps (+12 more)

### Community 10 - "Node/Vite TypeScript Config"
Cohesion: 0.11
Nodes (18): node, scripts/**/*.mjs, vite.config.ts, compilerOptions, allowSyntheticDefaultImports, isolatedModules, lib, module (+10 more)

### Community 11 - "Post-it Paper Icon Variants"
Cohesion: 0.13
Nodes (11): isRigidPaper(), PageStack(), paperFor(), PAPERS, PostItGlyph(), PostItMark(), PostItMarkProps, PushPinProps (+3 more)

### Community 12 - "Button & Modal Components"
Cohesion: 0.13
Nodes (13): Button, ButtonProps, Size, SIZES, Variant, VARIANTS, Modal(), ModalProps (+5 more)

### Community 13 - "API Client & Session Refresh"
Cohesion: 0.15
Nodes (7): api, RetriableConfig, sessionExpiredHandlers, connectSocket(), emitWithAck(), getSocket(), tokenStore

### Community 14 - "Icon Generation Script"
Cohesion: 0.16
Nodes (15): BRAND, BRAND_DEEP, chunk(), crc32(), crcTable, drawIcon(), encodePng(), FOLD (+7 more)

### Community 15 - "Runic Alphabet & Transliteration"
Cohesion: 0.16
Nodes (12): Elder Futhark Rune Alphabet (24 runes with transliterated names), Elder Futhark Rune Reference Chart (runicTextureExample.png), Rune glyph shapes used as visual/typographic reference for UI theme, DIGRAPHS, LETTERS, RuneToken, runeTokens(), toRunes() (+4 more)

### Community 16 - "Floating Shortcuts Store"
Cohesion: 0.22
Nodes (10): clampToViewport(), FloatingShortcut, PILL, read(), ShortcutIcon, ShortcutsState, useFloatingShortcuts, write() (+2 more)

### Community 17 - "Eldritch Skin Icon Set"
Cohesion: 0.16
Nodes (5): EldritchMark(), Glyph(), GlyphProps, GlyphSet, NavGlyphKey

### Community 18 - "Theme Skin Catalog"
Cohesion: 0.23
Nodes (9): SETTINGS_SKIN_LIMIT, SKIN_BY_VALUE, SKIN_CATALOG, SkinDefinition, SkinPreview, leaf(), notch(), SkinMock() (+1 more)

### Community 19 - "Edge Affordance Gradients"
Cohesion: 0.14
Nodes (13): CENTRE, EdgeAffordance(), EdgeAffordanceProps, GRADIENT, IRIS_GRADIENT, NavPinButton(), NavPinButtonProps, RAIL (+5 more)

### Community 20 - "Core Runtime Dependencies"
Cohesion: 0.15
Nodes (13): axios, clsx, @dnd-kit/modifiers, @dnd-kit/utilities, @hookform/resolvers, dependencies, axios, clsx (+5 more)

### Community 21 - "Document API & Queries"
Cohesion: 0.29
Nodes (8): documentApi, useCreateDocument(), useDeleteDocument(), useInvalidateDocuments(), useUpdateDocument(), CreateDocumentPayload, ProjectDocument, UpdateDocumentPayload

### Community 22 - "User API & Upload"
Cohesion: 0.21
Nodes (9): PresignedUpload, UploadScope, userApi, AuthSession, CurrentUser, SKIN_LABELS, ThemePreference, ThemeSkin (+1 more)

### Community 23 - "Direction Arrow & Eldritch Decor"
Cohesion: 0.18
Nodes (10): DirectionArrow(), DirectionArrowProps, EldritchTendrils(), EldritchTendrilsProps, GazeArrow(), GazeArrowProps, nextSighting(), Sighting (+2 more)

### Community 24 - "Architecture & Stack Notes"
Cohesion: 0.17
Nodes (12): zustand, tailwindcss, Layered Dependency Rule (app→pages→widgets→features→entities→shared), Feature-Sliced Design, Optimistic Update Strategy, React 19, Sonner (toasts), Tailwind CSS (+4 more)

### Community 25 - "Board Position Bus & Connectors"
Cohesion: 0.23
Nodes (9): Listener, Point, PositionBus, centreOf(), ConnectorLayer(), ConnectorLayerProps, curveBetween(), headTransform() (+1 more)

### Community 26 - "Board Gesture Handling"
Cohesion: 0.18
Nodes (4): MarqueeOptions, Rect, ConnectBannerProps, SelectionBarProps

### Community 27 - "Task Filters Config"
Cohesion: 0.18
Nodes (9): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PROJECT_SCOPES, STATUS_SWATCH, STATUSES, TaskFiltersProps (+1 more)

### Community 28 - "Task Filters UI Component"
Cohesion: 0.18
Nodes (9): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PROJECT_SCOPES, STATUS_SWATCH, STATUSES, TaskFiltersProps (+1 more)

### Community 29 - "Shared App Constants"
Cohesion: 0.18
Nodes (10): BOARD_INK_COLORS, CONNECTOR_COLORS, EDGE_REVEAL_PX, MAX_BOARD_PAGES, NOTE_COLORS, STORAGE_KEYS, TASK_COLORS, TASK_PRIORITY_META (+2 more)

### Community 30 - "Date Formatting Utilities"
Cohesion: 0.33
Nodes (9): formatDateTime(), formatDayLabel(), formatDeadline(), formatDeadlineDate(), formatRelative(), formatTime(), formatWindow(), toDate() (+1 more)

### Community 31 - "HTML Sanitization"
Cohesion: 0.24
Nodes (9): ALLOWED_ATTRIBUTES, ALLOWED_STYLE_PROPERTIES, ALLOWED_TAGS, clean(), DISCARDED_TAGS, GLOBAL_ATTRIBUTES, isSafeUrl(), sanitizeDocumentHtml() (+1 more)

### Community 36 - "Chat Dock Store"
Cohesion: 0.24
Nodes (5): ChatDockState, PersistedDock, restored, useChatDock, write()

### Community 37 - "Autumn Decor (Falling Leaves)"
Cohesion: 0.20
Nodes (7): AutumnFall(), AutumnHedge(), AutumnHedgeProps, FALLING, LeafProps, LeafTone, TONE_FILL

### Community 39 - "App Branding & Icons"
Cohesion: 0.28
Nodes (8): Task Studio Branding, App Icon Design (Sticky Note on Purple Gradient), favicon.svg (App Icon), Paper Sheet Gradient (Yellow/Gold), Peeled-Corner Sheet of Paper Icon (Task/Document Motif), Rounded Square Tile Shape, Text/Task Lines on Sheet, Tile Background Gradient (Indigo)

### Community 40 - "Notification API & Queries"
Cohesion: 0.28
Nodes (3): notificationApi, AppNotification, NotificationType

### Community 41 - "Auth API & Session Store"
Cohesion: 0.31
Nodes (5): authApi, SessionState, SessionStatus, useCurrentUser(), useSessionStore

### Community 42 - "Nav Pin Preferences Store"
Cohesion: 0.31
Nodes (8): DEFAULTS, NavEdge, NavPreferencesState, PinnedEdges, read(), useIsNavPinned(), useNavPreferences, write()

### Community 43 - "Chat & Whiteboard API Types"
Cohesion: 0.32
Nodes (6): chatApi, whiteboardApi, ChatMessage, WhiteboardElement, WhiteboardElementType, WhiteboardStrokeData

### Community 44 - "AI Suggestions API & Panel"
Cohesion: 0.32
Nodes (5): aiApi, AiSuggestion, SubtaskSuggestion, WorkflowInsight, SEVERITY_STYLE

### Community 45 - "Rich Text Editor"
Cohesion: 0.25
Nodes (4): COLORS, PromptKind, RichTextEditorProps, SIZES

### Community 46 - "Hidden Sidebar Nav (legacy)"
Cohesion: 0.29
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 47 - "Shared React Hooks"
Cohesion: 0.38
Nodes (3): useIsDesktop(), useIsTouchDevice(), useMediaQuery()

### Community 48 - "Nav Glyph Skin Dispatch"
Cohesion: 0.29
Nodes (6): ELDRITCH_GLYPHS, GLYPH_SETS, NavGlyph(), NavGlyphProps, NEWSPAPER_GLYPHS, RUNIC_GLYPHS

### Community 49 - "Hidden Sidebar Widget"
Cohesion: 0.29
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 50 - "Whiteboard Widget"
Cohesion: 0.43
Nodes (6): adoptStroke(), isStroke(), readImageSize(), Tool, Whiteboard(), WhiteboardProps

### Community 51 - "Vercel Deployment Config"
Cohesion: 0.29
Nodes (6): buildCommand, framework, headers, outputDirectory, rewrites, $schema

### Community 52 - "Skin Picker Component"
Cohesion: 0.33
Nodes (3): SkinDefinition, SkinPreview, SKINS

### Community 53 - "Whiteboard Tool Logic"
Cohesion: 0.47
Nodes (5): isStroke(), readImageSize(), Tool, Whiteboard(), WhiteboardProps

### Community 54 - "Drag & Animation Dependencies"
Cohesion: 0.33
Nodes (6): @dnd-kit/core, framer-motion, @dnd-kit/core, framer-motion, 60fps Animation Rules, Two-tool Drag & Drop strategy

### Community 55 - "Document Byline Attribution"
Cohesion: 0.40
Nodes (4): DocumentByline(), DocumentBylineProps, DocumentCreatorStampProps, nameFor()

### Community 57 - "Notes Board Page"
Cohesion: 0.47
Nodes (5): BoardView, fitImage(), NotesBoardPage(), readImageSize(), VIEWS

### Community 58 - "Avatar Component"
Cohesion: 0.33
Nodes (5): Avatar(), AvatarProps, AvatarStack(), AvatarStackProps, SIZES

### Community 59 - "Input & Textarea Fields"
Cohesion: 0.33
Nodes (5): FieldShellProps, Input, InputProps, Textarea, TextareaProps

### Community 60 - "Text Board Widget"
Cohesion: 0.53
Nodes (5): plain(), TextBoard(), TextBoardProps, toDownloadableHtml(), toFileName()

### Community 62 - "Project Rail (legacy)"
Cohesion: 0.50
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 63 - "Board Toolbar"
Cohesion: 0.40
Nodes (3): BoardTool, BoardToolbarProps, TOOLS

### Community 65 - "Expandable Stage Wrapper"
Cohesion: 0.40
Nodes (4): ExpandableStage(), ExpandableStageProps, ExpandToggle(), ExpandToggleProps

### Community 67 - "Project Rail Widget"
Cohesion: 0.50
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 70 - "PWA & Deployment Notes"
Cohesion: 0.50
Nodes (4): iOS/Safari PWA specifics, npm Scripts (dev/build/preview/typecheck/icons), vite-plugin-pwa / Workbox PWA setup, Vercel Deployment (vercel.json)

### Community 72 - "Board Ink Drawing Layer"
Cohesion: 0.67
Nodes (3): InkLayer(), InkLayerProps, toPath()

### Community 81 - "Runic Text Transliteration UI"
Cohesion: 0.67
Nodes (3): RunicText(), RunicTextProps, seedOf()

### Community 82 - "Select Dropdown Component"
Cohesion: 0.50
Nodes (3): Select(), SelectOption, SelectProps

## Knowledge Gaps
- **360 isolated node(s):** `name`, `private`, `version`, `type`, `description` (+355 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **51 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Core Runtime Dependencies` to `date-fns Dependency`, `Build Tooling Dependencies`, `lucide-react Dependency`, `dnd-kit Sortable Dependency`, `React Dependency`, `React DOM Dependency`, `React Hook Form Dependency`, `React Router Dependency`, `Socket.io Client Dependency`, `tailwind-merge Dependency`, `React Query Dependency`, `Zod Dependency`, `Drag & Animation Dependencies`, `Architecture & Stack Notes`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Why does `RouteBoundary` connect `Route Error Boundary` to `Shared UI Primitives`, `Button & Modal Components`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Build Tooling Dependencies` to `Architecture & Stack Notes`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _360 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Notes Board API & Queries` be split into smaller, more focused modules?**
  _Cohesion score 0.06292966684294024 - nodes in this community are weakly interconnected._
- **Should `Task API & Completion Rules` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `Edge Reveal Affordance` be split into smaller, more focused modules?**
  _Cohesion score 0.05551020408163265 - nodes in this community are weakly interconnected._