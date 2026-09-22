# Graph Report - .  (2026-09-21)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2258 nodes · 3080 edges · 217 communities (159 shown, 58 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 66 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1e0bac74`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- task/model/queries.ts
- ui/index.ts
- index.ts
- project/model/queries.ts
- landing-page.tsx
- text-board.tsx
- client.ts
- user.api.ts
- ui/studio-icons.tsx
- document/model/queries.ts
- integration/model/queries.ts
- use-live-call.ts
- devDependencies
- organization/model/queries.ts
- meeting/model/queries.ts
- compilerOptions
- generate-icons.mjs
- task-views/index.ts
- feature-carousel.tsx
- compilerOptions
- button.tsx
- auth-scene.tsx
- dates.ts
- billing/model/types.ts
- live-room/model/types.ts
- ai.api.ts
- integration/model/types.ts
- task-group/model/queries.ts
- router/index.tsx
- groups-board.tsx
- meetings-panel.tsx
- i18n/index.ts
- constants.ts
- board-queries.ts
- create-project-dialog.tsx
- skin-catalog.ts
- integrations-strip.tsx
- note/model/types.ts
- shortcuts.store.ts
- hero-field.tsx
- halloween/build-cursors.py
- project-board-queries.ts
- notification/model/queries.ts
- team/model/queries.ts
- auth.api.ts
- plan-panel.tsx
- ui/edge-affordance.tsx
- dependencies
- ui/task-filters.tsx
- eldritch-decor.tsx
- task-board.tsx
- connector-layer.tsx
- board-overlays.tsx
- nav-preferences.store.ts
- task-filters.tsx
- paper/build-cursors.py
- Task Studio README
- App.tsx
- activity/model/queries.ts
- post-it.tsx
- admin.api.ts
- cli-commands.tsx
- chat-dock.store.ts
- docs-content.ts
- sanitize-html.ts
- halloween-icons.tsx
- build-cursors.py
- theme-provider.tsx
- optimistic.ts
- webhooks-panel.tsx
- query-persist.ts
- autumn-decor.tsx
- realtime-provider.tsx
- chat/model/types.ts
- local-edits.ts
- oauth-buttons.tsx
- roster-panel.tsx
- notifications.ts
- import-tracker.tsx
- calendar.api.ts
- organization-dialog.tsx
- organization-members-panel.tsx
- organization-projects-board.tsx
- rich-text-editor.tsx
- note-checklist.tsx
- ui/hidden-sidebar.tsx
- project-changelog.tsx
- hidden-sidebar.tsx
- use-shell-prefetch.ts
- providers/index.tsx
- webhooks.api.ts
- human-check.tsx
- teams-panel.tsx
- dashboard-page.tsx
- hooks.ts
- runes.ts
- theme-colors.ts
- use-intent-prefetch.ts
- file-attachment.tsx
- vercel.json
- skin-picker.tsx
- whiteboard.tsx
- @dnd-kit/core
- document-byline.tsx
- imports.api.ts
- note/model/queries.ts
- connections-panel.tsx
- organization-dashboard.tsx
- admin-page.tsx
- prepare-image.ts
- use-edge-reveal.ts
- avatar.tsx
- ui/project-rail.tsx
- ui/whiteboard.tsx
- chat-pin.tsx
- project-rail.tsx
- favicon.svg (browser tab icon)
- invite-picker.tsx
- use-board-history.ts
- board-toolbar.tsx
- notification-bell.tsx
- organization-banner.tsx
- ui/chat-pin.tsx
- figma-link.tsx
- repository-link.tsx
- task-composer.tsx
- cli-authorize-page.tsx
- shader-wash.tsx
- meetings-page.tsx
- organization-page.tsx
- recycle-bin-page.tsx
- task-menu-page.tsx
- env.ts
- use-canvas-budget.ts
- write-order.ts
- ui/expandable-stage.tsx
- runic-decor.tsx
- ui/select.tsx
- layout-switcher.tsx
- skin-motion.ts
- lava-goo SVG metaball filter
- vite-plugin-pwa / Workbox PWA setup
- plain-text.ts
- cli-device.api.ts
- selection.ts
- use-image-drop.ts
- ink-layer.tsx
- invitations-page.tsx
- notes-board-page.tsx
- organizations-page.tsx
- project-page.tsx
- theme-gallery-page.tsx
- lib/skin-motion.ts
- use-card-press.ts
- nav-glyph.tsx
- halloween-decor.tsx
- runic-text.tsx
- zoomable-image.tsx
- vite.config.ts
- task-type-tag.tsx
- settings-page.tsx
- top-navigation.tsx
- Creepster Font
- github.api.ts
- project-window-chip.tsx
- pending-tasks.tsx
- api-tokens-panel.tsx
- calendar-connection-panel.tsx
- use-tear-off.ts
- tear-off-ghost.tsx
- language-toggle.tsx
- board-pager.tsx
- board-skeleton.tsx
- spotify-connection-panel.tsx
- plan-soon-page.tsx
- settings/settings-page.tsx
- use-viewport-drag-bounds.ts
- project-chat.tsx
- ui/top-navigation.tsx
- tsconfig.json
- clsx
- date-fns
- @dnd-kit/modifiers
- @dnd-kit/sortable
- @dnd-kit/utilities
- @hookform/resolvers
- lucide-react
- @paper-design/shaders-react
- react
- react-dom
- react-hook-form
- react-router-dom
- @react-three/fiber
- socket.io-client
- @tanstack/react-query
- Hidden Edge Menus design
- query-keys.ts
- Image
- CSS-variable Theme System (light/dark)

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `useBoardCache()` - 14 edges
3. `compilerOptions` - 13 edges
4. `useProjectBoardCache()` - 12 edges
5. `StudioLetter()` - 12 edges
6. `GlyphProps` - 11 edges
7. `toDate()` - 11 edges
8. `useDocumentListCache()` - 10 edges
9. `SpeakingDetector` - 10 edges
10. `Task Studio README` - 9 edges

