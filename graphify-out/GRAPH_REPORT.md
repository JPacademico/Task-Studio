# Graph Report - .  (2026-08-27)

## Corpus Check
- 15 files · ~223,772 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1627 nodes · 2182 edges · 170 communities (110 shown, 60 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 99 edges (avg confidence: 0.53)
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
- Frontend Dependencies
- Build Tooling Deps
- Vite/TS Client Config
- Studio Skin Icons
- Floating Shortcuts Store
- Text Board Import & Download UI
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
- Meeting Composer UI
- CSP Directives & Defense-in-Depth
- Notification Bell UI
- Skin Catalog Data
- Edge Affordance Component
- AI Suggestion Streaming
- Text Board & Document Access
- Architecture & Stack Notes
- Board Connector Layer
- UI Primitives Kit
- Board & Task Constants
- Autumn Skin Icons
- Eldritch Skin Icons
- Hazard Skin Icons
- Underwater Skin Icons
- Volcano Skin Icons
- Task Filters Config
- Auth API & Session
- Chat Dock Store
- Task Filters UI
- HTML Sanitizer
- Newspaper Skin Icons
- Space Skin Icons
- Query Cache Persistence
- Autumn Decor Elements
- Text Board Editor
- App Branding Assets
- Nav Rail Preferences
- Chat & Whiteboard API
- Package Manifest
- PWA Bootstrap & Service Worker
- Organization Members Panel
- Route Intent Prefetch
- Organization Projects Board
- Rich Text Editor
- Teams Panel UI
- Hidden Sidebar Nav
- NPM Scripts
- App Layout Shell
- OAuth Buttons UI
- Image Prep Utils
- Reusable UI Hooks
- Runic Text Encoding
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
- Edge Reveal Hook
- Input Field Component
- Project Rail Widget
- Runic Text (variant)
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
- Plain-Text-to-HTML Conversion
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
- Token Storage Security Rationale
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
- UI Primitives Kit
- Hidden Edge Menus
- UI Primitives Kit
- Not Found Page
- UI Primitives Kit
- UI Primitives Kit
- UI Primitives Kit
- UI Primitives Kit
- UI Primitives Kit
- UI Primitives Kit
- UI Primitives Kit
- Maskable App Icon
- Project Dashboard Widget
- Maskable Icon Asset
- Apple Touch Icon
- Favicon Brand Mark
- PWA Icon (192px)
- PWA Icon (512px)
- CSS Theme Variables
- Cache-Control Header Policy
- Meeting API & Cache
- Meeting API & Cache
- Meeting API & Cache

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `Content-Security-Policy` - 14 edges
3. `compilerOptions` - 13 edges
4. `useBoardCache()` - 13 edges
5. `useProjectBoardCache()` - 11 edges
6. `GlyphSet` - 10 edges
7. `Task Studio README` - 9 edges
8. `GlyphProps` - 9 edges
9. `Glyph()` - 9 edges
10. `toDate()` - 9 edges

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

## Communities (170 total, 60 thin omitted)

### Community 0 - "Post-it Board Sync"
Cohesion: 0.06
Nodes (59): boardApi, noteApi, EditableField, markLocalNoteEdit(), mergeRemoteNote(), pending, PendingEdit, prune() (+51 more)

### Community 1 - "Task Completion Logic"
Cohesion: 0.06
Nodes (60): taskApi, blockingAssigneeCount(), canCompleteTask(), completionBlockedReason(), CompletionContext, completionProgress(), isSharedTask(), outstandingAssignees() (+52 more)

### Community 2 - "App Bootstrap & Theming"
Cohesion: 0.05
Nodes (23): AuthScene(), DeskObject(), DeskObjectProps, floatTransition(), AuthShell(), AuthShellProps, Phase, api (+15 more)

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
Nodes (25): organizationApi, useAttachProject(), useCreateOrganization(), useDetachProject(), useInviteToOrganization(), useOrganizationRefresh(), useRemoveOrganizationMember(), useRevokeOrganizationInvitation() (+17 more)

### Community 7 - "Task Layout Preferences"
Cohesion: 0.10
Nodes (24): DEFAULTS, LAYOUTS_FOR, LayoutSurface, read(), Stored, TaskLayout, useTaskLayout(), write() (+16 more)

### Community 8 - "Frontend Dependencies"
Cohesion: 0.10
Nodes (25): HazardDrift(), MOTES, Badge(), BadgeProps, Collapsible(), CollapsibleProps, ColorPicker(), ColorPickerProps (+17 more)

### Community 9 - "Build Tooling Deps"
Cohesion: 0.09
Nodes (26): DOCUMENT_ACCEPT, DOCUMENT_MIME_TYPES, EXTENSION_MIME, IMPORT_ACCEPT, IMPORT_MIME_TYPES, MAX_DOCUMENT_BYTES, PresignedUpload, putDocument() (+18 more)

### Community 10 - "Vite/TS Client Config"
Cohesion: 0.07
Nodes (27): DOM, DOM.Iterable, src, vite/client, vite-plugin-pwa/client, compilerOptions, baseUrl, isolatedModules (+19 more)

### Community 11 - "Studio Skin Icons"
Cohesion: 0.17
Nodes (20): meetingApi, byStart(), invalidateAgenda(), organizationKey(), projectKey(), removeMeeting(), upsertMeeting(), useCompleteMeeting() (+12 more)

### Community 12 - "Floating Shortcuts Store"
Cohesion: 0.17
Nodes (17): documentApi, useAdoptDocument(), useConvertDocument(), useCreateDocument(), useDeleteDocument(), useDocumentListCache(), useImportDocument(), useProjectDocumentsRealtime() (+9 more)

### Community 13 - "Text Board Import & Download UI"
Cohesion: 0.13
Nodes (19): DocumentAccessDialog(), DocumentAccessDialogProps, DocumentDownloadMenu(), DownloadMenuProps, ICONS, saveBlob(), stem(), formatBadge() (+11 more)

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
Nodes (19): autoprefixer, devDependencies, autoprefixer, postcss, tailwindcss, @types/node, @types/react, @types/react-dom (+11 more)

### Community 18 - "i18n Locale Engine"
Cohesion: 0.11
Nodes (18): node, scripts/**/*.mjs, vite.config.ts, compilerOptions, allowSyntheticDefaultImports, isolatedModules, lib, module (+10 more)

### Community 19 - "Runic Skin Icons"
Cohesion: 0.13
Nodes (10): read(), Stored, useHiddenColumns(), write(), GroupTaskCard(), GroupTaskCardProps, RIBBON, GroupsBoardProps (+2 more)

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

### Community 24 - "Meeting Composer UI"
Cohesion: 0.16
Nodes (15): BRAND, BRAND_DEEP, chunk(), crc32(), crcTable, drawIcon(), encodePng(), FOLD (+7 more)

### Community 25 - "CSP Directives & Defense-in-Depth"
Cohesion: 0.13
Nodes (16): base-uri 'self', Cloudflare R2 (bucket-specific hostname), connect-src 'self' https: wss:, Content-Security-Policy, contentEditable innerHTML + sanitiser (defense in depth), documentApi.sourceObjectUrl, form-action 'self', frame-ancestors 'none' (+8 more)

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

### Community 33 - "UI Primitives Kit"
Cohesion: 0.15
Nodes (13): axios, clsx, @dnd-kit/modifiers, @dnd-kit/utilities, @hookform/resolvers, dependencies, axios, clsx (+5 more)

### Community 34 - "Board & Task Constants"
Cohesion: 0.18
Nodes (10): DirectionArrow(), DirectionArrowProps, EldritchTendrils(), EldritchTendrilsProps, GazeArrow(), GazeArrowProps, nextSighting(), Sighting (+2 more)

### Community 35 - "Autumn Skin Icons"
Cohesion: 0.21
Nodes (8): authApi, OAuthAvailability, OAuthProvider, SessionState, SessionStatus, useCurrentUser(), useSessionStore, SignOut

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

### Community 40 - "Task Filters Config"
Cohesion: 0.17
Nodes (3): GlyphProps, SPACE_GLYPHS, SpaceMark()

### Community 44 - "HTML Sanitizer"
Cohesion: 0.18
Nodes (9): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PROJECT_SCOPES, STATUS_SWATCH, STATUSES, TaskFiltersProps (+1 more)

### Community 45 - "Newspaper Skin Icons"
Cohesion: 0.22
Nodes (5): ChatDockState, PersistedDock, restored, useChatDock, write()

### Community 46 - "Space Skin Icons"
Cohesion: 0.18
Nodes (9): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PROJECT_SCOPES, STATUS_SWATCH, STATUSES, TaskFiltersProps (+1 more)

### Community 47 - "Query Cache Persistence"
Cohesion: 0.24
Nodes (9): ALLOWED_ATTRIBUTES, ALLOWED_STYLE_PROPERTIES, ALLOWED_TAGS, clean(), DISCARDED_TAGS, GLOBAL_ATTRIBUTES, isSafeUrl(), sanitizeDocumentHtml() (+1 more)

### Community 51 - "Nav Rail Preferences"
Cohesion: 0.20
Nodes (10): zustand, Layered Dependency Rule (app→pages→widgets→features→entities→shared), Feature-Sliced Design, Optimistic Update Strategy, React 19, Sonner (toasts), TanStack Query, Task Studio README (+2 more)

### Community 52 - "Chat & Whiteboard API"
Cohesion: 0.31
Nodes (9): clearPersistedQueries(), hydrateQueryCache(), isPersistable(), PERSISTED_PREFIXES, PersistedBlob, PersistedEntry, persistQueryCache(), read() (+1 more)

### Community 53 - "Package Manifest"
Cohesion: 0.20
Nodes (7): AutumnFall(), AutumnHedge(), AutumnHedgeProps, FALLING, LeafProps, LeafTone, TONE_FILL

### Community 54 - "PWA Bootstrap & Service Worker"
Cohesion: 0.22
Nodes (8): iOS standalone / viewport-fit=cover hints, <script type="module" src="/src/main.tsx">, <script src="/theme-init.js"> in index.html <head>, vite-plugin-pwa, /registerSW.js, script-src 'self', public/theme-init.js, vite-plugin-pwa

### Community 55 - "Organization Members Panel"
Cohesion: 0.28
Nodes (7): chatApi, whiteboardApi, ChatDelivery, ChatMessage, WhiteboardElement, WhiteboardElementType, WhiteboardStrokeData

### Community 56 - "Route Intent Prefetch"
Cohesion: 0.25
Nodes (6): ASSUME_BOTH, LABELS, MARKS, OAuthButtons(), OAuthButtonsProps, readRemembered()

### Community 57 - "Organization Projects Board"
Cohesion: 0.25
Nodes (7): description, engines, node, name, private, type, version

### Community 58 - "Rich Text Editor"
Cohesion: 0.25
Nodes (4): ASSIGNABLE_ROLES, InviteListProps, OrganizationDialogProps, ProjectPickerProps

### Community 59 - "Teams Panel UI"
Cohesion: 0.25
Nodes (4): ASSIGNABLE_ROLES, InviteFormProps, MemberRowProps, OrganizationMembersPanelProps

### Community 60 - "Hidden Sidebar Nav"
Cohesion: 0.29
Nodes (6): Lane, laneOf(), LANES, OrganizationProjectsBoard(), OrganizationProjectsBoardProps, ProjectCardProps

### Community 61 - "NPM Scripts"
Cohesion: 0.25
Nodes (4): COLORS, PromptKind, RichTextEditorProps, SIZES

### Community 62 - "App Layout Shell"
Cohesion: 0.29
Nodes (4): NoteCardProps, NoteChecklist(), NoteChecklistProps, TaskDetailModalProps

### Community 63 - "OAuth Buttons UI"
Cohesion: 0.29
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 64 - "Image Prep Utils"
Cohesion: 0.29
Nodes (7): @dnd-kit/core, framer-motion, @dnd-kit/core, framer-motion, 60fps Animation Rules, Two-tool Drag & Drop strategy, style-src 'self' 'unsafe-inline'

### Community 65 - "Reusable UI Hooks"
Cohesion: 0.29
Nodes (7): scripts, build, dev, icons, lint, preview, typecheck

### Community 66 - "Runic Text Encoding"
Cohesion: 0.38
Nodes (4): AGENDA_PREFETCH, rememberedBoardPage(), useRouteIntentPrefetch(), useShellPrefetch()

### Community 67 - "Avatar Components"
Cohesion: 0.33
Nodes (4): COLUMNS, DraggableTask(), lockedHint(), TaskBoardProps

### Community 68 - "File Attachment UI"
Cohesion: 0.29
Nodes (3): TeamComposerProps, TeamRowProps, TeamsPanelProps

### Community 69 - "Hidden Sidebar (dup)"
Cohesion: 0.38
Nodes (3): useIsDesktop(), useIsTouchDevice(), useMediaQuery()

### Community 70 - "Vercel Deploy Config"
Cohesion: 0.33
Nodes (5): DIGRAPHS, LETTERS, RuneToken, runeTokens(), toRunes()

### Community 71 - "Skin Picker UI"
Cohesion: 0.38
Nodes (5): forget(), IntentHandlers, isSpeculationWelcome(), lastPrefetchedAt, useIntentPrefetch()

### Community 72 - "Whiteboard Canvas"
Cohesion: 0.38
Nodes (6): extensionOf(), FileAttachmentField(), FileAttachmentFieldProps, FileAttachmentRow(), FileAttachmentRowProps, formatFileSize()

### Community 73 - "DnD & Motion Libs"
Cohesion: 0.43
Nodes (5): GlyphSet, NavGlyphKey, GLYPH_SETS, NavGlyph(), NavGlyphProps

### Community 74 - "Document Byline UI"
Cohesion: 0.29
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 75 - "Task Board DnD"
Cohesion: 0.29
Nodes (6): buildCommand, framework, headers, outputDirectory, rewrites, $schema

### Community 76 - "Organization Dashboard UI"
Cohesion: 0.33
Nodes (3): SkinDefinition, SkinPreview, SKINS

### Community 77 - "Project Roster Panel"
Cohesion: 0.47
Nodes (5): isStroke(), readImageSize(), Tool, Whiteboard(), WhiteboardProps

### Community 78 - "Edge Reveal Hook"
Cohesion: 0.40
Nodes (4): DocumentByline(), DocumentBylineProps, DocumentCreatorStampProps, nameFor()

### Community 80 - "Project Rail Widget"
Cohesion: 0.33
Nodes (3): ASSIGNABLE_ROLES, ROLE_ICON, RosterPanelProps

### Community 82 - "Whiteboard Component (variant)"
Cohesion: 0.47
Nodes (5): encodeAt(), PreparedImage, prepareImage(), PrepareOptions, scaleToFit()

### Community 83 - "Chat Pin Widget"
Cohesion: 0.33
Nodes (3): Edge, KeepOut, Options

### Community 84 - "Project Rail (dup)"
Cohesion: 0.33
Nodes (5): Avatar(), AvatarProps, AvatarStack(), AvatarStackProps, SIZES

### Community 85 - "Board Toolbar UI"
Cohesion: 0.33
Nodes (5): FieldShellProps, Input, InputProps, Textarea, TextareaProps

### Community 86 - "Invite Picker"
Cohesion: 0.40
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 87 - "Task Composer UI"
Cohesion: 0.47
Nodes (5): adoptStroke(), isStroke(), Tool, Whiteboard(), WhiteboardProps

### Community 89 - "Organization Page Shell"
Cohesion: 0.50
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 90 - "Task Menu Page"
Cohesion: 0.40
Nodes (3): InvitePickerProps, Person, Tab

### Community 91 - "API Env Config"
Cohesion: 0.40
Nodes (3): BoardTool, BoardToolbarProps, TOOLS

### Community 94 - "Expandable Stage UI"
Cohesion: 0.40
Nodes (3): EMPTY_ROSTER, PRIORITIES, TaskComposerProps

### Community 95 - "Route Error Boundary"
Cohesion: 0.50
Nodes (3): AgendaRowProps, dayKey(), MeetingsPage()

### Community 97 - "Select Popup Component"
Cohesion: 0.60
Nodes (3): AgendaSkeleton(), isSameDay(), TaskMenuPage()

### Community 98 - "Layout Switcher UI"
Cohesion: 0.50
Nodes (4): apiUrl, env, resolveApiUrl(), stripTrailingSlash()

### Community 100 - "PWA/Deploy Notes"
Cohesion: 0.40
Nodes (4): ExpandableStage(), ExpandableStageProps, ExpandToggle(), ExpandToggleProps

### Community 102 - "Image Drop Hook"
Cohesion: 0.50
Nodes (4): Mark, nextMark(), RuneScribe(), STAVES

### Community 103 - "Whiteboard Ink Layer"
Cohesion: 0.40
Nodes (4): PopupBox, Select(), SelectOption, SelectProps

### Community 106 - "Notes Board Page"
Cohesion: 0.50
Nodes (4): iOS/Safari PWA specifics, npm Scripts (dev/build/preview/typecheck/icons), vite-plugin-pwa / Workbox PWA setup, Vercel Deployment (vercel.json)

### Community 107 - "Plain-Text-to-HTML Conversion"
Cohesion: 0.67
Nodes (3): escapeText(), MAX_PLAIN_TEXT_CHARS, plainTextToHtml()

### Community 109 - "Project Page Shell"
Cohesion: 0.67
Nodes (3): fitImage(), ImageDropOptions, useImageDrop()

### Community 110 - "Theme Gallery Page"
Cohesion: 0.67
Nodes (3): InkLayer(), InkLayerProps, toPath()

### Community 111 - "Zoomable Image UI"
Cohesion: 0.67
Nodes (3): byNewest(), InvitationsPage(), UnifiedInvitation

### Community 115 - "Top Navigation Bar"
Cohesion: 0.67
Nodes (3): Bin, daysUntil(), RecycleBinPage()

### Community 119 - "Language Toggle UI"
Cohesion: 0.67
Nodes (3): RunicText(), RunicTextProps, seedOf()

### Community 120 - "Board Pager UI"
Cohesion: 0.67
Nodes (3): clamp(), ZoomableImage(), ZoomableImageProps

### Community 125 - "Token Storage Security Rationale"
Cohesion: 1.00
Nodes (3): Structural fix: httpOnly cookie on shared parent domain, Access/refresh tokens stored in localStorage, shared/api/token-store (token-store.ts)

## Knowledge Gaps
- **504 isolated node(s):** `name`, `private`, `version`, `type`, `description` (+499 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **60 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `UI Primitives Kit` to `Image Prep Utils`, `UI Primitives Kit`, `Hidden Edge Menus`, `UI Primitives Kit`, `Not Found Page`, `UI Primitives Kit`, `UI Primitives Kit`, `UI Primitives Kit`, `UI Primitives Kit`, `UI Primitives Kit`, `UI Primitives Kit`, `UI Primitives Kit`, `Nav Rail Preferences`, `Organization Projects Board`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Button Component` to `Organization Projects Board`, `PWA Bootstrap & Service Worker`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Why does `Content-Security-Policy` connect `CSP Directives & Defense-in-Depth` to `Image Prep Utils`, `Token Storage Security Rationale`, `PWA Bootstrap & Service Worker`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _504 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Post-it Board Sync` be split into smaller, more focused modules?**
  _Cohesion score 0.05561105561105561 - nodes in this community are weakly interconnected._
- **Should `Task Completion Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.05593607305936073 - nodes in this community are weakly interconnected._
- **Should `App Bootstrap & Theming` be split into smaller, more focused modules?**
  _Cohesion score 0.050314465408805034 - nodes in this community are weakly interconnected._