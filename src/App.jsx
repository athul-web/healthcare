import { useState, useMemo, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  HardDrive,
  Wrench,
  Users,
  Settings as SettingsIcon,
  Bell,
  Menu,
  X,
  Search,
  ArrowLeft,
  MapPin,
  Clock,
  AlertTriangle,
  Plus,
  Check,
  QrCode,
  CircleUserRound,
} from "lucide-react";

/* ============================================================
   CONSTANTS & CONFIG
   ============================================================ */

const FACILITY_NAME = "District Hospital";

// Single source of truth for status display. Text label always
// accompanies the color so status never relies on color alone.
const STATUS = {
  working: {
    label: "Working",
    dot: "bg-emerald-600",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  maintenance: {
    label: "Under Maintenance",
    dot: "bg-amber-500",
    text: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  down: {
    label: "Down",
    dot: "bg-red-600",
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
  },
};

const REQUEST_STAGES = ["reported", "assigned", "repairing", "resolved"];
const STAGE_LABEL = {
  reported: "Reported",
  assigned: "Assigned",
  repairing: "Repairing",
  resolved: "Resolved",
};

const PROBLEM_TYPES = [
  "Not powering on",
  "Error",
  "Physical damage",
  "Poor performance",
  "Other",
];

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "equipment", label: "Equipment", icon: HardDrive },
  { key: "maintenance", label: "Maintenance", icon: Wrench },
  { key: "technicians", label: "Technicians", icon: Users },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

const fieldClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700";

/* ============================================================
   MOCK DATA LAYER
   This is intentionally the only place that "knows" about the
   shape of equipment / maintenance-request / technician records.
   When Supabase is wired up, these arrays (and the mutation
   functions in <App>) are what get replaced with real queries —
   the components below never touch the data shape directly.
   ============================================================ */

const mockEquipment = [
  { id: "VENT-001", name: "Ventilator", department: "ICU", location: "Ward 1", status: "working", lastChecked: "2 hours ago", currentIssue: null, maintenanceHistory: [
    { date: "21 Aug 2026", type: "Preventive maintenance", status: "Completed", technician: "Arun Kumar" },
  ] },
  { id: "VENT-002", name: "Ventilator", department: "ICU", location: "Ward 1", status: "working", lastChecked: "2 hours ago", currentIssue: null, maintenanceHistory: [] },
  { id: "VENT-003", name: "Ventilator", department: "ICU", location: "Ward 2", status: "maintenance", lastChecked: "40 minutes ago", currentIssue: "Scheduled calibration in progress", maintenanceHistory: [
    { date: "3 Jul 2026", type: "Calibration", status: "Completed", technician: "Rahul Menon" },
  ] },
  { id: "XRAY-002", name: "X-Ray Machine", department: "Radiology", location: "Room 204", status: "down", lastChecked: "18 minutes ago", currentIssue: "Not powering on", maintenanceHistory: [
    { date: "12 Jun 2026", type: "Screen replacement", status: "Completed", technician: "Arun Kumar" },
  ] },
  { id: "XRAY-005", name: "X-Ray Machine", department: "Radiology", location: "Room 206", status: "working", lastChecked: "5 hours ago", currentIssue: null, maintenanceHistory: [] },
  { id: "ECG-003", name: "ECG Machine", department: "Cardiology", location: "Room 3", status: "working", lastChecked: "1 hour ago", currentIssue: null, maintenanceHistory: [
    { date: "3 Jul 2026", type: "Calibration", status: "Completed", technician: "Rahul Menon" },
  ] },
  { id: "ECG-007", name: "ECG Machine", department: "Cardiology", location: "Room 5", status: "maintenance", lastChecked: "3 hours ago", currentIssue: "Lead wires being replaced", maintenanceHistory: [] },
  { id: "AUTO-004", name: "Autoclave", department: "Operation Theatre", location: "Sterilization Room", status: "maintenance", lastChecked: "25 minutes ago", currentIssue: "Pressure valve inspection", maintenanceHistory: [
    { date: "21 Aug 2026", type: "Preventive maintenance", status: "Completed", technician: "Arun Kumar" },
  ] },
  { id: "AUTO-008", name: "Autoclave", department: "Operation Theatre", location: "Sterilization Room 2", status: "working", lastChecked: "6 hours ago", currentIssue: null, maintenanceHistory: [] },
  { id: "DEFIB-001", name: "Defibrillator", department: "Emergency", location: "Bay 1", status: "working", lastChecked: "45 minutes ago", currentIssue: null, maintenanceHistory: [] },
  { id: "DEFIB-002", name: "Defibrillator", department: "Emergency", location: "Bay 2", status: "down", lastChecked: "1 hour ago", currentIssue: "Battery not holding charge", maintenanceHistory: [] },
  { id: "INFP-011", name: "Infusion Pump", department: "General Ward", location: "Room 12", status: "working", lastChecked: "3 hours ago", currentIssue: null, maintenanceHistory: [] },
  { id: "INFP-012", name: "Infusion Pump", department: "General Ward", location: "Room 14", status: "working", lastChecked: "3 hours ago", currentIssue: null, maintenanceHistory: [] },
  { id: "INFP-013", name: "Infusion Pump", department: "General Ward", location: "Room 15", status: "down", lastChecked: "32 minutes ago", currentIssue: "Display not responding", maintenanceHistory: [] },
  { id: "MON-021", name: "Patient Monitor", department: "ICU", location: "Ward 1", status: "working", lastChecked: "1 hour ago", currentIssue: null, maintenanceHistory: [] },
  { id: "MON-022", name: "Patient Monitor", department: "ICU", location: "Ward 2", status: "maintenance", lastChecked: "50 minutes ago", currentIssue: "Sensor recalibration", maintenanceHistory: [] },
  { id: "DIAL-001", name: "Dialysis Machine", department: "Dialysis Unit", location: "Room 1", status: "working", lastChecked: "4 hours ago", currentIssue: null, maintenanceHistory: [] },
  { id: "USS-001", name: "Ultrasound Scanner", department: "Radiology", location: "Room 202", status: "working", lastChecked: "2 hours ago", currentIssue: null, maintenanceHistory: [] },
  { id: "LAB-002", name: "Lab Analyzer", department: "Laboratory", location: "Room 1", status: "working", lastChecked: "6 hours ago", currentIssue: null, maintenanceHistory: [] },
  { id: "SUC-014", name: "Suction Pump", department: "Emergency", location: "Bay 3", status: "working", lastChecked: "5 hours ago", currentIssue: null, maintenanceHistory: [] },
];

const mockMaintenanceRequests = [
  {
    id: "REQ-1001",
    equipmentId: "XRAY-002",
    problemType: "Not powering on",
    description: "Screen remains completely dark. No response from the power button.",
    status: "reported",
    reportedAt: "18 minutes ago",
    reportedBy: "Staff Member",
    technician: null,
    timeline: { reported: "13 Sep · 10:42 AM", assigned: null, repairing: null, resolved: null },
  },
  {
    id: "REQ-1002",
    equipmentId: "DEFIB-002",
    problemType: "Error",
    description: "Battery indicator shows charging but the unit loses power within minutes.",
    status: "assigned",
    reportedAt: "1 hour ago",
    reportedBy: "Staff Member",
    technician: "Rahul Menon",
    timeline: { reported: "13 Sep · 9:58 AM", assigned: "13 Sep · 10:05 AM", repairing: null, resolved: null },
  },
  {
    id: "REQ-1003",
    equipmentId: "INFP-013",
    problemType: "Error",
    description: "Display freezes intermittently during infusion, requiring a manual restart.",
    status: "repairing",
    reportedAt: "32 minutes ago",
    reportedBy: "Staff Member",
    technician: "Arun Kumar",
    timeline: { reported: "13 Sep · 10:28 AM", assigned: "13 Sep · 10:33 AM", repairing: "13 Sep · 10:47 AM", resolved: null },
  },
];

const mockTechnicians = [
  { id: "T1", name: "Rahul Menon", specialty: "Biomedical Equipment" },
  { id: "T2", name: "Arun Kumar", specialty: "Imaging Systems" },
  { id: "T3", name: "Priya Nair", specialty: "Life Support Systems" },
  { id: "T4", name: "Sanjay Varma", specialty: "General Maintenance" },
];

/* ============================================================
   SMALL HELPERS
   ============================================================ */

function stampNow() {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const date = now.toLocaleDateString([], { day: "2-digit", month: "short" });
  return `${date} · ${time}`;
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/* ============================================================
   PRIMITIVE UI COMPONENTS
   ============================================================ */

function Button({ children, variant = "secondary", size = "md", icon: Icon, className, ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = {
    md: "text-sm px-3.5 py-2",
    sm: "text-xs px-2.5 py-1.5",
    lg: "text-sm px-4 py-2.5",
  };
  const variants = {
    primary: "bg-teal-700 text-white hover:bg-teal-800",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button className={cx(base, sizes[size], variants[variant], className)} {...props}>
      {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

function StatusBadge({ status, size = "md" }) {
  const s = STATUS[status];
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-medium",
        s.bg,
        s.text,
        s.border,
        size === "sm" ? "text-xs" : "text-sm"
      )}
    >
      <span className={cx("h-1.5 w-1.5 rounded-full", s.dot)} aria-hidden="true" />
      {s.label}
    </span>
  );
}

function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {action || null}
    </div>
  );
}

function FormField({ label, htmlFor, children, hint }) {
  return (
    <div className="mb-4">
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-14 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description ? <p className="max-w-xs text-sm text-slate-500">{description}</p> : null}
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <AlertTriangle className="h-5 w-5 text-slate-400" aria-hidden="true" />
      <p className="text-sm font-medium text-slate-700">{message || "Unable to load data."}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

function TableSkeleton({ rows = 5 }) {
  return (
    <div className="divide-y divide-slate-100" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5 animate-pulse">
          <div className="h-3.5 w-1/4 rounded bg-slate-200" />
          <div className="h-3.5 w-1/6 rounded bg-slate-200" />
          <div className="h-3.5 w-1/6 rounded bg-slate-200" />
          <div className="h-3.5 w-1/6 rounded bg-slate-200" />
        </div>
      ))}
    </div>
  );
}