## Surprising Connections (you probably didn't know these)
- `StudioLetter()` --shares_data_with--> `Handwritten 't' glyph stroke paths`  [INFERRED]
  src/shared/ui/studio-letter.tsx → public/favicon.svg
- `drawIcon()` --conceptually_related_to--> `Apple Touch Icon (Task Studio Brand Mark)`  [INFERRED]
  scripts/generate-icons.mjs → public/apple-touch-icon.png
- `drawIcon()` --shares_data_with--> `Icon-192 Brand Mark`  [INFERRED]
  scripts/generate-icons.mjs → public/icons/icon-192.png
- `StudioLetter()` --shares_data_with--> `favicon.svg (browser tab icon)`  [INFERRED]
  src/shared/ui/studio-letter.tsx → public/favicon.svg
- `Task Studio README` --references--> `@dnd-kit/core`  [EXTRACTED]
  README.md → package.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Build-time API configuration pattern** — docker_compose_web_service, docker_compose_dockerfile, docker_compose_vite_api_url, docker_compose_vite_socket_url [EXTRACTED 1.00]
- **TLS-terminating reverse proxy deployment topology** — docker_compose_port_mapping, docker_compose_reverse_proxy_rationale, docker_compose_caddy, docker_compose_ssh_tunnel [INFERRED 0.85]
- **Pre-React document bootstrap (theme, gooey filter, app mount)** — index_theme_init_script, index_lava_goo_filter, index_main_tsx_entry [INFERRED 0.75]
- **Performance-first Interaction Design Pattern** — readme_useedgereveal, readme_drag_and_drop_design, readme_60fps_rules [INFERRED 0.85]
- **PWA/iOS Delivery Flow** — readme_pwa_workbox, readme_ios_safari_specifics, readme_npm_scripts, readme_vercel_deployment [INFERRED 0.75]

## Communities (217 total, 58 thin omitted)

### Community 0 - "task/model/queries.ts"
Cohesion: 0.05
Nodes (62): taskApi, blockingAssigneeCount(), canCompleteTask(), completionBlockedReason(), CompletionContext, completionProgress(), isSharedTask(), outstandingAssignees() (+54 more)

### Community 1 - "ui/index.ts"
Cohesion: 0.06
Nodes (41): GoogleCalendarMark(), HazardDrift(), MOTES, HoverHint(), HoverHintProps, FieldShellProps, Input, InputProps (+33 more)

### Community 2 - "index.ts"
Cohesion: 0.06
Nodes (33): CENTRE, EdgeAffordance(), EdgeAffordanceProps, GRADIENT, NavPinButton(), NavPinButtonProps, RAIL, RAIL_TONE (+25 more)

### Community 3 - "project/model/queries.ts"
Cohesion: 0.06
Nodes (25): ListProjectsParams, projectApi, patchProjectPinned(), patchRosterRemoval(), seedProjectFrom(), useProject(), useProjectIntentPrefetch(), useRemoveMember() (+17 more)

### Community 4 - "landing-page.tsx"
Cohesion: 0.06
Nodes (31): FOOTER_NOTES, FeatureCarousel(), FeatureNotes(), NOTES, LandingNav(), scrollToSection(), scrollToTop(), GAPS (+23 more)

### Community 5 - "text-board.tsx"
Cohesion: 0.06
Nodes (39): ArchiveDocument(), ArchiveDocumentProps, depthOf(), leafOf(), BoardGauge(), DocumentAccessDialog(), DocumentAccessDialogProps, DocumentDownloadMenu() (+31 more)

### Community 6 - "client.ts"
Cohesion: 0.07
Nodes (28): api, apiIsWarm(), ensureApiAwake(), errorMessage(), CLIENT_ID, CLIENT_ID_HEADER, isApiWarm(), isReadable() (+20 more)

### Community 7 - "user.api.ts"
Cohesion: 0.06
Nodes (39): BOARD_EXPORT_MIME, classifyImportFile(), DOCUMENT_ACCEPT, DOCUMENT_MIME_TYPES, EXTENSION_MIME, IMPORT_ACCEPT, IMPORT_ARCHIVE_MIME, IMPORT_DOCUMENT_MIME (+31 more)

