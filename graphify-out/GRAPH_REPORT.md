# Graph Report - .  (2026-09-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2324 nodes · 3201 edges · 210 communities (155 shown, 55 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 79 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1e0bac74`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- project-board-queries.ts
- task/model/queries.ts
- ui/index.ts
- use-live-call.ts
- index.ts
- landing-page.tsx
- project/model/queries.ts
- text-board.tsx
- client.ts
- user.api.ts
- ui/studio-icons.tsx
- document/model/queries.ts
- integration/model/queries.ts
- devDependencies
- organization/model/queries.ts
- meeting/model/queries.ts
- compilerOptions
- dragon/build-cursors.py
- generate-icons.mjs
- task-views/index.ts
- feature-carousel.tsx
- compilerOptions
- button.tsx
- auth-scene.tsx
- dates.ts
- ui/edge-affordance.tsx
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
- create-project-dialog.tsx
- skin-catalog.ts
- integrations-strip.tsx
- shortcuts.store.ts
- hero-field.tsx
- halloween/build-cursors.py
- notification/model/queries.ts
- team/model/queries.ts
- auth.api.ts
- plan-panel.tsx
- dependencies
- ui/task-filters.tsx
- eldritch-decor.tsx
- task-board.tsx
- board-overlays.tsx
- nav-preferences.store.ts
- task-filters.tsx
- paper/build-cursors.py
- Task Studio README
- App.tsx
- activity/model/queries.ts
- admin.api.ts
- cli-commands.tsx
- chat-dock.store.ts
- docs-content.ts
- sanitize-html.ts
- halloween-icons.tsx
- build-cursors.py
- theme-provider.tsx
- mentions.ts
- webhooks-panel.tsx
- query-persist.ts
- toast.ts
- autumn-decor.tsx
- realtime-provider.tsx
- chat/model/types.ts
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
- connections-panel.tsx
- organization-dashboard.tsx
- admin-page.tsx
- prepare-image.ts
- use-edge-reveal.ts
- project-chat.tsx
- ui/project-rail.tsx
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
- nib-preview.tsx
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
- ui/top-navigation.tsx
- tsconfig.json
- three
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
- CSS-variable Theme System (light/dark)

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `useBoardCache()` - 14 edges
3. `compilerOptions` - 13 edges
4. `StudioLetter()` - 12 edges
5. `useProjectBoardCache()` - 12 edges
6. `GlyphProps` - 11 edges
7. `toDate()` - 11 edges
8. `SpeakingDetector` - 10 edges
9. `useDocumentListCache()` - 10 edges
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

## Communities (210 total, 55 thin omitted)

### Community 0 - "project-board-queries.ts"
Cohesion: 0.05
Nodes (64): boardApi, noteApi, EditableField, markLocalNoteEdit(), mergeRemoteNote(), pending, PendingEdit, prune() (+56 more)

### Community 1 - "task/model/queries.ts"
Cohesion: 0.05
Nodes (62): taskApi, blockingAssigneeCount(), canCompleteTask(), completionBlockedReason(), CompletionContext, completionProgress(), isSharedTask(), outstandingAssignees() (+54 more)

### Community 2 - "ui/index.ts"
Cohesion: 0.05
Nodes (47): Avatar(), AvatarProps, AvatarStack(), AvatarStackProps, SIZES, ExpandableStage(), ExpandableStageProps, ExpandToggle() (+39 more)

### Community 3 - "use-live-call.ts"
Cohesion: 0.05
Nodes (39): SpeakingDetector, Tracked, AUDIO_CONSTRAINTS, Connection, FALLBACK_ICE, LiveCallStatus, LivePeer, useLiveCall() (+31 more)

### Community 4 - "index.ts"
Cohesion: 0.06
Nodes (33): CENTRE, EdgeAffordance(), EdgeAffordanceProps, GRADIENT, NavPinButton(), NavPinButtonProps, RAIL, RAIL_TONE (+25 more)

### Community 5 - "landing-page.tsx"
Cohesion: 0.06
Nodes (31): FOOTER_NOTES, FeatureCarousel(), FeatureNotes(), NOTES, LandingNav(), scrollToSection(), scrollToTop(), GAPS (+23 more)