function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:right-4 sm:left-auto sm:items-end">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm"
          role="status"
        >
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-slate-800">{t.title}</p>
            {t.description ? <p className="text-slate-500">{t.description}</p> : null}
          </div>
          <button
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss notification"
            className="text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function Modal({ title, onClose, children, widthClass = "max-w-md" }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    dialogRef.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900 bg-opacity-40 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cx(
          "w-full rounded-t-lg border border-slate-200 bg-white shadow-sm focus:outline-none sm:rounded-lg",
          widthClass
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 id="modal-title" className="text-base font-semibold text-slate-900">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/* ============================================================
   QR CODE (mock — visually realistic, deterministic per ID)
   ============================================================ */

function QRCodeBlock({ value, size = 128 }) {
  const grid = 21;
  const cell = size / grid;
  const seed = hashString(value);

  const isFinderZone = (x, y) => {
    const inCorner = (cx0, cy0) => x >= cx0 && x < cx0 + 7 && y >= cy0 && y < cy0 + 7;
    return inCorner(0, 0) || inCorner(grid - 7, 0) || inCorner(0, grid - 7);
  };
  const finderCell = (x, y, cx0, cy0) => {
    const lx = x - cx0;
    const ly = y - cy0;
    const onOuter = lx === 0 || lx === 6 || ly === 0 || ly === 6;
    const onInner = lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4;
    return onOuter || onInner;
  };
  const dataBit = (x, y) => {
    const n = (x * 131 + y * 977 + seed) % 997;
    return n % 3 === 0;
  };

  const cells = [];
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      let filled;
      if (isFinderZone(x, y)) {
        if (x < 7 && y < 7) filled = finderCell(x, y, 0, 0);
        else if (x >= grid - 7 && y < 7) filled = finderCell(x, y, grid - 7, 0);
        else filled = finderCell(x, y, 0, grid - 7);
      } else {
        filled = dataBit(x, y);
      }
      if (filled) {
        cells.push(
          <rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell} height={cell} fill="#1B2430" />
        );
      }
    }
  }

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={`QR code for equipment ${value}`}>
      <rect x="0" y="0" width={size} height={size} fill="#FFFFFF" />
      {cells}
    </svg>
  );
}