### Community 8 - "ui/studio-icons.tsx"
Cohesion: 0.10
Nodes (24): AutumnMark(), EldritchMark(), GlyphProps, HazardMark(), NewspaperMark(), RunicMark(), SpaceMark(), isRigidPaper() (+16 more)

### Community 9 - "document/model/queries.ts"
Cohesion: 0.08
Nodes (30): documentApi, useAdoptDocument(), useCreateDocument(), useCreateFigmaPage(), useDeleteDocument(), useDocumentListCache(), useImportDocument(), useProjectDocumentsRealtime() (+22 more)

### Community 10 - "integration/model/queries.ts"
Cohesion: 0.06
Nodes (5): ConnectFigmaPayload, figmaApi, rememberedFigmaAvailability(), rememberFigmaAvailability(), useFigmaAvailability()

### Community 11 - "use-live-call.ts"
Cohesion: 0.08
Nodes (24): SpeakingDetector, Tracked, AUDIO_CONSTRAINTS, Connection, FALLBACK_ICE, LiveCallStatus, LivePeer, useLiveCall() (+16 more)

### Community 12 - "devDependencies"
Cohesion: 0.05
Nodes (36): autoprefixer, description, devDependencies, autoprefixer, postcss, tailwindcss, @types/node, @types/react (+28 more)

### Community 13 - "organization/model/queries.ts"
Cohesion: 0.09
Nodes (25): organizationApi, useAttachProject(), useCreateOrganization(), useDetachProject(), useInviteToOrganization(), useOrganizationRefresh(), useRemoveOrganizationMember(), useRevokeOrganizationInvitation() (+17 more)

### Community 14 - "meeting/model/queries.ts"
Cohesion: 0.12
Nodes (32): meetingApi, meetingRoomApi, byStart(), invalidateAgenda(), invalidateInheritedRooms(), organizationKey(), projectKey(), removeMeeting() (+24 more)

### Community 15 - "compilerOptions"
Cohesion: 0.07
Nodes (32): Build args instead of runtime env vars, Caddy (API droplet reverse proxy), Dockerfile, json-file logging with rotation, nginx (production-parity server), npm run preview (dev preview, not production-parity), 8080:80 port mapping, Not binding port 80 directly, put behind TLS terminator (+24 more)

### Community 16 - "generate-icons.mjs"
Cohesion: 0.08
Nodes (29): Apple Touch Icon (Task Studio Brand Mark), Icon-192 Brand Mark, Icon-512 Post-it Note Brand Mark, Maskable 512 Icon (Post-it Mark, Full-Bleed Tile), Why Maskable Icons Keep Their Background Tile, BAR, BRAND, BRAND_DEEP (+21 more)

### Community 17 - "task-views/index.ts"
Cohesion: 0.10
Nodes (24): DEFAULTS, LAYOUTS_FOR, LayoutSurface, read(), Stored, TaskLayout, useTaskLayout(), write() (+16 more)

### Community 18 - "feature-carousel.tsx"
Cohesion: 0.10
Nodes (23): COLUMNS, DemoBoard(), LANES, RESIDENTS, DemoChat(), MESSAGES, DemoFrame(), DemoFrameProps (+15 more)

### Community 19 - "compilerOptions"
Cohesion: 0.07
Nodes (27): DOM, DOM.Iterable, src, vite/client, vite-plugin-pwa/client, compilerOptions, baseUrl, isolatedModules (+19 more)

### Community 20 - "button.tsx"
Cohesion: 0.08
Nodes (18): Button, buttonClasses(), ButtonProps, GAPS, Size, SIZES, Variant, VARIANTS (+10 more)

### Community 21 - "auth-scene.tsx"
Cohesion: 0.10
Nodes (7): AuthScene(), DeskObject(), DeskObjectProps, floatTransition(), AuthShell(), AuthShellProps, Phase

### Community 22 - "dates.ts"
Cohesion: 0.18
Nodes (22): DATE_WINDOW_YEARS, dateInputBounds(), dateInputMax(), dateInputMin(), dateLocale(), dayInputMax(), dayInputMin(), formatCalendarDate() (+14 more)

### Community 23 - "billing/model/types.ts"
Cohesion: 0.12
Nodes (14): billingApi, BillingInterval, BillingSummary, BroadcastFlavour, Currency, Limit, Plan, PlanCatalogue (+6 more)

### Community 24 - "live-room/model/types.ts"
Cohesion: 0.15
Nodes (17): liveRoomApi, byOpening(), useLiveRoomActions(), useLiveRoomEvents(), CreateLiveRoomPayload, GrantLiveRoomPayload, IceServerConfig, LiveAudience (+9 more)

### Community 25 - "ai.api.ts"
Cohesion: 0.15
Nodes (15): AiAllowance, aiApi, AiStatus, AiSuggestion, ProjectTaskSuggestion, SubtaskSuggestion, useInvalidateAllowance(), useSuggestDraftSubtasks() (+7 more)