### Community 6 - "project/model/queries.ts"
Cohesion: 0.06
Nodes (25): ListProjectsParams, projectApi, patchProjectPinned(), patchRosterRemoval(), seedProjectFrom(), useProject(), useProjectIntentPrefetch(), useRemoveMember() (+17 more)

### Community 7 - "text-board.tsx"
Cohesion: 0.06
Nodes (39): ArchiveDocument(), ArchiveDocumentProps, depthOf(), leafOf(), BoardGauge(), DocumentAccessDialog(), DocumentAccessDialogProps, DocumentDownloadMenu() (+31 more)

### Community 8 - "client.ts"
Cohesion: 0.07
Nodes (28): api, apiIsWarm(), ensureApiAwake(), errorMessage(), CLIENT_ID, CLIENT_ID_HEADER, isApiWarm(), isReadable() (+20 more)

### Community 9 - "user.api.ts"
Cohesion: 0.06
Nodes (39): BOARD_EXPORT_MIME, classifyImportFile(), DOCUMENT_ACCEPT, DOCUMENT_MIME_TYPES, EXTENSION_MIME, IMPORT_ACCEPT, IMPORT_ARCHIVE_MIME, IMPORT_DOCUMENT_MIME (+31 more)

### Community 10 - "ui/studio-icons.tsx"
Cohesion: 0.10
Nodes (24): AutumnMark(), EldritchMark(), GlyphProps, HazardMark(), NewspaperMark(), RunicMark(), SpaceMark(), isRigidPaper() (+16 more)

### Community 11 - "document/model/queries.ts"
Cohesion: 0.08
Nodes (30): documentApi, useAdoptDocument(), useCreateDocument(), useCreateFigmaPage(), useDeleteDocument(), useDocumentListCache(), useImportDocument(), useProjectDocumentsRealtime() (+22 more)

### Community 12 - "integration/model/queries.ts"
Cohesion: 0.06
Nodes (5): ConnectFigmaPayload, figmaApi, rememberedFigmaAvailability(), rememberFigmaAvailability(), useFigmaAvailability()

### Community 13 - "devDependencies"
Cohesion: 0.05
Nodes (36): autoprefixer, description, devDependencies, autoprefixer, postcss, tailwindcss, @types/node, @types/react (+28 more)

### Community 14 - "organization/model/queries.ts"
Cohesion: 0.09
Nodes (25): organizationApi, useAttachProject(), useCreateOrganization(), useDetachProject(), useInviteToOrganization(), useOrganizationRefresh(), useRemoveOrganizationMember(), useRevokeOrganizationInvitation() (+17 more)

### Community 15 - "meeting/model/queries.ts"
Cohesion: 0.12
Nodes (32): meetingApi, meetingRoomApi, byStart(), invalidateAgenda(), invalidateInheritedRooms(), organizationKey(), projectKey(), removeMeeting() (+24 more)

### Community 16 - "compilerOptions"
Cohesion: 0.07
Nodes (32): Build args instead of runtime env vars, Caddy (API droplet reverse proxy), Dockerfile, json-file logging with rotation, nginx (production-parity server), npm run preview (dev preview, not production-parity), 8080:80 port mapping, Not binding port 80 directly, put behind TLS terminator (+24 more)

### Community 17 - "dragon/build-cursors.py"
Cohesion: 0.11
Nodes (30): arc_normal(), belly(), blade_polygon(), draw_swing(), draw_weapon(), haloed(), on_arc(), place() (+22 more)

### Community 18 - "generate-icons.mjs"
Cohesion: 0.08
Nodes (29): Apple Touch Icon (Task Studio Brand Mark), Icon-192 Brand Mark, Icon-512 Post-it Note Brand Mark, Maskable 512 Icon (Post-it Mark, Full-Bleed Tile), Why Maskable Icons Keep Their Background Tile, BAR, BRAND, BRAND_DEEP (+21 more)

### Community 19 - "task-views/index.ts"
Cohesion: 0.10
Nodes (24): DEFAULTS, LAYOUTS_FOR, LayoutSurface, read(), Stored, TaskLayout, useTaskLayout(), write() (+16 more)