function EquipmentQRPanel({ equipment }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-4">
      <p className="text-xs text-slate-500">Equipment ID</p>
      <p className="mb-3 text-sm font-medium text-slate-900">{equipment.id}</p>
      <div className="inline-block rounded-md border border-slate-200 p-2">
        <QRCodeBlock value={`/equipment/${equipment.id}`} size={128} />
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
        <QrCode className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
        Scan to open equipment
      </p>
    </div>
  );
}

/* ============================================================
   LAYOUT: SIDEBAR / MOBILE NAV / TOP BAR
   ============================================================ */

function NavLinks({ page, onNavigate, requestCount }) {
  return (
    <nav className="flex flex-col gap-0.5 px-3" aria-label="Primary">
      {NAV_ITEMS.map((item) => {
        const active =
          page === item.key ||
          (item.key === "equipment" && (page === "equipment-detail" || page === "add-equipment")) ||
          (item.key === "maintenance" && page === "request-detail");
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            aria-current={active ? "page" : undefined}
            className={cx(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700",
              active ? "bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
            {item.key === "maintenance" && requestCount > 0 ? (
              <span className="ml-auto rounded-full bg-slate-200 px-1.5 py-0.5 text-xs font-semibold text-slate-700">
                {requestCount}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

function BrandMark({ small }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cx("flex items-center justify-center rounded-md bg-teal-700", small ? "h-6 w-6" : "h-7 w-7")}>
        <HardDrive className={cx("text-white", small ? "h-3.5 w-3.5" : "h-4 w-4")} aria-hidden="true" />
      </div>
      <span className={cx("font-semibold text-slate-900", small ? "text-sm" : "text-[15px]")}>Uptime</span>
    </div>
  );
}

function Sidebar({ page, onNavigate, requestCount }) {
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="px-4 py-5">
        <BrandMark />
        <p className="mt-1 text-xs text-slate-500">{FACILITY_NAME}</p>
      </div>
      <NavLinks page={page} onNavigate={onNavigate} requestCount={requestCount} />
    </aside>
  );
}

function MobileNav({ open, onClose, page, onNavigate, requestCount }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <div className="absolute inset-0 bg-slate-900 bg-opacity-40" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 w-64 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
          <BrandMark small />
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="py-3">
          <NavLinks
            page={page}
            onNavigate={(k) => {
              onNavigate(k);
              onClose();
            }}
            requestCount={requestCount}
          />
        </div>
      </div>
    </div>
  );
}

function TopBar({ onMenuClick, onPreviewScan, downCount, userLabel }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-700 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="md:hidden">
          <BrandMark small />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onPreviewScan}
          className="hidden items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-700 sm:inline-flex"
        >
          <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
          Preview scan view
        </button>
        <button
          aria-label={downCount > 0 ? `${downCount} equipment need attention` : "Notifications"}
          className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-700"
        >
          <Bell className="h-4 w-4" />
          {downCount > 0 ? (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-600 ring-2 ring-white" aria-hidden="true" />
          ) : null}
        </button>
        <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
          <CircleUserRound className="h-6 w-6 text-slate-400" aria-hidden="true" />
          <span className="hidden text-sm text-slate-700 sm:inline">{userLabel}</span>
        </div>
      </div>
    </header>
  );
}

/* ============================================================
   DASHBOARD PAGE
   ============================================================ */

function SummaryStats({ equipment }) {
  const total = equipment.length;
  const working = equipment.filter((e) => e.status === "working").length;
  const maintenance = equipment.filter((e) => e.status === "maintenance").length;
  const down = equipment.filter((e) => e.status === "down").length;
  const items = [
    { label: "Total Equipment", value: total, className: "text-slate-900" },
    { label: "Working", value: working, className: "text-emerald-700" },
    { label: "Under Maintenance", value: maintenance, className: "text-amber-700" },
    { label: "Down", value: down, className: "text-red-700" },
  ];
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="bg-white px-4 py-3.5">
          <p className="text-xs text-slate-500">{item.label}</p>
          <p className={cx("mt-1 text-xl font-semibold tabular-nums", item.className)}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function AvailabilityMeter({ equipment }) {
  const total = equipment.length;
  const working = equipment.filter((e) => e.status === "working").length;
  const pct = total ? Math.round((working / total) * 100) : 0;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-3.5">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-slate-700">Equipment availability</p>
        <p className="text-sm font-semibold text-slate-900">{pct}% operational</p>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-teal-700" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        {working} of {total} equipment currently operational
      </p>
    </div>
  );
}

function RequiresAttention({ equipment, requests, onView }) {
  const downItems = equipment.filter((e) => e.status === "down");
  return (
    <div className="rounded-md border border-slate-200 bg-white">
      <SectionHeader title="Requires attention" />
      {downItems.length === 0 ? (
        <EmptyState title="Nothing needs attention" description="All equipment is working or scheduled for maintenance." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {downItems.map((e) => {
            const req = requests.find((r) => r.equipmentId === e.id && r.status !== "resolved");
            return (
              <li key={e.id} className="flex items-start justify-between gap-4 px-4 py-3.5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {e.name} <span className="font-normal text-slate-500">· {e.id}</span>
                    </p>
                    <p className="text-sm text-slate-600">{e.currentIssue || "Reported issue"}</p>
                    <p className="mt-0.5 text-xs text-slate-500">Reported {req ? req.reportedAt : e.lastChecked}</p>
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => onView(e.id)}>
                  View issue
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EquipmentTable({ equipment, onSelect }) {
  if (equipment.length === 0) {
    return <EmptyState title="No equipment found" description="Try changing your filters or add new equipment." />;
  }
  return (
    <>
      <table className="hidden w-full text-left text-sm md:table">
        <thead>
          <tr className="border-b border-slate-200 text-xs text-slate-500">
            <th scope="col" className="px-4 py-2.5 font-medium">Equipment</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Department</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Location</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Last Checked</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {equipment.map((e) => (
            <tr
              key={e.id}
              tabIndex={0}
              role="button"
              onClick={() => onSelect(e.id)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter") onSelect(e.id);
              }}
              className="cursor-pointer hover:bg-slate-50 focus:outline-none focus:bg-slate-50"
            >
              <td className="px-4 py-3">
                <p className="font-medium text-slate-900">{e.name}</p>
                <p className="text-xs text-slate-500">{e.id}</p>
              </td>
              <td className="px-4 py-3 text-slate-600">{e.department}</td>
              <td className="px-4 py-3 text-slate-600">{e.location}</td>
              <td className="px-4 py-3">
                <StatusBadge status={e.status} size="sm" />
              </td>
              <td className="px-4 py-3 text-slate-500">{e.lastChecked}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="divide-y divide-slate-100 md:hidden">
        {equipment.map((e) => (
          <li key={e.id}>
            <button
              onClick={() => onSelect(e.id)}
              className="flex w-full flex-col gap-1 px-4 py-3.5 text-left focus:outline-none focus:bg-slate-50"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">{e.name}</p>
                <StatusBadge status={e.status} size="sm" />
              </div>
              <p className="text-xs text-slate-500">
                {e.id} · {e.department} · {e.location}
              </p>
              <p className="text-xs text-slate-500">Checked {e.lastChecked}</p>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function DashboardPage({ equipment, requests, loading, onSelectEquipment, onViewAllEquipment }) {
  const sorted = useMemo(() => {
    const rank = { down: 0, maintenance: 1, working: 2 };
    return [...equipment].sort((a, b) => rank[a.status] - rank[b.status]);
  }, [equipment]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-slate-900">Equipment Overview</h1>
        <p className="mt-0.5 text-sm text-slate-500">{FACILITY_NAME} · Equipment status</p>
      </div>

      {loading ? (
        <div className="space-y-5">
          <div className="h-20 animate-pulse rounded-md bg-slate-100" />
          <div className="h-16 animate-pulse rounded-md bg-slate-100" />
          <div className="rounded-md border border-slate-200 bg-white">
            <TableSkeleton rows={6} />
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <SummaryStats equipment={equipment} />
          <div className="grid gap-5 lg:grid-cols-2">
            <RequiresAttention equipment={equipment} requests={requests} onView={onSelectEquipment} />
            <AvailabilityMeter equipment={equipment} />
          </div>
          <div className="rounded-md border border-slate-200 bg-white">
            <SectionHeader
              title="Equipment status"
              action={
                <button
                  onClick={onViewAllEquipment}
                  className="text-xs font-medium text-teal-700 hover:text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-700"
                >
                  View all equipment
                </button>
              }
            />
            <EquipmentTable equipment={sorted} onSelect={onSelectEquipment} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   EQUIPMENT LIST PAGE
   ============================================================ */

function EquipmentListPage({ equipment, onSelect, onAdd }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");

  const departments = useMemo(
    () => Array.from(new Set(equipment.map((e) => e.department))).sort(),
    [equipment]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return equipment.filter((e) => {
      const matchesQuery = !q || [e.name, e.id, e.department, e.location].join(" ").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || e.status === statusFilter;
      const matchesDept = deptFilter === "all" || e.department === deptFilter;
      return matchesQuery && matchesStatus && matchesDept;
    });
  }, [equipment, query, statusFilter, deptFilter]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Equipment</h1>
        <Button variant="primary" icon={Plus} onClick={onAdd}>
          Add Equipment
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search equipment..."
            aria-label="Search equipment"
            className={cx(fieldClass, "pl-9")}
          />
        </div>
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={cx(fieldClass, "sm:w-44")}
        >
          <option value="all">All statuses</option>
          <option value="working">Working</option>
          <option value="maintenance">Under Maintenance</option>
          <option value="down">Down</option>
        </select>
        <select
          aria-label="Filter by department"
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className={cx(fieldClass, "sm:w-48")}
        >
          <option value="all">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-md border border-slate-200 bg-white">
        <EquipmentTable equipment={filtered} onSelect={onSelect} />
      </div>
    </div>
  );
}

/* ============================================================
   MAINTENANCE TIMELINE (shared by Equipment Detail & Request Detail)
   ============================================================ */

function MaintenanceTimeline({ request }) {
  const stageIndex = REQUEST_STAGES.indexOf(request.status);
  return (
    <ol className="space-y-0">
      {REQUEST_STAGES.map((stage, idx) => {
        const timestamp = request.timeline[stage];
        const reached = idx <= stageIndex;
        const isLast = idx === REQUEST_STAGES.length - 1;
        return (
          <li key={stage} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cx(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                  reached ? "border-teal-700 bg-teal-700" : "border-slate-300 bg-white"
                )}
              >
                {reached ? <Check className="h-3 w-3 text-white" aria-hidden="true" /> : null}
              </span>
              {!isLast ? (
                <span
                  className={cx("w-px flex-1", idx < stageIndex ? "bg-teal-700" : "bg-slate-200")}
                  style={{ minHeight: "28px" }}
                />
              ) : null}
            </div>
            <div className="pb-5">
              <p className={cx("text-sm font-medium", reached ? "text-slate-900" : "text-slate-400")}>
                {STAGE_LABEL[stage]}
              </p>
              <p className="text-xs text-slate-500">{timestamp || "—"}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function MaintenanceHistoryList({ history }) {
  if (!history || history.length === 0) {
    return <p className="px-4 py-4 text-sm text-slate-500">No past maintenance recorded.</p>;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {history.map((h, i) => (
        <li key={i} className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-900">{h.type}</p>
            <span className="text-xs font-medium text-slate-500">{h.status}</span>
          </div>
          <p className="text-xs text-slate-500">
            {h.date} · Technician: {h.technician}
          </p>
        </li>
      ))}
    </ul>
  );
}

/* ============================================================
   EQUIPMENT DETAIL PAGE
   ============================================================ */

function EquipmentDetailPage({ equipment, requests, onBack, onReportProblem }) {
  const activeRequest = requests.find((r) => r.equipmentId === equipment.id && r.status !== "resolved");
  const s = STATUS[equipment.status];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Equipment
      </button>

      <div className="mb-5">
        <h1 className="text-xl font-semibold text-slate-900">{equipment.name}</h1>
        <p className="text-sm text-slate-500">{equipment.id}</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
          <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          {equipment.department} · {equipment.location}
        </p>
        <div className="mt-2">
          <StatusBadge status={equipment.status} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-5">
          <div className="rounded-md border border-slate-200 bg-white px-4 py-4">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Current Status</dt>
                <dd className={cx("font-medium", s.text)}>{s.label}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Location</dt>
                <dd className="font-medium text-slate-900">
                  {equipment.department} · {equipment.location}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Last Checked</dt>
                <dd className="flex items-center gap-1.5 font-medium text-slate-900">
                  <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  {equipment.lastChecked}
                </dd>
              </div>
              {equipment.currentIssue ? (
                <div>
                  <dt className="text-xs text-slate-500">Current Issue</dt>
                  <dd className="font-medium text-slate-900">{equipment.currentIssue}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          {activeRequest ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              A maintenance request is already open for this equipment.
            </p>
          ) : (
            <Button
              variant={equipment.status === "working" ? "secondary" : "primary"}
              className="w-full"
              onClick={() => onReportProblem(equipment.id)}
            >
              Report a Problem
            </Button>
          )}

          <EquipmentQRPanel equipment={equipment} />
        </div>

        <div className="space-y-5">
          {activeRequest ? (
            <div className="rounded-md border border-slate-200 bg-white">
              <SectionHeader title="Maintenance" />
              <div className="px-4 py-4">
                <MaintenanceTimeline request={activeRequest} />
              </div>
            </div>
          ) : null}
          <div className="rounded-md border border-slate-200 bg-white">
            <SectionHeader title="Maintenance History" />
            <MaintenanceHistoryList history={equipment.maintenanceHistory} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   REPORT PROBLEM MODAL (used from Equipment Detail & Scan View)
   ============================================================ */

function ReportProblemModal({ equipment, onClose, onSubmit }) {
  const [problemType, setProblemType] = useState(PROBLEM_TYPES[0]);
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ equipmentId: equipment.id, problemType, description });
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <Modal title="Report a problem" onClose={onClose}>
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
            <Check className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-slate-900">Issue reported</p>
          <p className="text-sm text-slate-500">Maintenance has been notified.</p>
          <Button variant="primary" className="mt-3" onClick={onClose}>
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Report a problem" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <p className="mb-4 text-sm text-slate-500">
          {equipment.name} · {equipment.id}
        </p>
        <FormField label="Problem type" htmlFor="problem-type">
          <select
            id="problem-type"
            value={problemType}
            onChange={(e) => setProblemType(e.target.value)}
            className={fieldClass}
          >
            {PROBLEM_TYPES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Description" htmlFor="problem-description">
          <textarea
            id="problem-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the problem..."
            rows={4}
            required
            className={fieldClass}
          />
        </FormField>
        <Button type="submit" variant="primary" className="w-full">
          Submit Report
        </Button>
      </form>
    </Modal>
  );
}

/* ============================================================
   STAFF / QR SCAN VIEW (standalone — no admin chrome)
   ============================================================ */

function ScanView({ equipment, onExit, onReportProblem }) {
  const [scannedId, setScannedId] = useState(equipment[0]?.id);
  const item = equipment.find((e) => e.id === scannedId) || equipment[0];
  const s = STATUS[item.status];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-sm px-4 py-6">
        <button
          onClick={onExit}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Exit preview
        </button>

        <div className="mb-4">
          <label htmlFor="scan-picker" className="mb-1 block text-xs text-slate-500">
            Demo: choose scanned equipment
          </label>
          <select
            id="scan-picker"
            value={scannedId}
            onChange={(e) => setScannedId(e.target.value)}
            className={cx(fieldClass, "text-xs")}
          >
            {equipment.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} · {e.id}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-md border border-slate-200 bg-white px-5 py-6">
          <h1 className="text-lg font-semibold text-slate-900">{item.name}</h1>
          <p className="text-sm text-slate-500">{item.id}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
            <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            {item.department} · {item.location}
          </p>

          <div className={cx("mt-4 flex items-center gap-2 rounded-md border px-3 py-2.5", s.bg, s.border)}>
            <span className={cx("h-2 w-2 rounded-full", s.dot)} aria-hidden="true" />
            <span className={cx("text-sm font-medium", s.text)}>
              {item.status === "down" ? "Currently unavailable" : s.label}
            </span>
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            Last checked {item.lastChecked}
          </p>

          <Button variant="primary" size="lg" className="mt-5 w-full" onClick={() => onReportProblem(item.id)}>
            Report a Problem
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MAINTENANCE / TECHNICIAN VIEW
   ============================================================ */

function RequestCard({ request, equipment, onOpen, onAccept, onStart, onFinish }) {
  const actionMap = {
    reported: { label: "Accept Request", onClick: onAccept },
    assigned: { label: "Start Repair", onClick: onStart },
    repairing: { label: "Mark as Repaired", onClick: onFinish },
  };
  const action = actionMap[request.status];

  return (
    <li className="px-4 py-3.5">
      <button onClick={() => onOpen(request.id)} className="block w-full text-left focus:outline-none">
        <p className="text-sm font-medium text-slate-900">
          {equipment.name} <span className="font-normal text-slate-500">· {equipment.id}</span>
        </p>
        <p className="text-sm text-slate-600">{request.problemType}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {equipment.department} · Reported {request.reportedAt}
        </p>
      </button>
      {action ? (
        <Button
          variant="secondary"
          size="sm"
          className="mt-2.5"
          onClick={(e) => {
            e.stopPropagation();
            action.onClick(request.id);
          }}
        >
          {action.label}
        </Button>
      ) : null}
    </li>
  );
}

function MaintenanceRequestsPage({ requests, equipmentById, onOpen, onAccept, onStart, onFinish }) {
  const groups = [
    { key: "reported", label: "Reported" },
    { key: "assigned", label: "Assigned" },
    { key: "repairing", label: "Repairing" },
  ];
  const active = requests.filter((r) => r.status !== "resolved");
  const resolved = requests.filter((r) => r.status === "resolved");

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-slate-900">Maintenance Requests</h1>
        <p className="mt-0.5 text-sm text-slate-500">{FACILITY_NAME} · Repair &amp; upkeep tracking</p>
      </div>

      {active.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-white">
          <EmptyState title="No active maintenance requests." description="All reported issues have been resolved." />
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => {
            const items = active.filter((r) => r.status === g.key);
            if (items.length === 0) return null;
            return (
              <div key={g.key} className="rounded-md border border-slate-200 bg-white">
                <SectionHeader title={`${g.label} (${items.length})`} />
                <ul className="divide-y divide-slate-100">
                  {items.map((r) => (
                    <RequestCard
                      key={r.id}
                      request={r}
                      equipment={equipmentById[r.equipmentId]}
                      onOpen={onOpen}
                      onAccept={onAccept}
                      onStart={onStart}
                      onFinish={onFinish}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {resolved.length > 0 ? (
        <div className="mt-6 rounded-md border border-slate-200 bg-white">
          <SectionHeader title="Recently resolved" />
          <ul className="divide-y divide-slate-100">
            {resolved.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {equipmentById[r.equipmentId]?.name} <span className="font-normal text-slate-500">· {r.equipmentId}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {r.problemType} · Resolved by {r.technician}
                  </p>
                </div>
                <StatusBadge status="working" size="sm" />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function RequestDetailPage({ request, equipment, onBack, onAccept, onStart, onFinish }) {
  const actionMap = {
    reported: { label: "Accept Request", onClick: () => onAccept(request.id) },
    assigned: { label: "Start Repair", onClick: () => onStart(request.id) },
    repairing: { label: "Mark as Repaired", onClick: () => onFinish(request.id) },
  };
  const action = actionMap[request.status];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Maintenance Requests
      </button>

      <h1 className="text-xl font-semibold text-slate-900">Maintenance Request</h1>
      <p className="mt-0.5 text-sm text-slate-500">
        {equipment.name} · {equipment.id}
      </p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-white px-4 py-4">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Problem</dt>
              <dd className="font-medium text-slate-900">{request.problemType}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Description</dt>
              <dd className="text-slate-700">{request.description}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Reported</dt>
              <dd className="font-medium text-slate-900">{request.timeline.reported}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Reported by</dt>
              <dd className="font-medium text-slate-900">{request.reportedBy}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Status</dt>
              <dd className="font-medium text-slate-900">{STAGE_LABEL[request.status]}</dd>
            </div>
            {request.status === "resolved" ? (
              <div>
                <dt className="text-xs text-slate-500">Equipment status</dt>
                <dd className="font-medium text-emerald-700">Working</dd>
              </div>
            ) : null}
          </dl>

          {action ? (
            <Button variant="primary" className="mt-5 w-full" onClick={action.onClick}>
              {action.label}
            </Button>
          ) : (
            <p className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
              Resolved — equipment status is now Working.
            </p>
          )}
        </div>

        <div className="rounded-md border border-slate-200 bg-white px-4 py-4">
          <p className="mb-3 text-sm font-semibold text-slate-900">Timeline</p>
          <MaintenanceTimeline request={request} />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ADD EQUIPMENT PAGE
   ============================================================ */

function AddEquipmentPage({ onDone }) {
  const [form, setForm] = useState({ name: "", id: "", department: "", location: "", status: "working" });
  const [created, setCreated] = useState(null);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const newEquipment = {
      id: form.id.trim(),
      name: form.name.trim(),
      department: form.department.trim(),
      location: form.location.trim(),
      status: form.status,
      lastChecked: "Just now",
      currentIssue: null,
      maintenanceHistory: [],
    };
    setCreated(newEquipment);
  }

  if (created) {
    return (
      <div className="mx-auto max-w-md px-4 py-6 sm:px-6">
        <div className="rounded-md border border-slate-200 bg-white px-5 py-6 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
            <Check className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-slate-900">Equipment added</p>
          <p className="mb-4 text-sm text-slate-500">
            {created.name} · {created.id}
          </p>
          <div className="mx-auto mb-4 inline-block rounded-md border border-slate-200 p-2">
            <QRCodeBlock value={`/equipment/${created.id}`} size={128} />
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setForm({ name: "", id: "", department: "", location: "", status: "working" });
                setCreated(null);
              }}
            >
              Add another
            </Button>
            <Button variant="primary" className="flex-1" onClick={() => onDone(created)}>
              View equipment
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6 sm:px-6">
      <button
        onClick={() => onDone(null)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Equipment
      </button>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Add Equipment</h1>
      <form onSubmit={handleSubmit} className="rounded-md border border-slate-200 bg-white px-4 py-4">
        <FormField label="Equipment name" htmlFor="eq-name">
          <input
            id="eq-name"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Ventilator"
            className={fieldClass}
          />
        </FormField>
        <FormField label="Equipment ID" htmlFor="eq-id">
          <input
            id="eq-id"
            required
            value={form.id}
            onChange={(e) => update("id", e.target.value)}
            placeholder="VENT-005"
            className={fieldClass}
          />
        </FormField>
        <FormField label="Department" htmlFor="eq-dept">
          <input
            id="eq-dept"
            required
            value={form.department}
            onChange={(e) => update("department", e.target.value)}
            placeholder="ICU"
            className={fieldClass}
          />
        </FormField>
        <FormField label="Location" htmlFor="eq-loc">
          <input
            id="eq-loc"
            required
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder="Ward 1"
            className={fieldClass}
          />
        </FormField>
        <FormField label="Status" htmlFor="eq-status">
          <select id="eq-status" value={form.status} onChange={(e) => update("status", e.target.value)} className={fieldClass}>
            <option value="working">Working</option>
            <option value="maintenance">Under Maintenance</option>
            <option value="down">Down</option>
          </select>
        </FormField>
        <Button type="submit" variant="primary" className="w-full">
          Add Equipment
        </Button>
      </form>
    </div>
  );
}

/* ============================================================
   TECHNICIANS PAGE
   ============================================================ */

function TechniciansPage({ technicians, requests }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <h1 className="mb-5 text-xl font-semibold text-slate-900">Technicians</h1>
      <div className="rounded-md border border-slate-200 bg-white">
        <ul className="divide-y divide-slate-100">
          {technicians.map((t) => {
            const activeCount = requests.filter((r) => r.technician === t.name && r.status !== "resolved").length;
            const busy = activeCount > 0;
            return (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                <div>
                  <p className="text-sm font-medium text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.specialty}</p>
                </div>
                <div className="text-right">
                  <p className={cx("text-xs font-medium", busy ? "text-amber-700" : "text-emerald-700")}>
                    {busy ? "On a job" : "Available"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {activeCount} active {activeCount === 1 ? "request" : "requests"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* ============================================================
   SETTINGS PAGE
   ============================================================ */

function SettingsPage() {
  const [emailNotifs, setEmailNotifs] = useState(true);
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <h1 className="mb-5 text-xl font-semibold text-slate-900">Settings</h1>

      <div className="rounded-md border border-slate-200 bg-white">
        <SectionHeader title="Facility" />
        <div className="px-4 py-3.5 text-sm">
          <p className="text-slate-500">Facility name</p>
          <p className="font-medium text-slate-900">{FACILITY_NAME}</p>
        </div>
      </div>

      <div className="mt-5 rounded-md border border-slate-200 bg-white">
        <SectionHeader title="Notifications" />
        <div className="flex items-center justify-between gap-4 px-4 py-3.5">
          <div>
            <p className="text-sm font-medium text-slate-900">Email alerts for critical equipment</p>
            <p className="text-xs text-slate-500">Sent when equipment status changes to Down.</p>
          </div>
          <button
            role="switch"
            aria-checked={emailNotifs}
            aria-label="Email alerts for critical equipment"
            onClick={() => setEmailNotifs((v) => !v)}
            className={cx(
              "relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2",
              emailNotifs ? "bg-teal-700" : "bg-slate-300"
            )}
          >
            <span
              className={cx(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                emailNotifs ? "translate-x-5" : "translate-x-0.5"
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ROOT APP
   ============================================================ */

function GlobalStyles() {
  return (
    <style>{`
      @media (prefers-reduced-motion: reduce) {
        * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
      }
    `}</style>
  );
}

export default function App() {
  const [equipment, setEquipment] = useState(mockEquipment);
  const [requests, setRequests] = useState(mockMaintenanceRequests);
  const [surface, setSurface] = useState("app"); // "app" | "scan"
  const [page, setPage] = useState("dashboard");
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reportTarget, setReportTarget] = useState(null);
  const [toasts, setToasts] = useState([]);
  const reqCounter = useRef(1003);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  function pushToast(title, description) {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, title, description }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3800);
  }

  function dismissToast(id) {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }

  function goEquipmentDetail(id) {
    setSelectedEquipmentId(id);
    setPage("equipment-detail");
  }

  function goRequestDetail(id) {
    setSelectedRequestId(id);
    setPage("request-detail");
  }

  function handleReportSubmit({ equipmentId, problemType, description }) {
    reqCounter.current += 1;
    const newRequest = {
      id: `REQ-${reqCounter.current}`,
      equipmentId,
      problemType,
      description: description || problemType,
      status: "reported",
      reportedAt: "Just now",
      reportedBy: "Staff Member",
      technician: null,
      timeline: { reported: stampNow(), assigned: null, repairing: null, resolved: null },
    };
    setRequests((prev) => [newRequest, ...prev]);
    setEquipment((prev) =>
      prev.map((e) => (e.id === equipmentId ? { ...e, status: "down", currentIssue: problemType, lastChecked: "Just now" } : e))
    );
    pushToast("Issue reported", "Maintenance has been notified.");
  }

  function acceptRequest(id) {
    const t = stampNow();
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "assigned", technician: "Priya Nair", timeline: { ...r.timeline, assigned: t } } : r))
    );
    pushToast("Request assigned", "Priya Nair will handle this repair.");
  }

  function startRepair(id) {
    const t = stampNow();
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "repairing", timeline: { ...r.timeline, repairing: t } } : r)));
    pushToast("Repair started");
  }

  function markRepaired(id) {
    const t = stampNow();
    let equipmentId = null;
    let technicianName = "";
    let problemType = "";
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          equipmentId = r.equipmentId;
          technicianName = r.technician;
          problemType = r.problemType;
          return { ...r, status: "resolved", timeline: { ...r.timeline, resolved: t } };
        }
        return r;
      })
    );
    if (equipmentId) {
      setEquipment((prev) =>
        prev.map((e) =>
          e.id === equipmentId
            ? {
                ...e,
                status: "working",
                currentIssue: null,
                lastChecked: "Just now",
                maintenanceHistory: [
                  { date: t, type: problemType, status: "Resolved", technician: technicianName },
                  ...e.maintenanceHistory,
                ],
              }
            : e
        )
      );
    }
    pushToast("Equipment marked Working", "Repair recorded in maintenance history.");
  }

  function handleAddEquipment(newEquipment) {
    setEquipment((prev) => [...prev, newEquipment]);
    pushToast("Equipment added", `${newEquipment.name} · ${newEquipment.id}`);
  }

  const equipmentById = useMemo(() => Object.fromEntries(equipment.map((e) => [e.id, e])), [equipment]);
  const selectedEquipment = selectedEquipmentId ? equipmentById[selectedEquipmentId] : null;
  const selectedRequest = selectedRequestId ? requests.find((r) => r.id === selectedRequestId) : null;
  const downCount = equipment.filter((e) => e.status === "down").length;
  const activeRequestCount = requests.filter((r) => r.status !== "resolved").length;

  if (surface === "scan") {
    return (
      <>
        <GlobalStyles />
        <ScanView equipment={equipment} onExit={() => setSurface("app")} onReportProblem={(id) => setReportTarget(id)} />
        {reportTarget && equipmentById[reportTarget] ? (
          <ReportProblemModal
            equipment={equipmentById[reportTarget]}
            onClose={() => setReportTarget(null)}
            onSubmit={handleReportSubmit}
          />
        ) : null}
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  let content;
  if (page === "dashboard") {
    content = (
      <DashboardPage
        equipment={equipment}
        requests={requests}
        loading={loading}
        onSelectEquipment={goEquipmentDetail}
        onViewAllEquipment={() => setPage("equipment")}
      />
    );
  } else if (page === "equipment") {
    content = <EquipmentListPage equipment={equipment} onSelect={goEquipmentDetail} onAdd={() => setPage("add-equipment")} />;
  } else if (page === "equipment-detail" && selectedEquipment) {
    content = (
      <EquipmentDetailPage
        equipment={selectedEquipment}
        requests={requests}
        onBack={() => setPage("equipment")}
        onReportProblem={(id) => setReportTarget(id)}
      />
    );
  } else if (page === "add-equipment") {
    content = (
      <AddEquipmentPage
        onDone={(created) => {
          if (created) {
            handleAddEquipment(created);
            goEquipmentDetail(created.id);
          } else {
            setPage("equipment");
          }
        }}
      />
    );
  } else if (page === "maintenance") {
    content = (
      <MaintenanceRequestsPage
        requests={requests}
        equipmentById={equipmentById}
        onOpen={goRequestDetail}
        onAccept={acceptRequest}
        onStart={startRepair}
        onFinish={markRepaired}
      />
    );
  } else if (page === "request-detail" && selectedRequest) {
    content = (
      <RequestDetailPage
        request={selectedRequest}
        equipment={equipmentById[selectedRequest.equipmentId]}
        onBack={() => setPage("maintenance")}
        onAccept={acceptRequest}
        onStart={startRepair}
        onFinish={markRepaired}
      />
    );
  } else if (page === "technicians") {
    content = <TechniciansPage technicians={mockTechnicians} requests={requests} />;
  } else if (page === "settings") {
    content = <SettingsPage />;
  } else {
    content = (
      <DashboardPage
        equipment={equipment}
        requests={requests}
        loading={loading}
        onSelectEquipment={goEquipmentDetail}
        onViewAllEquipment={() => setPage("equipment")}
      />
    );
  }

  return (
    <>
      <GlobalStyles />
      <div className="flex h-screen min-h-screen w-full bg-slate-50 text-slate-900">
        <Sidebar page={page} onNavigate={setPage} requestCount={activeRequestCount} />
        <MobileNav
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          page={page}
          onNavigate={setPage}
          requestCount={activeRequestCount}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <TopBar
            onMenuClick={() => setMobileNavOpen(true)}
            onPreviewScan={() => setSurface("scan")}
            downCount={downCount}
            userLabel="Admin User"
          />
          <main className="min-h-0 flex-1 overflow-y-auto">{content}</main>
        </div>
      </div>
      {reportTarget && equipmentById[reportTarget] ? (
        <ReportProblemModal
          equipment={equipmentById[reportTarget]}
          onClose={() => setReportTarget(null)}
          onSubmit={handleReportSubmit}
        />
      ) : null}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