### Community 26 - "integration/model/types.ts"
Cohesion: 0.12
Nodes (18): spotifyApi, tokensApi, ApiToken, BoardImportSource, CreatedApiToken, ImportSource, ImportStatus, ImportStep (+10 more)

### Community 27 - "task-group/model/queries.ts"
Cohesion: 0.17
Nodes (13): taskGroupApi, invalidateGroups(), orderKey, useCreateTaskGroup(), useDeleteTaskGroup(), useReorderTaskGroups(), useUpdateTaskGroup(), CreateTaskGroupPayload (+5 more)

### Community 28 - "router/index.tsx"
Cohesion: 0.11
Nodes (18): AdminPage, CliAuthorizePage, DashboardPage, DocsPage, InvitationsPage, LandingPage, MeetingsPage, NotesBoardPage (+10 more)

### Community 29 - "groups-board.tsx"
Cohesion: 0.13
Nodes (10): read(), Stored, useHiddenColumns(), write(), GroupTaskCard(), GroupTaskCardProps, RIBBON, GroupsBoardProps (+2 more)

### Community 30 - "meetings-panel.tsx"
Cohesion: 0.14
Nodes (13): MeetingComposer(), MeetingComposerProps, nextHour(), dayKey(), MeetingRow, MeetingRowProps, MeetingsPanel(), MeetingsPanelProps (+5 more)

### Community 31 - "i18n/index.ts"
Cohesion: 0.19
Nodes (15): detectLocale(), LocaleState, substitute(), syncDocumentLang(), Translate, useLocale(), useLocaleStore, useT() (+7 more)

### Community 32 - "constants.ts"
Cohesion: 0.12
Nodes (16): RFC-5321, BOARD_INK_COLORS, CONNECTOR_COLORS, EDGE_REVEAL_PX, GROUP_COLUMNS_PER_PAGE, MAX_BOARD_PAGES, MAX_GROUPS_PER_PROJECT, MAX_TASK_NOTES (+8 more)

### Community 33 - "board-queries.ts"
Cohesion: 0.21
Nodes (14): useAddBoardStroke(), useBoardCache(), useBoardPages(), useClearBoard(), useClearBoardStrokes(), useCreateBoardNote(), useCreateNoteLink(), useDeleteBoardNote() (+6 more)

### Community 34 - "create-project-dialog.tsx"
Cohesion: 0.15
Nodes (10): BoardImportPanel(), BoardImportPanelProps, sourceFor(), CreateProjectDialogProps, Mode, GithubImportPanel(), GithubImportPanelProps, ProjectSettingsDialogProps (+2 more)

### Community 35 - "skin-catalog.ts"
Cohesion: 0.21
Nodes (10): SETTINGS_SKIN_LIMIT, SKIN_BY_VALUE, SKIN_CATALOG, SkinDefinition, SkinPreview, CursorToggle(), leaf(), notch() (+2 more)

### Community 36 - "integrations-strip.tsx"
Cohesion: 0.17
Nodes (13): IntegrationsStrip(), Service, SERVICES, DiscordMark(), ExportMark(), FeedMark(), FigmaMark(), GitHubMark() (+5 more)

### Community 37 - "note/model/types.ts"
Cohesion: 0.22
Nodes (13): boardApi, BoardPage, BoardSnapshot, BoardStroke, CreateBoardStrokePayload, CreateNoteLinkPayload, CreateNotePayload, ListNotesParams (+5 more)

### Community 38 - "shortcuts.store.ts"
Cohesion: 0.22
Nodes (10): clampToViewport(), FloatingShortcut, PILL, read(), ShortcutIcon, ShortcutsState, useFloatingShortcuts, write() (+2 more)

### Community 39 - "hero-field.tsx"
Cohesion: 0.20
Nodes (14): HeroField, buildField(), CardSpec, createSheetTexture(), Field(), HeroField(), hexToHsl(), hslToHex() (+6 more)

### Community 40 - "halloween/build-cursors.py"
Cohesion: 0.21
Nodes (12): axis(), frame(), haloed(), opaque_points(), Image, Builds the Halloween knife cursor from the two drawings in this folder. Run it…, One cursor frame: turned onto the arrow's diagonal, scaled, placed. The…, The same frame with a dark rim behind it, for the cream page. Light-mode… (+4 more)

### Community 41 - "project-board-queries.ts"
Cohesion: 0.26
Nodes (12): useCreateProjectNote(), useCreateProjectNoteLink(), useDeleteProjectNote(), useDeleteProjectNoteLink(), useGroupProjectNotes(), usePatchProjectNotes(), usePatchProjectPositions(), useProjectBoardCache() (+4 more)

### Community 42 - "notification/model/queries.ts"
Cohesion: 0.21
Nodes (6): notificationApi, dropNotification(), useNotificationActions(), AppNotification, NotificationPayload, NotificationType

### Community 43 - "team/model/queries.ts"
Cohesion: 0.30
Nodes (11): teamApi, keyFor(), useCreateTeam(), useDeleteTeam(), useTeamRefresh(), useTeams(), useUpdateTeam(), CreateTeamPayload (+3 more)