### Community 20 - "feature-carousel.tsx"
Cohesion: 0.10
Nodes (23): COLUMNS, DemoBoard(), LANES, RESIDENTS, DemoChat(), MESSAGES, DemoFrame(), DemoFrameProps (+15 more)

### Community 21 - "compilerOptions"
Cohesion: 0.07
Nodes (27): DOM, DOM.Iterable, src, vite/client, vite-plugin-pwa/client, compilerOptions, baseUrl, isolatedModules (+19 more)

### Community 22 - "button.tsx"
Cohesion: 0.08
Nodes (18): Button, buttonClasses(), ButtonProps, GAPS, Size, SIZES, Variant, VARIANTS (+10 more)

### Community 23 - "auth-scene.tsx"
Cohesion: 0.10
Nodes (7): AuthScene(), DeskObject(), DeskObjectProps, floatTransition(), AuthShell(), AuthShellProps, Phase

### Community 24 - "dates.ts"
Cohesion: 0.18
Nodes (22): DATE_WINDOW_YEARS, dateInputBounds(), dateInputMax(), dateInputMin(), dateLocale(), dayInputMax(), dayInputMin(), formatCalendarDate() (+14 more)

### Community 25 - "ui/edge-affordance.tsx"
Cohesion: 0.09
Nodes (21): DragonFlight(), Flight, nextFlight(), DragonGlyph(), GlyphProps, JadeMark(), ScrollHandle(), CENTRE (+13 more)

### Community 26 - "billing/model/types.ts"
Cohesion: 0.12
Nodes (14): billingApi, BillingInterval, BillingSummary, BroadcastFlavour, Currency, Limit, Plan, PlanCatalogue (+6 more)

### Community 27 - "live-room/model/types.ts"
Cohesion: 0.15
Nodes (17): liveRoomApi, byOpening(), useLiveRoomActions(), useLiveRoomEvents(), CreateLiveRoomPayload, GrantLiveRoomPayload, IceServerConfig, LiveAudience (+9 more)

### Community 28 - "ai.api.ts"
Cohesion: 0.15
Nodes (15): AiAllowance, aiApi, AiStatus, AiSuggestion, ProjectTaskSuggestion, SubtaskSuggestion, useInvalidateAllowance(), useSuggestDraftSubtasks() (+7 more)

### Community 29 - "integration/model/types.ts"
Cohesion: 0.12
Nodes (18): spotifyApi, tokensApi, ApiToken, BoardImportSource, CreatedApiToken, ImportSource, ImportStatus, ImportStep (+10 more)

### Community 30 - "task-group/model/queries.ts"
Cohesion: 0.17
Nodes (13): taskGroupApi, invalidateGroups(), orderKey, useCreateTaskGroup(), useDeleteTaskGroup(), useReorderTaskGroups(), useUpdateTaskGroup(), CreateTaskGroupPayload (+5 more)

### Community 31 - "router/index.tsx"
Cohesion: 0.11
Nodes (18): AdminPage, CliAuthorizePage, DashboardPage, DocsPage, InvitationsPage, LandingPage, MeetingsPage, NotesBoardPage (+10 more)

### Community 32 - "groups-board.tsx"
Cohesion: 0.13
Nodes (10): read(), Stored, useHiddenColumns(), write(), GroupTaskCard(), GroupTaskCardProps, RIBBON, GroupsBoardProps (+2 more)

### Community 33 - "meetings-panel.tsx"
Cohesion: 0.14
Nodes (13): MeetingComposer(), MeetingComposerProps, nextHour(), dayKey(), MeetingRow, MeetingRowProps, MeetingsPanel(), MeetingsPanelProps (+5 more)

### Community 34 - "i18n/index.ts"
Cohesion: 0.19
Nodes (15): detectLocale(), LocaleState, substitute(), syncDocumentLang(), Translate, useLocale(), useLocaleStore, useT() (+7 more)

### Community 35 - "constants.ts"
Cohesion: 0.12
Nodes (16): RFC-5321, BOARD_INK_COLORS, CONNECTOR_COLORS, EDGE_REVEAL_PX, GROUP_COLUMNS_PER_PAGE, MAX_BOARD_PAGES, MAX_GROUPS_PER_PROJECT, MAX_TASK_NOTES (+8 more)

