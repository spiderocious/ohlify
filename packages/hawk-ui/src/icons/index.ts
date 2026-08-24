/**
 * Hawk's icon proxy.
 *
 * Every Hawk component imports glyphs from here, never from `lucide-react`
 * directly — the same rule the older package established, for the same reason:
 * swapping the icon source later is a one-file change.
 *
 * The names mirror the Flutter port's glyph set at
 * `mobile/lib/ui/hawk/foundation/hawk_icons.dart` one-for-one, so a component
 * written against one platform reads identically on the other. Where the Flutter
 * port hand-drew a glyph the design system only sketched (escrow, ledger,
 * network quality), the nearest honest lucide glyph stands in and is marked
 * below — inventing a bespoke SVG for the web that does not match the mobile
 * drawing would be worse than an approximation both sides can see.
 */
export type { LucideIcon as HawkIconComponent } from 'lucide-react';

export {
  // ── Navigation & chrome ────────────────────────────────────────────────
  Wallet as IconWallet,
  Home as IconHome,
  MessageCircle as IconMessageCircle,
  /** Domain alias — the product calls these chats, not messages. */
  MessageCircle as IconChat,
  User as IconUser,
  UserCircle as IconUserCircle,
  Users as IconUsers,
  Search as IconSearch,
  Bell as IconBell,
  Mail as IconMail,
  Settings as IconSettings,
  Menu as IconMenu,
  LayoutGrid as IconLayoutGrid,
  Grid3x3 as IconGrid,
  List as IconList,
  MoreVertical as IconMoreVertical,
  MoreHorizontal as IconMoreHorizontal,
  ExternalLink as IconExternalLink,
  Link as IconLink,
  LogOut as IconLogOut,
  History as IconHistory,
  Book as IconBook,

  // ── Direction ──────────────────────────────────────────────────────────
  ChevronDown as IconChevronDown,
  ChevronUp as IconChevronUp,
  ChevronLeft as IconChevronLeft,
  ChevronRight as IconChevronRight,
  ArrowUp as IconArrowUp,
  ArrowDown as IconArrowDown,
  ArrowLeft as IconArrowLeft,
  ArrowRight as IconArrowRight,
  ArrowUpNarrowWide as IconSortAsc,

  // ── Actions ────────────────────────────────────────────────────────────
  Check as IconCheck,
  X as IconClose,
  Plus as IconPlus,
  Minus as IconMinus,
  Trash2 as IconTrash,
  Copy as IconCopy,
  Pencil as IconEdit,
  Send as IconSend,
  SendHorizontal as IconSendPlane,
  Download as IconDownload,
  Upload as IconUpload,
  RefreshCw as IconRefresh,
  Undo2 as IconUndo,
  Filter as IconFilter,
  Paperclip as IconPaperclip,
  Play as IconPlay,
  Pause as IconPause,

  // ── Call surface ───────────────────────────────────────────────────────
  Phone as IconPhone,
  PhoneOff as IconPhoneOff,
  Video as IconVideo,
  VideoOff as IconVideoOff,
  Mic as IconMic,
  MicOff as IconMicOff,
  Volume2 as IconVolume,
  WifiOff as IconWifiOff,
  /** Network quality — the designer's placeholder was a bar sketch. */
  SignalHigh as IconNetworkQuality,
  /** The degraded-signal variant. */
  SignalLow as IconChartWeak,

  // ── Status & trust ─────────────────────────────────────────────────────
  Info as IconInfo,
  TriangleAlert as IconAlertTriangle,
  /** Hazard is a system alarm-state, never a button. CONTRACTS §0.2. */
  TriangleAlert as IconHazardTriangle,
  Shield as IconShield,
  BadgeCheck as IconVerified,
  Lock as IconLock,
  LockKeyhole as IconLockKeyhole,
  Lock as IconLockClosed,
  Eye as IconEye,
  EyeOff as IconEyeOff,
  Flag as IconFlag,
  IdCard as IconIdCard,
  Clock as IconClock,
  Calendar as IconCalendar,
  Star as IconStar,

  // ── Money & records ────────────────────────────────────────────────────
  Landmark as IconBank,
  Receipt as IconReceipt,
  FileText as IconFile,
  Image as IconImage,
  ChartColumn as IconChartBar,
  TrendingUp as IconTrendingUp,
  TrendingDown as IconTrendingDown,
  /** Escrow — held funds. The designer's own glyph was a placeholder sketch. */
  Vault as IconEscrow,
  /** The double-entry ledger. */
  BookOpen as IconLedger,
  Briefcase as IconBriefcase,
  Megaphone as IconBroadcast,
} from 'lucide-react';