### Community 44 - "auth.api.ts"
Cohesion: 0.18
Nodes (10): authApi, BotProtectionConfig, HumanChecked, OAuthAvailability, OAuthProvider, SessionState, SessionStatus, useCurrentUser() (+2 more)

### Community 45 - "plan-panel.tsx"
Cohesion: 0.20
Nodes (10): formatBytesCeiling(), formatBytesUsed(), formatPrice(), usageFraction(), BLURB, FeatureRow, FEATURES, PLAN_NAME (+2 more)

### Community 46 - "ui/edge-affordance.tsx"
Cohesion: 0.14
Nodes (13): CENTRE, EdgeAffordance(), EdgeAffordanceProps, GRADIENT, IRIS_GRADIENT, NavPinButton(), NavPinButtonProps, RAIL (+5 more)

### Community 47 - "dependencies"
Cohesion: 0.15
Nodes (13): axios, dependencies, axios, @shadergradient/react, sonner, tailwind-merge, three, zod (+5 more)

### Community 48 - "ui/task-filters.tsx"
Cohesion: 0.15
Nodes (11): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PRIORITIES, PRIORITY_SWATCH, PROJECT_SCOPES, STATUS_SWATCH (+3 more)

### Community 49 - "eldritch-decor.tsx"
Cohesion: 0.18
Nodes (10): DirectionArrow(), DirectionArrowProps, EldritchTendrils(), EldritchTendrilsProps, GazeArrow(), GazeArrowProps, nextSighting(), Sighting (+2 more)

### Community 50 - "task-board.tsx"
Cohesion: 0.27
Nodes (9): byDeadline(), ColumnOverflow(), ColumnOverflowToggle(), useColumnCapacity(), COLUMNS, DraggableTask(), lockedHint(), TaskBoard() (+1 more)

### Community 51 - "connector-layer.tsx"
Cohesion: 0.23
Nodes (9): Listener, Point, PositionBus, centreOf(), ConnectorLayer(), ConnectorLayerProps, curveBetween(), headTransform() (+1 more)

### Community 52 - "board-overlays.tsx"
Cohesion: 0.18
Nodes (4): MarqueeOptions, Rect, ConnectBannerProps, SelectionBarProps

### Community 53 - "nav-preferences.store.ts"
Cohesion: 0.23
Nodes (11): DEFAULTS, NavEdge, NavPreferencesState, PinnedEdges, RailScope, read(), readRailScope(), StoredPreferences (+3 more)

### Community 54 - "task-filters.tsx"
Cohesion: 0.18
Nodes (9): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PROJECT_SCOPES, STATUS_SWATCH, STATUSES, TaskFiltersProps (+1 more)

### Community 55 - "paper/build-cursors.py"
Cohesion: 0.27
Nodes (9): axis(), frame(), nose(), opaque_points(), Image, Builds the Paper skin's cursor from the two drawings in this folder. Run it…, One cursor frame: turned to `target`, scaled to `PLANE`, placed., The tip of the plane: the opaque pixel nearest the top of the canvas. Measured… (+1 more)

### Community 56 - "Task Studio README"
Cohesion: 0.18
Nodes (11): zustand, Layered Dependency Rule (app→pages→widgets→features→entities→shared), Feature-Sliced Design, Optimistic Update Strategy, React 19, Sonner (toasts), Tailwind CSS, TanStack Query (+3 more)

### Community 57 - "App.tsx"
Cohesion: 0.22
Nodes (6): App(), ALWAYS_OPEN, MobileGate(), AppProviders(), AppRouter(), container

### Community 58 - "activity/model/queries.ts"
Cohesion: 0.29
Nodes (5): activityApi, ActivityEntry, ActivityPage, ActivityType, RevertResult

### Community 59 - "post-it.tsx"
Cohesion: 0.24
Nodes (9): UpdateNotePayload, NoteAuthorStamp(), NoteAuthorStampProps, fontFor(), NoteHandle, padFor(), PostIt, PostItBase() (+1 more)

### Community 60 - "admin.api.ts"
Cohesion: 0.29
Nodes (9): adminApi, adminTokenStore, client, AdminReport, AdminSession, AdminStats, AdminUserRow, BanPayload (+1 more)

### Community 61 - "cli-commands.tsx"
Cohesion: 0.25
Nodes (3): CLI_DOCS_URL, CliCommandList(), DocsLink()

### Community 62 - "chat-dock.store.ts"
Cohesion: 0.22
Nodes (5): ChatDockState, PersistedDock, restored, useChatDock, write()

### Community 63 - "docs-content.ts"
Cohesion: 0.22
Nodes (7): DOCS, DocsCommand, DocsDocument, DocsGroup, DocsSection, en, ptBR

### Community 64 - "sanitize-html.ts"
Cohesion: 0.24
Nodes (9): ALLOWED_ATTRIBUTES, ALLOWED_STYLE_PROPERTIES, ALLOWED_TAGS, clean(), DISCARDED_TAGS, GLOBAL_ATTRIBUTES, isSafeUrl(), sanitizeDocumentHtml() (+1 more)