### Community 36 - "create-project-dialog.tsx"
Cohesion: 0.15
Nodes (10): BoardImportPanel(), BoardImportPanelProps, sourceFor(), CreateProjectDialogProps, Mode, GithubImportPanel(), GithubImportPanelProps, ProjectSettingsDialogProps (+2 more)

### Community 37 - "skin-catalog.ts"
Cohesion: 0.20
Nodes (10): SETTINGS_SKIN_LIMIT, SKIN_BY_VALUE, SKIN_CATALOG, SkinDefinition, SkinPreview, CursorToggle(), leaf(), notch() (+2 more)

### Community 38 - "integrations-strip.tsx"
Cohesion: 0.17
Nodes (13): IntegrationsStrip(), Service, SERVICES, DiscordMark(), ExportMark(), FeedMark(), FigmaMark(), GitHubMark() (+5 more)

### Community 39 - "shortcuts.store.ts"
Cohesion: 0.22
Nodes (10): clampToViewport(), FloatingShortcut, PILL, read(), ShortcutIcon, ShortcutsState, useFloatingShortcuts, write() (+2 more)

### Community 40 - "hero-field.tsx"
Cohesion: 0.20
Nodes (14): HeroField, buildField(), CardSpec, createSheetTexture(), Field(), HeroField(), hexToHsl(), hslToHex() (+6 more)

### Community 41 - "halloween/build-cursors.py"
Cohesion: 0.21
Nodes (12): axis(), frame(), haloed(), opaque_points(), Image, Builds the Halloween knife cursor from the two drawings in this folder. Run it…, One cursor frame: turned onto the arrow's diagonal, scaled, placed. The…, The same frame with a dark rim behind it, for the cream page. Light-mode… (+4 more)

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
Cohesion: 0.22
Nodes (11): formatBytesCeiling(), formatBytesUsed(), formatPrice(), usageFraction(), BLURB, FeatureRow, FEATURES, Meter() (+3 more)

### Community 46 - "dependencies"
Cohesion: 0.15
Nodes (13): axios, clsx, dependencies, axios, clsx, @shadergradient/react, sonner, tailwind-merge (+5 more)

### Community 47 - "ui/task-filters.tsx"
Cohesion: 0.15
Nodes (11): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PRIORITIES, PRIORITY_SWATCH, PROJECT_SCOPES, STATUS_SWATCH (+3 more)

### Community 48 - "eldritch-decor.tsx"
Cohesion: 0.18
Nodes (10): DirectionArrow(), DirectionArrowProps, EldritchTendrils(), EldritchTendrilsProps, GazeArrow(), GazeArrowProps, nextSighting(), Sighting (+2 more)

### Community 49 - "task-board.tsx"
Cohesion: 0.27
Nodes (9): byDeadline(), ColumnOverflow(), ColumnOverflowToggle(), useColumnCapacity(), COLUMNS, DraggableTask(), lockedHint(), TaskBoard() (+1 more)

### Community 50 - "board-overlays.tsx"
Cohesion: 0.18
Nodes (4): MarqueeOptions, Rect, ConnectBannerProps, SelectionBarProps

### Community 51 - "nav-preferences.store.ts"
Cohesion: 0.23
Nodes (11): DEFAULTS, NavEdge, NavPreferencesState, PinnedEdges, RailScope, read(), readRailScope(), StoredPreferences (+3 more)

### Community 52 - "task-filters.tsx"
Cohesion: 0.18
Nodes (9): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PROJECT_SCOPES, STATUS_SWATCH, STATUSES, TaskFiltersProps (+1 more)

### Community 53 - "paper/build-cursors.py"
Cohesion: 0.27
Nodes (9): axis(), frame(), nose(), opaque_points(), Image, Builds the Paper skin's cursor from the two drawings in this folder. Run it…, One cursor frame: turned to `target`, scaled to `PLANE`, placed., The tip of the plane: the opaque pixel nearest the top of the canvas. Measured… (+1 more)

