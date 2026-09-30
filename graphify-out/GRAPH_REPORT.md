# Graph Report - .  (2026-09-30)

## Corpus Check
- 56 files · ~531,776 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2559 nodes · 3676 edges · 237 communities (163 shown, 74 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 77 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Theme & Skin System
- Task Management Core
- Live Rooms Audio
- Avatar & User UI
- Text Board Archive
- Project API & Queries
- Favicon & Autumn Icons
- Document API & Queries
- Landing Page & API Client
- User API & File Import
- Figma Integration
- Ink Drawing Geometry
- Organization Management
- Dragon Custom Cursor
- Meetings API
- Docker & Deploy Config
- PWA Icons & Scripts
- DnD Board Columns
- Task Views & Layouts
- Landing Demo Board
- Dragon Decor & Icons
- Third-Party Dependencies
- Runic Font Builder
- TypeScript Config & Refs
- Button Component
- Chat Dock State
- Auth Scene UI
- Live Room API
- Date Utilities
- Billing API
- Pixel Font Builder
- AI Suggestions API
- PostCSS/Tailwind Config
- Spotify & Integration API
- Task Group API
- Dragon Font Builder
- Application Router
- Screen Share Audio
- Terminal Cursor Builder
- Core UI Dependencies
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
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
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
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
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 125
- Community 126
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132
- Community 133
- Community 134
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140
- Community 141
- Community 142
- Community 144
- Community 145
- Community 146
- Community 147
- Community 148
- Community 149
- Community 150
- Community 151
- Community 152
- Community 153
- Community 154
- Community 155
- Community 156
- Community 157
- Community 158
- Community 159
- Community 161
- Community 162
- Community 163
- Community 164
- Community 165
- Community 166
- Community 167
- Community 168
- Community 169
- Community 170
- Community 171
- Community 173
- Community 174
- Community 175
- Community 176
- Community 177
- Community 178
- Community 179
- Community 180
- Community 181
- Community 182
- Community 184
- Community 185
- Community 186
- Community 187
- Community 188
- Community 189
- Community 190
- Community 191
- Community 192
- Community 193
- Community 200
- Community 204
- Community 205
- Community 206
- Community 207
- Community 208
- Community 209
- Community 210
- Community 211
- Community 212
- Community 213
- Community 214
- Community 215
- Community 216
- Community 217
- Community 218
- Community 219
- Community 220
- Community 221
- Community 222
- Community 223
- Community 224
- Community 225
- Community 226
- Community 227
- Community 228
- Community 229
- Community 230
- Community 231
- Community 234

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `useBoardCache()` - 15 edges
3. `useDemoClock()` - 14 edges
4. `compilerOptions` - 13 edges
5. `useProjectBoardCache()` - 12 edges
6. `StudioLetter()` - 12 edges
7. `toDate()` - 11 edges
8. `GlyphProps` - 11 edges
9. `Task` - 11 edges
10. `main()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `StudioLetter()` --shares_data_with--> `Handwritten 't' glyph stroke paths`  [INFERRED]
  src/shared/ui/studio-letter.tsx → public/favicon.svg
- `drawIcon()` --conceptually_related_to--> `Apple Touch Icon (Task Studio Brand Mark)`  [INFERRED]
  scripts/generate-icons.mjs → public/apple-touch-icon.png
- `drawIcon()` --shares_data_with--> `Icon-192 Brand Mark`  [INFERRED]
  scripts/generate-icons.mjs → public/icons/icon-192.png
- `StudioLetter()` --shares_data_with--> `favicon.svg (browser tab icon)`  [INFERRED]
  src/shared/ui/studio-letter.tsx → public/favicon.svg
- `Task Studio README` --references--> `zustand`  [EXTRACTED]
  README.md → package.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Custom-drawn typefaces (pixel + runic)** — custom_font_runic_readme_md_studio_runic, custom_font_readme_md_font_pipeline [INFERRED 0.85]
- **Graphify Query Tooling Options** — agents_rules_graphify_graphify_query_cli, agents_rules_graphify_query_graph_mcp, agents_rules_graphify_graphify_path, agents_rules_graphify_graphify_explain [INFERRED 0.75]
- **Build-time API configuration pattern** — docker_compose_web_service, docker_compose_dockerfile, docker_compose_vite_api_url, docker_compose_vite_socket_url [EXTRACTED 1.00]
- **TLS-terminating reverse proxy deployment topology** — docker_compose_port_mapping, docker_compose_reverse_proxy_rationale, docker_compose_caddy, docker_compose_ssh_tunnel [INFERRED 0.85]
- **Pre-React document bootstrap (theme, gooey filter, app mount)** — index_theme_init_script, index_lava_goo_filter, index_main_tsx_entry [INFERRED 0.75]
- **Performance-first Interaction Design Pattern** — readme_useedgereveal, readme_drag_and_drop_design, readme_60fps_rules [INFERRED 0.85]
- **PWA/iOS Delivery Flow** — readme_pwa_workbox, readme_ios_safari_specifics, readme_npm_scripts, readme_vercel_deployment [INFERRED 0.75]

## Communities (237 total, 74 thin omitted)

### Community 0 - "Theme & Skin System"
Cohesion: 0.05
Nodes (67): boardApi, noteApi, EditableField, markLocalNoteEdit(), mergeRemoteNote(), pending, PendingEdit, prune() (+59 more)

### Community 1 - "Task Management Core"
Cohesion: 0.05
Nodes (63): taskApi, blockingAssigneeCount(), canCompleteTask(), completionBlockedReason(), CompletionContext, completionProgress(), isSharedTask(), outstandingAssignees() (+55 more)

### Community 2 - "Live Rooms Audio"
Cohesion: 0.05
Nodes (53): Avatar(), AvatarProps, AvatarStack(), AvatarStackProps, SIZES, ExpandableStage(), ExpandableStageProps, ExpandToggle() (+45 more)

### Community 3 - "Avatar & User UI"
Cohesion: 0.06
Nodes (41): ArchiveDocument(), ArchiveDocumentProps, depthOf(), leafOf(), BoardGauge(), DocumentAccessDialog(), DocumentAccessDialogProps, DocumentDownloadMenu() (+33 more)

### Community 4 - "Text Board Archive"
Cohesion: 0.06
Nodes (25): ListProjectsParams, projectApi, patchProjectPinned(), patchRosterRemoval(), seedProjectFrom(), useProject(), useProjectIntentPrefetch(), useRemoveMember() (+17 more)

### Community 5 - "Project API & Queries"
Cohesion: 0.07
Nodes (34): documentApi, useAdoptDocument(), useCreateDocument(), useCreateFigmaPage(), useDeleteDocument(), useDocumentListCache(), useImportDocument(), useProjectDocumentsRealtime() (+26 more)

### Community 6 - "Favicon & Autumn Icons"
Cohesion: 0.07
Nodes (29): LandingPage(), api, apiIsWarm(), ensureApiAwake(), errorMessage(), CLIENT_ID, CLIENT_ID_HEADER, isApiWarm() (+21 more)

### Community 7 - "Document API & Queries"
Cohesion: 0.06
Nodes (40): BOARD_EXPORT_MIME, classifyImportFile(), DOCUMENT_ACCEPT, DOCUMENT_MIME_TYPES, EXTENSION_MIME, IMPORT_ACCEPT, IMPORT_ARCHIVE_MIME, IMPORT_DOCUMENT_MIME (+32 more)

### Community 8 - "Landing Page & API Client"
Cohesion: 0.11
Nodes (32): AutumnMark(), EldritchMark(), GlyphProps, HazardMark(), NewspaperMark(), RunicMark(), SpaceMark(), AutumnLeafPaper() (+24 more)

### Community 9 - "User API & File Import"
Cohesion: 0.06
Nodes (5): ConnectFigmaPayload, figmaApi, rememberedFigmaAvailability(), rememberFigmaAvailability(), useFigmaAvailability()

### Community 10 - "Figma Integration"
Cohesion: 0.07
Nodes (30): InkPoint, MIN_SAMPLE_GAP_PX, paintStroke(), quantizePoint(), SIMPLIFY_TOLERANCE_PX, traceStroke(), context2d(), createInkLayers() (+22 more)

### Community 11 - "Ink Drawing Geometry"
Cohesion: 0.09
Nodes (25): organizationApi, useAttachProject(), useCreateOrganization(), useDetachProject(), useInviteToOrganization(), useOrganizationRefresh(), useRemoveOrganizationMember(), useRevokeOrganizationInvitation() (+17 more)

### Community 12 - "Organization Management"
Cohesion: 0.09
Nodes (34): along(), arc_normal(), assert_uncropped(), belly(), blade_polygon(), draw_swing(), draw_weapon(), haloed() (+26 more)

### Community 13 - "Dragon Custom Cursor"
Cohesion: 0.12
Nodes (32): meetingApi, meetingRoomApi, byStart(), invalidateAgenda(), invalidateInheritedRooms(), organizationKey(), projectKey(), removeMeeting() (+24 more)

### Community 14 - "Meetings API"
Cohesion: 0.07
Nodes (32): Build args instead of runtime env vars, Caddy (API droplet reverse proxy), Dockerfile, json-file logging with rotation, nginx (production-parity server), npm run preview (dev preview, not production-parity), 8080:80 port mapping, Not binding port 80 directly, put behind TLS terminator (+24 more)

### Community 15 - "Docker & Deploy Config"
Cohesion: 0.08
Nodes (29): Apple Touch Icon (Task Studio Brand Mark), Icon-192 Brand Mark, Icon-512 Post-it Note Brand Mark, Maskable 512 Icon (Post-it Mark, Full-Bleed Tile), Why Maskable Icons Keep Their Background Tile, BAR, BRAND, BRAND_DEEP (+21 more)

### Community 16 - "PWA Icons & Scripts"
Cohesion: 0.09
Nodes (21): byDeadline(), ColumnOverflow(), ColumnOverflowToggle(), useColumnCapacity(), COLUMNS, DraggableTask(), lockedHint(), TaskBoard() (+13 more)

### Community 17 - "DnD Board Columns"
Cohesion: 0.10
Nodes (24): DEFAULTS, LAYOUTS_FOR, LayoutSurface, read(), Stored, TaskLayout, useTaskLayout(), write() (+16 more)

### Community 18 - "Task Views & Layouts"
Cohesion: 0.12
Nodes (23): COLUMNS, DemoBoard(), LANES, RESIDENTS, DemoChat(), MESSAGES, DemoFrame(), DemoFrameProps (+15 more)

### Community 19 - "Landing Demo Board"
Cohesion: 0.08
Nodes (23): BatSwarm(), BatSwarmProps, Box, Button, buttonClasses(), ButtonProps, GAPS, Size (+15 more)

### Community 20 - "Dragon Decor & Icons"
Cohesion: 0.08
Nodes (27): DragonFlight(), Flight, nextFlight(), amplitude(), bodyOrder, DragonGlyph(), GlyphProps, JadeMark() (+19 more)

### Community 21 - "Third-Party Dependencies"
Cohesion: 0.07
Nodes (29): axios, clsx, date-fns, @dnd-kit/modifiers, @dnd-kit/sortable, @hookform/resolvers, lucide-react, dependencies (+21 more)

### Community 22 - "Runic Font Builder"
Cohesion: 0.13
Nodes (27): build(), collinear_free(), define(), GlyphDef, line_at(), lozenge(), main(), outline() (+19 more)

### Community 23 - "TypeScript Config & Refs"
Cohesion: 0.07
Nodes (27): DOM, DOM.Iterable, src, vite/client, vite-plugin-pwa/client, compilerOptions, baseUrl, isolatedModules (+19 more)

### Community 24 - "Button Component"
Cohesion: 0.14
Nodes (21): ChatDockState, PersistedDock, restored, useChatDock, write(), bump(), enqueueChatMessage(), listeners (+13 more)

### Community 25 - "Chat Dock State"
Cohesion: 0.10
Nodes (7): AuthScene(), DeskObject(), DeskObjectProps, floatTransition(), AuthShell(), AuthShellProps, Phase

### Community 26 - "Auth Scene UI"
Cohesion: 0.13
Nodes (20): liveRoomApi, byOpening(), useLiveRoomActions(), useLiveRoomEvents(), CreateLiveRoomPayload, GrantLiveRoomPayload, IceServerBundle, IceServerConfig (+12 more)

### Community 27 - "Live Room API"
Cohesion: 0.18
Nodes (22): DATE_WINDOW_YEARS, dateInputBounds(), dateInputMax(), dateInputMin(), dateLocale(), dayInputMax(), dayInputMin(), formatCalendarDate() (+14 more)

### Community 28 - "Date Utilities"
Cohesion: 0.12
Nodes (14): billingApi, BillingInterval, BillingSummary, BroadcastFlavour, Currency, Limit, Plan, PlanCatalogue (+6 more)

### Community 29 - "Billing API"
Cohesion: 0.17
Nodes (20): chatApi, whiteboardApi, byTime(), CHAT_PAGE, confirmLocalMessage(), isLocal(), keyOf(), loadConversation() (+12 more)

### Community 30 - "Pixel Font Builder"
Cohesion: 0.21
Nodes (21): bolden(), build(), contours_of(), draw_glyph(), embolden(), embolden_stems(), glyph_name(), main() (+13 more)

### Community 31 - "AI Suggestions API"
Cohesion: 0.15
Nodes (15): AiAllowance, aiApi, AiStatus, AiSuggestion, ProjectTaskSuggestion, SubtaskSuggestion, useInvalidateAllowance(), useSuggestDraftSubtasks() (+7 more)

### Community 32 - "PostCSS/Tailwind Config"
Cohesion: 0.10
Nodes (21): autoprefixer, devDependencies, autoprefixer, postcss, @types/node, @types/react, @types/react-dom, @types/three (+13 more)

### Community 33 - "Spotify & Integration API"
Cohesion: 0.12
Nodes (18): spotifyApi, tokensApi, ApiToken, BoardImportSource, CreatedApiToken, ImportSource, ImportStatus, ImportStep (+10 more)

### Community 34 - "Task Group API"
Cohesion: 0.17
Nodes (13): taskGroupApi, invalidateGroups(), orderKey, useCreateTaskGroup(), useDeleteTaskGroup(), useReorderTaskGroups(), useUpdateTaskGroup(), CreateTaskGroupPayload (+5 more)

### Community 35 - "Dragon Font Builder"
Cohesion: 0.28
Nodes (19): add_glyph(), bounds(), compose(), compose_cedilla(), fetch(), latin_slice_url(), main(), make_acute() (+11 more)

### Community 36 - "Application Router"
Cohesion: 0.11
Nodes (18): AdminPage, CliAuthorizePage, DashboardPage, DocsPage, InvitationsPage, LandingPage, MeetingsPage, NotesBoardPage (+10 more)

### Community 37 - "Screen Share Audio"
Cohesion: 0.14
Nodes (15): DISPLAY_MEDIA_OPTIONS, ScreenAudioMix, applyPlan(), AUDIO_CONSTRAINTS, Connection, FALLBACK_ICE, labelOf(), LiveCallStatus (+7 more)

### Community 38 - "Terminal Cursor Builder"
Cohesion: 0.19
Nodes (16): arrow_mask(), capsule(), compose(), dilate(), hand(), hand_mask(), hand_seams(), Image (+8 more)

### Community 39 - "Core UI Dependencies"
Cohesion: 0.12
Nodes (18): @dnd-kit/core, framer-motion, @dnd-kit/core, framer-motion, zustand, tailwindcss, 60fps Animation Rules, Layered Dependency Rule (app→pages→widgets→features→entities→shared) (+10 more)

### Community 40 - "Community 40"
Cohesion: 0.24
Nodes (17): canWave(), clearStage(), crestAt(), currentShape(), framesOf(), frontAt(), keyframesFor(), measureHeaders() (+9 more)

### Community 41 - "Community 41"
Cohesion: 0.14
Nodes (13): MeetingComposer(), MeetingComposerProps, nextHour(), dayKey(), MeetingRow, MeetingRowProps, MeetingsPanel(), MeetingsPanelProps (+5 more)

### Community 42 - "Community 42"
Cohesion: 0.18
Nodes (14): createThrottledFlush(), LIVE_FRAME_MS, roundPx(), ThrottledFlush, peerColor(), Ghost, PendingInk, RemoteStroke (+6 more)

### Community 43 - "Community 43"
Cohesion: 0.15
Nodes (14): IntegrationsStrip(), Service, SERVICES, GoogleCalendarMark(), DiscordMark(), ExportMark(), FeedMark(), FigmaMark() (+6 more)

### Community 44 - "Community 44"
Cohesion: 0.19
Nodes (15): detectLocale(), LocaleState, substitute(), syncDocumentLang(), Translate, useLocale(), useLocaleStore, useT() (+7 more)

### Community 45 - "Community 45"
Cohesion: 0.12
Nodes (16): RFC-5321, BOARD_INK_COLORS, CONNECTOR_COLORS, EDGE_REVEAL_PX, GROUP_COLUMNS_PER_PAGE, MAX_BOARD_PAGES, MAX_GROUPS_PER_PROJECT, MAX_TASK_NOTES (+8 more)

### Community 46 - "Community 46"
Cohesion: 0.15
Nodes (10): BoardImportPanel(), BoardImportPanelProps, sourceFor(), CreateProjectDialogProps, Mode, GithubImportPanel(), GithubImportPanelProps, ProjectSettingsDialogProps (+2 more)

### Community 47 - "Community 47"
Cohesion: 0.15
Nodes (10): AMBIENCE, AmbientSkin, buildField(), hasAmbience(), noise(), Particle, PLACED_KINDS, SkinAmbience() (+2 more)

### Community 48 - "Community 48"
Cohesion: 0.19
Nodes (14): canFullscreen(), doc(), enterFullscreen(), exitFullscreen(), FULLSCREEN_EVENTS, fullscreenElement(), WebkitDocument, WebkitElement (+6 more)

### Community 49 - "Community 49"
Cohesion: 0.19
Nodes (12): ActiveLiveCall, LiveCallState, useLiveCallStore, historyIndex(), LiveCallGuard(), pathnameOf(), RouterNavigator, staysInProject() (+4 more)

### Community 50 - "Community 50"
Cohesion: 0.20
Nodes (10): SETTINGS_SKIN_LIMIT, SKIN_BY_VALUE, SKIN_CATALOG, SkinDefinition, SkinPreview, CursorToggle(), leaf(), notch() (+2 more)

### Community 51 - "Community 51"
Cohesion: 0.20
Nodes (13): frame(), mask_of(), mitre_point(), place(), polyline(), Image, ImageDraw, Builds the Runic skin's cursor: the pager's rune arrow, turned to point. Run it… (+5 more)

### Community 52 - "Community 52"
Cohesion: 0.27
Nodes (12): clampToViewport(), FloatingShortcut, PILL, read(), ShortcutIcon, ShortcutsState, useFloatingShortcuts, write() (+4 more)

### Community 53 - "Community 53"
Cohesion: 0.20
Nodes (14): HeroField, buildField(), CardSpec, createSheetTexture(), Field(), HeroField(), hexToHsl(), hslToHex() (+6 more)

### Community 54 - "Community 54"
Cohesion: 0.21
Nodes (12): axis(), frame(), haloed(), opaque_points(), Image, Builds the Halloween knife cursor from the two drawings in this folder. Run it…, One cursor frame: turned onto the arrow's diagonal, scaled, placed. The…, The same frame with a dark rim behind it, for the cream page. Light-mode… (+4 more)

### Community 55 - "Community 55"
Cohesion: 0.16
Nodes (7): App(), ALWAYS_OPEN, MobileGate(), AppProviders(), AppRouter(), container, Gate

### Community 56 - "Community 56"
Cohesion: 0.21
Nodes (6): notificationApi, dropNotification(), useNotificationActions(), AppNotification, NotificationPayload, NotificationType

### Community 57 - "Community 57"
Cohesion: 0.30
Nodes (11): teamApi, keyFor(), useCreateTeam(), useDeleteTeam(), useTeamRefresh(), useTeams(), useUpdateTeam(), CreateTeamPayload (+3 more)

### Community 58 - "Community 58"
Cohesion: 0.19
Nodes (11): authApi, BotProtectionConfig, HumanChecked, OAuthAvailability, OAuthProvider, SessionState, SessionStatus, useCurrentUser() (+3 more)

### Community 59 - "Community 59"
Cohesion: 0.22
Nodes (11): formatBytesCeiling(), formatBytesUsed(), formatPrice(), usageFraction(), BLURB, FeatureRow, FEATURES, Meter() (+3 more)

### Community 60 - "Community 60"
Cohesion: 0.19
Nodes (8): deepLink(), NotificationBell(), NotificationOptIn(), DesktopNotice, hasDeclinedNotifications(), isSupported(), NotificationAccess, requestNotificationAccess()

### Community 61 - "Community 61"
Cohesion: 0.24
Nodes (9): FOOTER_NOTES, COLUMN, COLUMN_NARROW, COLUMN_WIDE, FeatureCarousel(), LandingNav(), scrollToSection(), scrollToTop() (+1 more)

### Community 62 - "Community 62"
Cohesion: 0.16
Nodes (10): DirectionArrow(), DirectionArrowProps, EldritchTendrils(), EldritchTendrilsProps, GazeArrow(), GazeArrowProps, KrakenRise(), nextRise() (+2 more)

### Community 63 - "Community 63"
Cohesion: 0.15
Nodes (11): FiltersVariant, LATENESS, PERSONAL_TABS, PersonalTab, PRIORITIES, PRIORITY_SWATCH, PROJECT_SCOPES, STATUS_SWATCH (+3 more)

### Community 64 - "Community 64"
Cohesion: 0.26
Nodes (10): adminApi, adminTokenStore, client, AdminReport, AdminSession, AdminStats, AdminUserPage, AdminUserRow (+2 more)

### Community 65 - "Community 65"
Cohesion: 0.18
Nodes (4): MarqueeOptions, Rect, ConnectBannerProps, SelectionBarProps

### Community 66 - "Community 66"
Cohesion: 0.23
Nodes (11): DEFAULTS, NavEdge, NavPreferencesState, PinnedEdges, RailScope, read(), readRailScope(), StoredPreferences (+3 more)

### Community 67 - "Community 67"
Cohesion: 0.27
Nodes (9): axis(), frame(), nose(), opaque_points(), Image, Builds the Paper skin's cursor from the two drawings in this folder. Run it…, One cursor frame: turned to `target`, scaled to `PLANE`, placed., The tip of the plane: the opaque pixel nearest the top of the canvas. Measured… (+1 more)

### Community 68 - "Community 68"
Cohesion: 0.25
Nodes (9): readStored(), readStoredCursor(), readStoredSkin(), resolveIsDark(), SKIN_ATTRIBUTE, SkinContext, ThemeContext, ThemeContextValue (+1 more)

### Community 69 - "Community 69"
Cohesion: 0.29
Nodes (5): activityApi, ActivityEntry, ActivityPage, ActivityType, RevertResult

### Community 70 - "Community 70"
Cohesion: 0.25
Nodes (3): CLI_DOCS_URL, CliCommandList(), DocsLink()

### Community 72 - "Community 72"
Cohesion: 0.22
Nodes (7): DOCS, DocsCommand, DocsDocument, DocsGroup, DocsSection, en, ptBR

### Community 73 - "Community 73"
Cohesion: 0.25
Nodes (9): FeatureNotes(), NOTES, easeInOut(), easeOut(), Geometry, INK, LucyCursor(), measure() (+1 more)

### Community 74 - "Community 74"
Cohesion: 0.24
Nodes (9): ALLOWED_ATTRIBUTES, ALLOWED_STYLE_PROPERTIES, ALLOWED_TAGS, clean(), DISCARDED_TAGS, GLOBAL_ATTRIBUTES, isSafeUrl(), sanitizeDocumentHtml() (+1 more)

### Community 75 - "Community 75"
Cohesion: 0.27
Nodes (10): GRAPH_REPORT.md, graphify explain / get_node, graphify path / shortest_path, graphify query (CLI), Graphify Rule, graphify update ., query_graph (MCP), graphify-out/wiki/index.md (+2 more)

### Community 76 - "Community 76"
Cohesion: 0.22
Nodes (4): escape(), MentionQuery, MentionSegment, splitMentions()

### Community 77 - "Community 77"
Cohesion: 0.20
Nodes (7): ALL_EVENTS, ComposeRequest, EVENT_LABEL, FLAVOUR_LABEL, FLAVOUR_PLACEHOLDER, WebhookRowProps, WebhooksPanelProps

### Community 78 - "Community 78"
Cohesion: 0.31
Nodes (9): clearPersistedQueries(), hydrateQueryCache(), isPersistable(), PERSISTED_PREFIXES, PersistedBlob, PersistedEntry, persistQueryCache(), read() (+1 more)

### Community 79 - "Community 79"
Cohesion: 0.24
Nodes (9): AppToast, base, emit(), Level, Notify, prune(), recent, toast (+1 more)

### Community 80 - "Community 80"
Cohesion: 0.20
Nodes (7): AutumnFall(), AutumnHedge(), AutumnHedgeProps, FALLING, LeafProps, LeafTone, TONE_FILL

### Community 81 - "Community 81"
Cohesion: 0.25
Nodes (8): favicon.svg (browser tab icon), Gold paper linearGradient definition, Rotated Post-it note shape with peeled corner, Handwritten 't' glyph stroke paths, NavGlyphKey, NavGlyph(), NavGlyphProps, StudioMark()

### Community 82 - "Community 82"
Cohesion: 0.25
Nodes (8): NOTIFICATION_TOAST, RealtimeContext, RealtimeContextValue, RealtimeMeta, RealtimeProvider(), roomHolders, useProjectRoom(), useRealtime()

### Community 83 - "Community 83"
Cohesion: 0.25
Nodes (6): ASSUME_BOTH, LABELS, MARKS, OAuthButtons(), OAuthButtonsProps, readRemembered()

### Community 84 - "Community 84"
Cohesion: 0.31
Nodes (7): LivePanel(), LivePanelProps, phaseOf(), RoomPhase, LiveRoomComposer(), LiveRoomComposerProps, nextQuarter()

### Community 85 - "Community 85"
Cohesion: 0.25
Nodes (5): ReportUserDialog(), ReportUserDialogProps, ASSIGNABLE_ROLES, ROLE_ICON, RosterPanelProps

### Community 86 - "Community 86"
Cohesion: 0.25
Nodes (4): NoteCardProps, NoteChecklist(), NoteChecklistProps, TaskDetailModalProps

### Community 87 - "Community 87"
Cohesion: 0.33
Nodes (7): GAPS, LavaLink(), LavaLinkProps, featuresOf(), preferredCurrency(), PricingTable(), useFocusedPlan()

### Community 88 - "Community 88"
Cohesion: 0.33
Nodes (7): TrackerState, useImportTracker, ImportRow(), ImportRowProps, ImportTracker(), isLive(), STEP_LABEL

### Community 89 - "Community 89"
Cohesion: 0.25
Nodes (6): draw(), grid(), Image, Builds the Pixel art skin's cursor. Run it after changing anything below:…, The art as a rectangular list of rows, padded to the widest one., One drawing, at one drawn pixel per image pixel, then blown up NEAREST.

### Community 90 - "Community 90"
Cohesion: 0.25
Nodes (7): description, engines, node, name, private, type, version

### Community 91 - "Community 91"
Cohesion: 0.29
Nodes (7): calendarApi, CalendarConnection, CalendarFeedSecret, CalendarFeedStatus, CalendarSettingsPayload, CalendarStatus, CalendarSyncResult

### Community 92 - "Community 92"
Cohesion: 0.25
Nodes (4): ASSIGNABLE_ROLES, InviteListProps, OrganizationDialogProps, ProjectPickerProps

### Community 93 - "Community 93"
Cohesion: 0.25
Nodes (4): ASSIGNABLE_ROLES, InviteFormProps, MemberRowProps, OrganizationMembersPanelProps

### Community 94 - "Community 94"
Cohesion: 0.29
Nodes (6): Lane, laneOf(), LANES, OrganizationProjectsBoard(), OrganizationProjectsBoardProps, ProjectCardProps

### Community 95 - "Community 95"
Cohesion: 0.25
Nodes (4): COLORS, PromptKind, RichTextEditorProps, SIZES

### Community 96 - "Community 96"
Cohesion: 0.25
Nodes (7): FieldShellProps, Input, InputProps, PasswordInput, PasswordInputProps, Textarea, TextareaProps

### Community 97 - "Community 97"
Cohesion: 0.25
Nodes (4): GROUPS, HiddenSidebarProps, NavItem, SidebarLinkProps

### Community 98 - "Community 98"
Cohesion: 0.29
Nodes (6): APPEARANCE, ChangelogRowProps, dayKey(), ProjectChangelog(), ProjectChangelogProps, SENTENCE

### Community 100 - "Community 100"
Cohesion: 0.29
Nodes (7): scripts, build, dev, icons, lint, preview, typecheck

### Community 101 - "Community 101"
Cohesion: 0.38
Nodes (4): AGENDA_PREFETCH, rememberedBoardPage(), useRouteIntentPrefetch(), useShellPrefetch()

### Community 102 - "Community 102"
Cohesion: 0.43
Nodes (4): AppToaster(), QueryProvider(), SessionProvider(), useTheme()

### Community 103 - "Community 103"
Cohesion: 0.33
Nodes (6): webhooksApi, CreatedWebhook, ProjectWebhook, WebhookEvent, WebhookPayloadDraft, WebhookTestResult

### Community 104 - "Community 104"
Cohesion: 0.38
Nodes (6): HumanCheck(), HumanCheckProps, loadTurnstile(), TurnstileApi, useBotProtection(), Window

### Community 105 - "Community 105"
Cohesion: 0.43
Nodes (6): BoardSize, clampSide(), fitImage(), ImageDropOptions, placeInside(), useImageDrop()

### Community 106 - "Community 106"
Cohesion: 0.29
Nodes (3): TeamComposerProps, TeamRowProps, TeamsPanelProps

### Community 107 - "Community 107"
Cohesion: 0.33
Nodes (3): DashboardPage(), rankUpNext(), TONES

### Community 108 - "Community 108"
Cohesion: 0.29
Nodes (6): ENTER, EXIT, REST, RotatingWord(), TRANSITION, WORDS

### Community 109 - "Community 109"
Cohesion: 0.38
Nodes (3): useIsDesktop(), useIsTouchDevice(), useMediaQuery()

### Community 110 - "Community 110"
Cohesion: 0.33
Nodes (5): DIGRAPHS, LETTERS, RuneToken, runeTokens(), toRunes()

### Community 111 - "Community 111"
Cohesion: 0.38
Nodes (6): readPalette(), ThemePalette, ThemeToken, TOKENS, tripletToHex(), useThemePalette()

### Community 112 - "Community 112"
Cohesion: 0.38
Nodes (5): forget(), IntentHandlers, isSpeculationWelcome(), lastPrefetchedAt, useIntentPrefetch()

### Community 113 - "Community 113"
Cohesion: 0.38
Nodes (6): extensionOf(), FileAttachmentField(), FileAttachmentFieldProps, FileAttachmentRow(), FileAttachmentRowProps, formatFileSize()

### Community 114 - "Community 114"
Cohesion: 0.29
Nodes (6): buildCommand, framework, headers, outputDirectory, rewrites, $schema

### Community 115 - "Community 115"
Cohesion: 0.40
Nodes (6): Web-embedding licence rule for custom fonts, Font delivery pipeline (custom-font/ to public/fonts/), Custom Font Source Directory, Studio Runic Font Preview, Runic font build process (stroke centrelines to WOFF2), Studio Runic Typeface

### Community 116 - "Community 116"
Cohesion: 0.40
Nodes (5): RFC-1321, md5(), md5OfBlob(), SHIFTS, TABLE

### Community 117 - "Community 117"
Cohesion: 0.40
Nodes (4): DocumentByline(), DocumentBylineProps, DocumentCreatorStampProps, nameFor()

### Community 118 - "Community 118"
Cohesion: 0.40
Nodes (5): importsApi, BoardImportPayload, CancelImportResult, RepositoryImportJob, RepositoryImportPayload

### Community 121 - "Community 121"
Cohesion: 0.40
Nodes (4): AdminPage(), DURATIONS, planLabel(), PLANS

### Community 122 - "Community 122"
Cohesion: 0.47
Nodes (5): encodeAt(), PreparedImage, prepareImage(), PrepareOptions, scaleToFit()

### Community 123 - "Community 123"
Cohesion: 0.33
Nodes (3): Edge, KeepOut, Options

### Community 124 - "Community 124"
Cohesion: 0.40
Nodes (5): Mark, nextMark(), RuneClickGlow(), RuneScribe(), STAVES

### Community 125 - "Community 125"
Cohesion: 0.40
Nodes (5): clamp(), ImageViewer(), ImageViewerProps, ZoomableImage(), ZoomableImageProps

### Community 126 - "Community 126"
Cohesion: 0.40
Nodes (3): MentionPicker(), MentionPickerProps, ProjectChatProps

### Community 127 - "Community 127"
Cohesion: 0.40
Nodes (3): ProjectRailProps, RailProject(), urgencyOf()

### Community 128 - "Community 128"
Cohesion: 0.40
Nodes (3): InvitePickerProps, Person, Tab

### Community 129 - "Community 129"
Cohesion: 0.50
Nodes (4): BoardAction, BoardHistory, isTypingTarget(), useBoardHistory()

### Community 130 - "Community 130"
Cohesion: 0.40
Nodes (3): BoardTool, BoardToolbarProps, TOOLS

### Community 135 - "Community 135"
Cohesion: 0.40
Nodes (3): EMPTY_ROSTER, PRIORITIES, TaskComposerProps

### Community 136 - "Community 136"
Cohesion: 0.60
Nodes (3): CliAuthorizePage(), prettyCode(), RequestCard()

### Community 137 - "Community 137"
Cohesion: 0.40
Nodes (3): ShaderGradient, ShaderGradientCanvas, ShaderWashProps

### Community 138 - "Community 138"
Cohesion: 0.50
Nodes (3): AgendaRowProps, dayKey(), MeetingsPage()

### Community 140 - "Community 140"
Cohesion: 0.50
Nodes (3): Bin, daysUntil(), ExpiryBadge()

### Community 141 - "Community 141"
Cohesion: 0.60
Nodes (3): AgendaSkeleton(), isSameDay(), TaskMenuPage()

### Community 142 - "Community 142"
Cohesion: 0.50
Nodes (4): apiUrl, env, resolveApiUrl(), stripTrailingSlash()

### Community 144 - "Community 144"
Cohesion: 0.50
Nodes (3): isCapableDevice(), NetworkInformation, useCanvasBudget()

### Community 145 - "Community 145"
Cohesion: 0.40
Nodes (3): chains, sequences, writeSequence

### Community 147 - "Community 147"
Cohesion: 0.50
Nodes (4): lava-goo SVG metaball filter, React app entry script (/src/main.tsx), Metaball (gooey blob) visual effect, theme-init.js pre-paint script tag

### Community 148 - "Community 148"
Cohesion: 0.50
Nodes (4): iOS/Safari PWA specifics, npm Scripts (dev/build/preview/typecheck/icons), vite-plugin-pwa / Workbox PWA setup, Vercel Deployment (vercel.json)

### Community 149 - "Community 149"
Cohesion: 0.67
Nodes (3): escapeText(), MAX_PLAIN_TEXT_CHARS, plainTextToHtml()

### Community 153 - "Community 153"
Cohesion: 0.67
Nodes (3): InkLayer(), InkLayerProps, toPath()

### Community 154 - "Community 154"
Cohesion: 0.67
Nodes (3): byNewest(), InvitationsPage(), UnifiedInvitation

### Community 161 - "Community 161"
Cohesion: 0.67
Nodes (3): CardPressHandlers, isOwnedByInnerControl(), useCardPress()

### Community 162 - "Community 162"
Cohesion: 0.67
Nodes (3): nextSighting(), NightEyes(), Sighting

### Community 163 - "Community 163"
Cohesion: 0.67
Nodes (3): RunicText(), RunicTextProps, seedOf()

### Community 164 - "Community 164"
Cohesion: 0.67
Nodes (3): nextStreak(), ShootingStar(), Streak

### Community 166 - "Community 166"
Cohesion: 0.67
Nodes (3): Halloween custom cursor asset set, Knife source artwork variant (bloody blade), Knife source artwork (facaNova.png)

## Knowledge Gaps
- **737 isolated node(s):** `name`, `private`, `version`, `type`, `description` (+732 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **74 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LandingPage()` connect `Favicon & Autumn Icons` to `Community 61`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `installApiWarmOnIntent()` connect `Favicon & Autumn Icons` to `Community 55`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _737 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Theme & Skin System` be split into smaller, more focused modules?**
  _Cohesion score 0.05116279069767442 - nodes in this community are weakly interconnected._
- **Should `Task Management Core` be split into smaller, more focused modules?**
  _Cohesion score 0.054340396445659606 - nodes in this community are weakly interconnected._
- **Should `Live Rooms Audio` be split into smaller, more focused modules?**
  _Cohesion score 0.0456540825285338 - nodes in this community are weakly interconnected._
- **Should `Avatar & User UI` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._