### Community 65 - "halloween-icons.tsx"
Cohesion: 0.22
Nodes (7): BatSwarm(), BatSwarmProps, Box, BatGlyph(), HalloweenMark(), Modal(), ModalProps

### Community 66 - "build-cursors.py"
Cohesion: 0.22
Nodes (10): build-cursors.py, build-cursors.py, Dark Mode Hover Knife Cursor Frame, Dark Mode Resting Knife Cursor Frame, Dark Stab Cursor Frame (dark-stab.png), Light Hover Knife Cursor Frame (light-hover.png), Light Mode Resting Knife Cursor Frame, Light Mode Stab Cursor Frame (light-stab.png) (+2 more)

### Community 67 - "theme-provider.tsx"
Cohesion: 0.29
Nodes (8): readStored(), readStoredCursor(), readStoredSkin(), resolveIsDark(), SKIN_ATTRIBUTE, ThemeContext, ThemeContextValue, ThemeProvider()

### Community 68 - "optimistic.ts"
Cohesion: 0.20
Nodes (7): adoptServerNote(), CreateNoteRequest, geometryDiffers(), optimisticNote(), pendingNoteId(), PlaceholderContext, splitCreateRequest()

### Community 69 - "webhooks-panel.tsx"
Cohesion: 0.20
Nodes (7): ALL_EVENTS, ComposeRequest, EVENT_LABEL, FLAVOUR_LABEL, FLAVOUR_PLACEHOLDER, WebhookRowProps, WebhooksPanelProps

### Community 70 - "query-persist.ts"
Cohesion: 0.31
Nodes (9): clearPersistedQueries(), hydrateQueryCache(), isPersistable(), PERSISTED_PREFIXES, PersistedBlob, PersistedEntry, persistQueryCache(), read() (+1 more)

### Community 71 - "autumn-decor.tsx"
Cohesion: 0.20
Nodes (7): AutumnFall(), AutumnHedge(), AutumnHedgeProps, FALLING, LeafProps, LeafTone, TONE_FILL

### Community 72 - "realtime-provider.tsx"
Cohesion: 0.25
Nodes (8): NOTIFICATION_TOAST, RealtimeContext, RealtimeContextValue, RealtimeMeta, RealtimeProvider(), roomHolders, useProjectRoom(), useRealtime()

### Community 73 - "chat/model/types.ts"
Cohesion: 0.28
Nodes (7): chatApi, whiteboardApi, ChatDelivery, ChatMessage, WhiteboardElement, WhiteboardElementType, WhiteboardStrokeData

### Community 74 - "local-edits.ts"
Cohesion: 0.25
Nodes (8): EditableField, markLocalNoteEdit(), mergeRemoteNote(), pending, PendingEdit, prune(), releaseLocalNoteEdit(), Note

### Community 75 - "oauth-buttons.tsx"
Cohesion: 0.25
Nodes (6): ASSUME_BOTH, LABELS, MARKS, OAuthButtons(), OAuthButtonsProps, readRemembered()

### Community 76 - "roster-panel.tsx"
Cohesion: 0.25
Nodes (5): ReportUserDialog(), ReportUserDialogProps, ASSIGNABLE_ROLES, ROLE_ICON, RosterPanelProps

### Community 77 - "notifications.ts"
Cohesion: 0.28
Nodes (4): DesktopNotice, isSupported(), NotificationAccess, requestNotificationAccess()

### Community 78 - "import-tracker.tsx"
Cohesion: 0.31
Nodes (7): TrackerState, useImportTracker, ImportRow(), ImportRowProps, ImportTracker(), isLive(), STEP_LABEL

### Community 79 - "calendar.api.ts"
Cohesion: 0.29
Nodes (7): calendarApi, CalendarConnection, CalendarFeedSecret, CalendarFeedStatus, CalendarSettingsPayload, CalendarStatus, CalendarSyncResult

### Community 80 - "organization-dialog.tsx"
Cohesion: 0.25
Nodes (4): ASSIGNABLE_ROLES, InviteListProps, OrganizationDialogProps, ProjectPickerProps

### Community 81 - "organization-members-panel.tsx"
Cohesion: 0.25
Nodes (4): ASSIGNABLE_ROLES, InviteFormProps, MemberRowProps, OrganizationMembersPanelProps

### Community 82 - "organization-projects-board.tsx"
Cohesion: 0.29
Nodes (6): Lane, laneOf(), LANES, OrganizationProjectsBoard(), OrganizationProjectsBoardProps, ProjectCardProps

### Community 83 - "rich-text-editor.tsx"
Cohesion: 0.25
Nodes (4): COLORS, PromptKind, RichTextEditorProps, SIZES

### Community 84 - "note-checklist.tsx"
Cohesion: 0.29
Nodes (4): NoteCardProps, NoteChecklist(), NoteChecklistProps, TaskDetailModalProps