### Community 54 - "Task Studio README"
Cohesion: 0.18
Nodes (11): zustand, Layered Dependency Rule (app→pages→widgets→features→entities→shared), Feature-Sliced Design, Optimistic Update Strategy, React 19, Sonner (toasts), Tailwind CSS, TanStack Query (+3 more)

### Community 55 - "App.tsx"
Cohesion: 0.22
Nodes (6): App(), ALWAYS_OPEN, MobileGate(), AppProviders(), AppRouter(), container

### Community 56 - "activity/model/queries.ts"
Cohesion: 0.29
Nodes (5): activityApi, ActivityEntry, ActivityPage, ActivityType, RevertResult

### Community 57 - "admin.api.ts"
Cohesion: 0.29
Nodes (9): adminApi, adminTokenStore, client, AdminReport, AdminSession, AdminStats, AdminUserRow, BanPayload (+1 more)

### Community 58 - "cli-commands.tsx"
Cohesion: 0.25
Nodes (3): CLI_DOCS_URL, CliCommandList(), DocsLink()

### Community 59 - "chat-dock.store.ts"
Cohesion: 0.22
Nodes (5): ChatDockState, PersistedDock, restored, useChatDock, write()

### Community 60 - "docs-content.ts"
Cohesion: 0.22
Nodes (7): DOCS, DocsCommand, DocsDocument, DocsGroup, DocsSection, en, ptBR

### Community 61 - "sanitize-html.ts"
Cohesion: 0.24
Nodes (9): ALLOWED_ATTRIBUTES, ALLOWED_STYLE_PROPERTIES, ALLOWED_TAGS, clean(), DISCARDED_TAGS, GLOBAL_ATTRIBUTES, isSafeUrl(), sanitizeDocumentHtml() (+1 more)

### Community 62 - "halloween-icons.tsx"
Cohesion: 0.22
Nodes (7): BatSwarm(), BatSwarmProps, Box, BatGlyph(), HalloweenMark(), Modal(), ModalProps

### Community 63 - "build-cursors.py"
Cohesion: 0.22
Nodes (10): build-cursors.py, build-cursors.py, Dark Mode Hover Knife Cursor Frame, Dark Mode Resting Knife Cursor Frame, Dark Stab Cursor Frame (dark-stab.png), Light Hover Knife Cursor Frame (light-hover.png), Light Mode Resting Knife Cursor Frame, Light Mode Stab Cursor Frame (light-stab.png) (+2 more)

### Community 64 - "theme-provider.tsx"
Cohesion: 0.29
Nodes (8): readStored(), readStoredCursor(), readStoredSkin(), resolveIsDark(), SKIN_ATTRIBUTE, ThemeContext, ThemeContextValue, ThemeProvider()

### Community 65 - "mentions.ts"
Cohesion: 0.22
Nodes (4): escape(), MentionQuery, MentionSegment, splitMentions()

### Community 66 - "webhooks-panel.tsx"
Cohesion: 0.20
Nodes (7): ALL_EVENTS, ComposeRequest, EVENT_LABEL, FLAVOUR_LABEL, FLAVOUR_PLACEHOLDER, WebhookRowProps, WebhooksPanelProps

### Community 67 - "query-persist.ts"
Cohesion: 0.31
Nodes (9): clearPersistedQueries(), hydrateQueryCache(), isPersistable(), PERSISTED_PREFIXES, PersistedBlob, PersistedEntry, persistQueryCache(), read() (+1 more)

### Community 68 - "toast.ts"
Cohesion: 0.24
Nodes (9): AppToast, base, emit(), Level, Notify, prune(), recent, toast (+1 more)

### Community 69 - "autumn-decor.tsx"
Cohesion: 0.20
Nodes (7): AutumnFall(), AutumnHedge(), AutumnHedgeProps, FALLING, LeafProps, LeafTone, TONE_FILL

### Community 70 - "realtime-provider.tsx"
Cohesion: 0.25
Nodes (8): NOTIFICATION_TOAST, RealtimeContext, RealtimeContextValue, RealtimeMeta, RealtimeProvider(), roomHolders, useProjectRoom(), useRealtime()

### Community 71 - "chat/model/types.ts"
Cohesion: 0.28
Nodes (7): chatApi, whiteboardApi, ChatDelivery, ChatMessage, WhiteboardElement, WhiteboardElementType, WhiteboardStrokeData