### Community 85 - "ui/hidden-sidebar.tsx"
Cohesion: 0.25
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 86 - "project-changelog.tsx"
Cohesion: 0.29
Nodes (6): APPEARANCE, ChangelogRowProps, dayKey(), ProjectChangelog(), ProjectChangelogProps, SENTENCE

### Community 87 - "hidden-sidebar.tsx"
Cohesion: 0.29
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 88 - "use-shell-prefetch.ts"
Cohesion: 0.43
Nodes (5): AppLayout(), AGENDA_PREFETCH, rememberedBoardPage(), useRouteIntentPrefetch(), useShellPrefetch()

### Community 89 - "providers/index.tsx"
Cohesion: 0.38
Nodes (3): QueryProvider(), SessionProvider(), useTheme()

### Community 90 - "webhooks.api.ts"
Cohesion: 0.33
Nodes (6): webhooksApi, CreatedWebhook, ProjectWebhook, WebhookEvent, WebhookPayloadDraft, WebhookTestResult

### Community 91 - "human-check.tsx"
Cohesion: 0.38
Nodes (6): HumanCheck(), HumanCheckProps, loadTurnstile(), TurnstileApi, useBotProtection(), Window

### Community 92 - "teams-panel.tsx"
Cohesion: 0.29
Nodes (3): TeamComposerProps, TeamRowProps, TeamsPanelProps

### Community 93 - "dashboard-page.tsx"
Cohesion: 0.33
Nodes (3): DashboardPage(), rankUpNext(), TONES

### Community 94 - "hooks.ts"
Cohesion: 0.38
Nodes (3): useIsDesktop(), useIsTouchDevice(), useMediaQuery()

### Community 95 - "runes.ts"
Cohesion: 0.33
Nodes (5): DIGRAPHS, LETTERS, RuneToken, runeTokens(), toRunes()

### Community 96 - "theme-colors.ts"
Cohesion: 0.38
Nodes (6): readPalette(), ThemePalette, ThemeToken, TOKENS, tripletToHex(), useThemePalette()

### Community 97 - "use-intent-prefetch.ts"
Cohesion: 0.38
Nodes (5): forget(), IntentHandlers, isSpeculationWelcome(), lastPrefetchedAt, useIntentPrefetch()

### Community 98 - "file-attachment.tsx"
Cohesion: 0.38
Nodes (6): extensionOf(), FileAttachmentField(), FileAttachmentFieldProps, FileAttachmentRow(), FileAttachmentRowProps, formatFileSize()

### Community 99 - "vercel.json"
Cohesion: 0.29
Nodes (6): buildCommand, framework, headers, outputDirectory, rewrites, $schema

### Community 100 - "skin-picker.tsx"
Cohesion: 0.33
Nodes (3): SkinDefinition, SkinPreview, SKINS

### Community 101 - "whiteboard.tsx"
Cohesion: 0.47
Nodes (5): isStroke(), readImageSize(), Tool, Whiteboard(), WhiteboardProps

### Community 102 - "@dnd-kit/core"
Cohesion: 0.33
Nodes (6): @dnd-kit/core, framer-motion, @dnd-kit/core, framer-motion, 60fps Animation Rules, Two-tool Drag & Drop strategy

### Community 103 - "document-byline.tsx"
Cohesion: 0.40
Nodes (4): DocumentByline(), DocumentBylineProps, DocumentCreatorStampProps, nameFor()

### Community 104 - "imports.api.ts"
Cohesion: 0.40
Nodes (5): importsApi, BoardImportPayload, CancelImportResult, RepositoryImportJob, RepositoryImportPayload

### Community 108 - "admin-page.tsx"
Cohesion: 0.40
Nodes (4): AdminPage(), DURATIONS, planLabel(), PLANS

### Community 109 - "prepare-image.ts"
Cohesion: 0.47
Nodes (5): encodeAt(), PreparedImage, prepareImage(), PrepareOptions, scaleToFit()

### Community 110 - "use-edge-reveal.ts"
Cohesion: 0.33
Nodes (3): Edge, KeepOut, Options

### Community 111 - "avatar.tsx"
Cohesion: 0.33
Nodes (5): Avatar(), AvatarProps, AvatarStack(), AvatarStackProps, SIZES

### Community 112 - "ui/project-rail.tsx"
Cohesion: 0.40
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 114 - "ui/whiteboard.tsx"
Cohesion: 0.47
Nodes (5): adoptStroke(), isStroke(), Tool, Whiteboard(), WhiteboardProps

### Community 116 - "project-rail.tsx"
Cohesion: 0.50
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 117 - "favicon.svg (browser tab icon)"
Cohesion: 0.50
Nodes (5): favicon.svg (browser tab icon), Gold paper linearGradient definition, Rotated Post-it note shape with peeled corner, Handwritten 't' glyph stroke paths, StudioMark()

### Community 118 - "invite-picker.tsx"
Cohesion: 0.40
Nodes (3): InvitePickerProps, Person, Tab

### Community 119 - "use-board-history.ts"
Cohesion: 0.50
Nodes (4): BoardAction, BoardHistory, isTypingTarget(), useBoardHistory()

### Community 120 - "board-toolbar.tsx"
Cohesion: 0.40
Nodes (3): BoardTool, BoardToolbarProps, TOOLS

### Community 121 - "notification-bell.tsx"
Cohesion: 0.60
Nodes (3): deepLink(), NotificationBell(), NotificationOptIn()

### Community 126 - "task-composer.tsx"
Cohesion: 0.40
Nodes (3): EMPTY_ROSTER, PRIORITIES, TaskComposerProps

### Community 127 - "cli-authorize-page.tsx"
Cohesion: 0.60
Nodes (3): CliAuthorizePage(), prettyCode(), RequestCard()

### Community 128 - "shader-wash.tsx"
Cohesion: 0.40
Nodes (3): ShaderGradient, ShaderGradientCanvas, ShaderWashProps

### Community 129 - "meetings-page.tsx"
Cohesion: 0.50
Nodes (3): AgendaRowProps, dayKey(), MeetingsPage()

### Community 131 - "recycle-bin-page.tsx"
Cohesion: 0.50
Nodes (3): Bin, daysUntil(), ExpiryBadge()

### Community 132 - "task-menu-page.tsx"
Cohesion: 0.60
Nodes (3): AgendaSkeleton(), isSameDay(), TaskMenuPage()

### Community 133 - "env.ts"
Cohesion: 0.50
Nodes (4): apiUrl, env, resolveApiUrl(), stripTrailingSlash()

### Community 135 - "use-canvas-budget.ts"
Cohesion: 0.50
Nodes (3): isCapableDevice(), NetworkInformation, useCanvasBudget()

### Community 136 - "write-order.ts"
Cohesion: 0.40
Nodes (3): chains, sequences, writeSequence

### Community 137 - "ui/expandable-stage.tsx"
Cohesion: 0.40
Nodes (4): ExpandableStage(), ExpandableStageProps, ExpandToggle(), ExpandToggleProps

### Community 138 - "runic-decor.tsx"
Cohesion: 0.50
Nodes (4): Mark, nextMark(), RuneScribe(), STAVES

### Community 139 - "ui/select.tsx"
Cohesion: 0.40
Nodes (4): PopupBox, Select(), SelectOption, SelectProps

### Community 142 - "lava-goo SVG metaball filter"
Cohesion: 0.50
Nodes (4): lava-goo SVG metaball filter, React app entry script (/src/main.tsx), Metaball (gooey blob) visual effect, theme-init.js pre-paint script tag

### Community 143 - "vite-plugin-pwa / Workbox PWA setup"
Cohesion: 0.50
Nodes (4): iOS/Safari PWA specifics, npm Scripts (dev/build/preview/typecheck/icons), vite-plugin-pwa / Workbox PWA setup, Vercel Deployment (vercel.json)

### Community 144 - "plain-text.ts"
Cohesion: 0.67
Nodes (3): escapeText(), MAX_PLAIN_TEXT_CHARS, plainTextToHtml()

### Community 147 - "use-image-drop.ts"
Cohesion: 0.67
Nodes (3): fitImage(), ImageDropOptions, useImageDrop()

### Community 148 - "ink-layer.tsx"
Cohesion: 0.67
Nodes (3): InkLayer(), InkLayerProps, toPath()

### Community 149 - "invitations-page.tsx"
Cohesion: 0.67
Nodes (3): byNewest(), InvitationsPage(), UnifiedInvitation

### Community 156 - "use-card-press.ts"
Cohesion: 0.67
Nodes (3): CardPressHandlers, isOwnedByInnerControl(), useCardPress()

### Community 157 - "nav-glyph.tsx"
Cohesion: 0.67
Nodes (3): NavGlyphKey, NavGlyph(), NavGlyphProps

### Community 158 - "halloween-decor.tsx"
Cohesion: 0.67
Nodes (3): nextSighting(), NightEyes(), Sighting

### Community 159 - "runic-text.tsx"
Cohesion: 0.67
Nodes (3): RunicText(), RunicTextProps, seedOf()

### Community 160 - "zoomable-image.tsx"
Cohesion: 0.67
Nodes (3): clamp(), ZoomableImage(), ZoomableImageProps

### Community 166 - "Creepster Font"
Cohesion: 0.67
Nodes (3): Creepster Font, Font Diner, Inc, SIL Open Font License Version 1.1

## Knowledge Gaps
- **698 isolated node(s):** `chatApi`, `whiteboardApi`, `SessionStatus`, `SessionState`, `container` (+693 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **58 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `HeroField` connect `hero-field.tsx` to `landing-page.tsx`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `DiscordMark()` connect `integrations-strip.tsx` to `ui/index.ts`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Why does `SlackMark()` connect `integrations-strip.tsx` to `ui/index.ts`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `chatApi`, `whiteboardApi`, `SessionStatus` to the rest of the system?**
  _698 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `task/model/queries.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05160628844839371 - nodes in this community are weakly interconnected._
- **Should `ui/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0596078431372549 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05551020408163265 - nodes in this community are weakly interconnected._