### Community 72 - "oauth-buttons.tsx"
Cohesion: 0.25
Nodes (6): ASSUME_BOTH, LABELS, MARKS, OAuthButtons(), OAuthButtonsProps, readRemembered()

### Community 73 - "roster-panel.tsx"
Cohesion: 0.25
Nodes (5): ReportUserDialog(), ReportUserDialogProps, ASSIGNABLE_ROLES, ROLE_ICON, RosterPanelProps

### Community 74 - "notifications.ts"
Cohesion: 0.28
Nodes (4): DesktopNotice, isSupported(), NotificationAccess, requestNotificationAccess()

### Community 75 - "import-tracker.tsx"
Cohesion: 0.33
Nodes (7): TrackerState, useImportTracker, ImportRow(), ImportRowProps, ImportTracker(), isLive(), STEP_LABEL

### Community 76 - "calendar.api.ts"
Cohesion: 0.29
Nodes (7): calendarApi, CalendarConnection, CalendarFeedSecret, CalendarFeedStatus, CalendarSettingsPayload, CalendarStatus, CalendarSyncResult

### Community 77 - "organization-dialog.tsx"
Cohesion: 0.25
Nodes (4): ASSIGNABLE_ROLES, InviteListProps, OrganizationDialogProps, ProjectPickerProps

### Community 78 - "organization-members-panel.tsx"
Cohesion: 0.25
Nodes (4): ASSIGNABLE_ROLES, InviteFormProps, MemberRowProps, OrganizationMembersPanelProps

### Community 79 - "organization-projects-board.tsx"
Cohesion: 0.29
Nodes (6): Lane, laneOf(), LANES, OrganizationProjectsBoard(), OrganizationProjectsBoardProps, ProjectCardProps

### Community 80 - "rich-text-editor.tsx"
Cohesion: 0.25
Nodes (4): COLORS, PromptKind, RichTextEditorProps, SIZES

### Community 81 - "note-checklist.tsx"
Cohesion: 0.29
Nodes (4): NoteCardProps, NoteChecklist(), NoteChecklistProps, TaskDetailModalProps

### Community 82 - "ui/hidden-sidebar.tsx"
Cohesion: 0.25
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 83 - "project-changelog.tsx"
Cohesion: 0.29
Nodes (6): APPEARANCE, ChangelogRowProps, dayKey(), ProjectChangelog(), ProjectChangelogProps, SENTENCE

### Community 84 - "hidden-sidebar.tsx"
Cohesion: 0.29
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 85 - "use-shell-prefetch.ts"
Cohesion: 0.43
Nodes (5): AppLayout(), AGENDA_PREFETCH, rememberedBoardPage(), useRouteIntentPrefetch(), useShellPrefetch()

### Community 86 - "providers/index.tsx"
Cohesion: 0.38
Nodes (3): QueryProvider(), SessionProvider(), useTheme()

### Community 87 - "webhooks.api.ts"
Cohesion: 0.33
Nodes (6): webhooksApi, CreatedWebhook, ProjectWebhook, WebhookEvent, WebhookPayloadDraft, WebhookTestResult

### Community 88 - "human-check.tsx"
Cohesion: 0.38
Nodes (6): HumanCheck(), HumanCheckProps, loadTurnstile(), TurnstileApi, useBotProtection(), Window

### Community 89 - "teams-panel.tsx"
Cohesion: 0.29
Nodes (3): TeamComposerProps, TeamRowProps, TeamsPanelProps

### Community 90 - "dashboard-page.tsx"
Cohesion: 0.33
Nodes (3): DashboardPage(), rankUpNext(), TONES

### Community 91 - "hooks.ts"
Cohesion: 0.38
Nodes (3): useIsDesktop(), useIsTouchDevice(), useMediaQuery()

### Community 92 - "runes.ts"
Cohesion: 0.33
Nodes (5): DIGRAPHS, LETTERS, RuneToken, runeTokens(), toRunes()

### Community 93 - "theme-colors.ts"
Cohesion: 0.38
Nodes (6): readPalette(), ThemePalette, ThemeToken, TOKENS, tripletToHex(), useThemePalette()

### Community 94 - "use-intent-prefetch.ts"
Cohesion: 0.38
Nodes (5): forget(), IntentHandlers, isSpeculationWelcome(), lastPrefetchedAt, useIntentPrefetch()

### Community 95 - "file-attachment.tsx"
Cohesion: 0.38
Nodes (6): extensionOf(), FileAttachmentField(), FileAttachmentFieldProps, FileAttachmentRow(), FileAttachmentRowProps, formatFileSize()

### Community 96 - "vercel.json"
Cohesion: 0.29
Nodes (6): buildCommand, framework, headers, outputDirectory, rewrites, $schema

### Community 97 - "skin-picker.tsx"
Cohesion: 0.33
Nodes (3): SkinDefinition, SkinPreview, SKINS

### Community 98 - "whiteboard.tsx"
Cohesion: 0.47
Nodes (5): isStroke(), readImageSize(), Tool, Whiteboard(), WhiteboardProps

### Community 99 - "@dnd-kit/core"
Cohesion: 0.33
Nodes (6): @dnd-kit/core, framer-motion, @dnd-kit/core, framer-motion, 60fps Animation Rules, Two-tool Drag & Drop strategy

### Community 100 - "document-byline.tsx"
Cohesion: 0.40
Nodes (4): DocumentByline(), DocumentBylineProps, DocumentCreatorStampProps, nameFor()

### Community 101 - "imports.api.ts"
Cohesion: 0.40
Nodes (5): importsApi, BoardImportPayload, CancelImportResult, RepositoryImportJob, RepositoryImportPayload

### Community 104 - "admin-page.tsx"
Cohesion: 0.40
Nodes (4): AdminPage(), DURATIONS, planLabel(), PLANS

### Community 105 - "prepare-image.ts"
Cohesion: 0.47
Nodes (5): encodeAt(), PreparedImage, prepareImage(), PrepareOptions, scaleToFit()

### Community 106 - "use-edge-reveal.ts"
Cohesion: 0.33
Nodes (3): Edge, KeepOut, Options

### Community 107 - "project-chat.tsx"
Cohesion: 0.40
Nodes (3): MentionPicker(), MentionPickerProps, ProjectChatProps

### Community 108 - "ui/project-rail.tsx"
Cohesion: 0.40
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 111 - "project-rail.tsx"
Cohesion: 0.50
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 112 - "favicon.svg (browser tab icon)"
Cohesion: 0.50
Nodes (5): favicon.svg (browser tab icon), Gold paper linearGradient definition, Rotated Post-it note shape with peeled corner, Handwritten 't' glyph stroke paths, StudioMark()

### Community 113 - "invite-picker.tsx"
Cohesion: 0.40
Nodes (3): InvitePickerProps, Person, Tab

### Community 114 - "use-board-history.ts"
Cohesion: 0.50
Nodes (4): BoardAction, BoardHistory, isTypingTarget(), useBoardHistory()

### Community 115 - "board-toolbar.tsx"
Cohesion: 0.40
Nodes (3): BoardTool, BoardToolbarProps, TOOLS

### Community 116 - "notification-bell.tsx"
Cohesion: 0.60
Nodes (3): deepLink(), NotificationBell(), NotificationOptIn()

### Community 121 - "task-composer.tsx"
Cohesion: 0.40
Nodes (3): EMPTY_ROSTER, PRIORITIES, TaskComposerProps

### Community 122 - "cli-authorize-page.tsx"
Cohesion: 0.60
Nodes (3): CliAuthorizePage(), prettyCode(), RequestCard()

### Community 123 - "shader-wash.tsx"
Cohesion: 0.40
Nodes (3): ShaderGradient, ShaderGradientCanvas, ShaderWashProps

### Community 124 - "meetings-page.tsx"
Cohesion: 0.50
Nodes (3): AgendaRowProps, dayKey(), MeetingsPage()

### Community 126 - "recycle-bin-page.tsx"
Cohesion: 0.50
Nodes (3): Bin, daysUntil(), ExpiryBadge()

### Community 127 - "task-menu-page.tsx"
Cohesion: 0.60
Nodes (3): AgendaSkeleton(), isSameDay(), TaskMenuPage()

### Community 128 - "env.ts"
Cohesion: 0.50
Nodes (4): apiUrl, env, resolveApiUrl(), stripTrailingSlash()

### Community 130 - "use-canvas-budget.ts"
Cohesion: 0.50
Nodes (3): isCapableDevice(), NetworkInformation, useCanvasBudget()

### Community 131 - "write-order.ts"
Cohesion: 0.40
Nodes (3): chains, sequences, writeSequence

### Community 132 - "runic-decor.tsx"
Cohesion: 0.50
Nodes (4): Mark, nextMark(), RuneScribe(), STAVES

### Community 133 - "ui/select.tsx"
Cohesion: 0.40
Nodes (4): PopupBox, Select(), SelectOption, SelectProps

### Community 136 - "lava-goo SVG metaball filter"
Cohesion: 0.50
Nodes (4): lava-goo SVG metaball filter, React app entry script (/src/main.tsx), Metaball (gooey blob) visual effect, theme-init.js pre-paint script tag

### Community 137 - "vite-plugin-pwa / Workbox PWA setup"
Cohesion: 0.50
Nodes (4): iOS/Safari PWA specifics, npm Scripts (dev/build/preview/typecheck/icons), vite-plugin-pwa / Workbox PWA setup, Vercel Deployment (vercel.json)

### Community 138 - "plain-text.ts"
Cohesion: 0.67
Nodes (3): escapeText(), MAX_PLAIN_TEXT_CHARS, plainTextToHtml()

### Community 141 - "use-image-drop.ts"
Cohesion: 0.67
Nodes (3): fitImage(), ImageDropOptions, useImageDrop()

### Community 142 - "ink-layer.tsx"
Cohesion: 0.67
Nodes (3): InkLayer(), InkLayerProps, toPath()

### Community 143 - "invitations-page.tsx"
Cohesion: 0.67
Nodes (3): byNewest(), InvitationsPage(), UnifiedInvitation

### Community 150 - "use-card-press.ts"
Cohesion: 0.67
Nodes (3): CardPressHandlers, isOwnedByInnerControl(), useCardPress()

### Community 151 - "nav-glyph.tsx"
Cohesion: 0.67
Nodes (3): NavGlyphKey, NavGlyph(), NavGlyphProps

### Community 152 - "halloween-decor.tsx"
Cohesion: 0.67
Nodes (3): nextSighting(), NightEyes(), Sighting

### Community 153 - "nib-preview.tsx"
Cohesion: 0.67
Nodes (3): NibCursor(), NibPreview(), ringDiameter()

### Community 154 - "runic-text.tsx"
Cohesion: 0.67
Nodes (3): RunicText(), RunicTextProps, seedOf()

### Community 155 - "zoomable-image.tsx"
Cohesion: 0.67
Nodes (3): clamp(), ZoomableImage(), ZoomableImageProps

### Community 161 - "Creepster Font"
Cohesion: 0.67
Nodes (3): Creepster Font, Font Diner, Inc, SIL Open Font License Version 1.1

## Knowledge Gaps
- **708 isolated node(s):** `chatApi`, `whiteboardApi`, `SessionStatus`, `SessionState`, `container` (+703 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **55 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `@react-three/fiber`, `socket.io-client`, `@tanstack/react-query`, `@dnd-kit/core`, `devDependencies`, `Task Studio README`, `three`, `date-fns`, `@dnd-kit/modifiers`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `@hookform/resolvers`, `lucide-react`, `@paper-design/shaders-react`, `react`, `react-dom`, `react-hook-form`, `react-router-dom`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **Why does `DiscordMark()` connect `integrations-strip.tsx` to `ui/index.ts`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **Why does `SlackMark()` connect `integrations-strip.tsx` to `ui/index.ts`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **What connects `chatApi`, `whiteboardApi`, `SessionStatus` to the rest of the system?**
  _708 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `project-board-queries.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05299608551641072 - nodes in this community are weakly interconnected._
- **Should `task/model/queries.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05194805194805195 - nodes in this community are weakly interconnected._
- **Should `ui/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.050816696914700546 - nodes in this community are weakly interconnected._