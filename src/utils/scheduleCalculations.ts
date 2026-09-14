import { StyleScheduleRecord, ScheduleOverlapConflict, UrgentPushNotification } from '../types';

export const SCHEDULES_STORAGE_KEY = 'tw_style_schedules_v1';
export const URGENT_NOTIFICATIONS_STORAGE_KEY = 'tw_urgent_notifications_v1';

// Format YYYY-MM-DD
export function formatDateYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Cek apakah tanggal adalah hari Minggu (Pabrik Libur)
 */
export function isSundayDate(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getDay() === 0;
}

/**
 * Cek apakah tanggal adalah hari Sabtu (Masuk Setengah Hari)
 */
export function isSaturdayDate(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getDay() === 6;
}

/**
 * Mendapatkan jam kerja standar hari:
 * - Minggu = 0 jam (Libur)
 * - Sabtu = setengah hari (standardHours / 2, e.g. 4 jam)
 * - Senin - Jumat = standardHours (e.g. 8 jam)
 */
export function getStandardWorkingHoursForDate(date: Date | string, standardHours: number = 8): number {
  if (isSundayDate(date)) return 0;
  if (isSaturdayDate(date)) return Math.max(1, Math.round(standardHours / 2));
  return standardHours;
}

/**
 * Tambah hari kerja pada kalender:
 * - Setiap hari Minggu: LIBUR (0 hari kerja)
 * - Setiap hari Sabtu: MASUK SETENGAH HARI (0.5 hari kerja)
 * - Senin s/d Jumat: 1.0 hari kerja normal
 */
export function addWorkingDays(startDateStr: string, daysToAdd: number): string {
  if (daysToAdd <= 0) return startDateStr;
  const curr = new Date(startDateStr);
  let accumulated = 0;
  
  while (accumulated < daysToAdd) {
    curr.setDate(curr.getDate() + 1);
    const dayOfWeek = curr.getDay();
    if (dayOfWeek === 0) {
      // Minggu = Libur
      continue;
    } else if (dayOfWeek === 6) {
      // Sabtu = Masuk Setengah Hari (0.5 hari)
      accumulated += 0.5;
    } else {
      // Senin - Jumat = 1.0 hari kerja penuh
      accumulated += 1.0;
    }
  }
  return formatDateYMD(curr);
}

// Hitung metrik jadwal, sisa, dan lembur (OT)
export function calculateScheduleMetrics(
  base: Omit<StyleScheduleRecord, 'remainingQty' | 'needsOT' | 'otHoursNeeded' | 'otDaysNeeded' | 'otEndDate' | 'status'> & {
    remainingQty?: number;
    needsOT?: boolean;
    otHoursNeeded?: number;
    otDaysNeeded?: number;
    otEndDate?: string;
    status?: 'planning' | 'running' | 'overtime' | 'completed';
  }
): StyleScheduleRecord {
  const orderQty = Number(base.orderQty) || 0;
  const actualQty = Number(base.actualQty) || 0;
  const dailyTargetQty = Number(base.dailyTargetQty) || 500;
  const standardWorkingHours = Number(base.standardWorkingHours) || 8;
  const otHoursPerDay = Number(base.otHoursPerDay) || 2;
  const remainingQty = Math.max(0, orderQty - actualQty);

  // Kapasitas output per jam reguler
  const ratePerHour = dailyTargetQty > 0 && standardWorkingHours > 0 
    ? dailyTargetQty / standardWorkingHours 
    : 60;

  // Jam lembur yang dibutuhkan untuk menutup sisa target
  const otHoursNeeded = remainingQty > 0 
    ? Number((remainingQty / ratePerHour).toFixed(1))
    : 0;

  // Hari lembur yang dibutuhkan (asumsi lembur reguler 2 jam / hari)
  const otDaysNeeded = otHoursNeeded > 0
    ? Math.max(1, Math.ceil(otHoursNeeded / otHoursPerDay))
    : 0;

  // Tanggal selesai lembur
  const otEndDate = otDaysNeeded > 0
    ? addWorkingDays(base.plannedEndDate, otDaysNeeded)
    : base.plannedEndDate;

  // Status otomatis
  let status: 'planning' | 'running' | 'overtime' | 'completed' = base.status || 'running';
  const todayStr = formatDateYMD(new Date());

  if (remainingQty === 0 && actualQty >= orderQty) {
    status = 'completed';
  } else if (todayStr > base.plannedEndDate && remainingQty > 0) {
    status = 'overtime';
  } else if (todayStr >= base.startDate && todayStr <= base.plannedEndDate) {
    status = 'running';
  } else if (todayStr < base.startDate) {
    status = 'planning';
  }

  return {
    ...base,
    remainingQty,
    needsOT: remainingQty > 0,
    otHoursNeeded,
    otHoursPerDay,
    otDaysNeeded,
    otEndDate,
    status,
    updatedAt: new Date().toISOString()
  };
}

// Deteksi Konflik Tumpang Tindih (Overlap) Style Baru vs Sisa OT Style Lama pada Kategori Line
export function detectScheduleOverlaps(schedules: StyleScheduleRecord[]): ScheduleOverlapConflict[] {
  const conflicts: ScheduleOverlapConflict[] = [];

  // Kelompokkan berdasarkan Line
  const byLine: { [lineId: number]: StyleScheduleRecord[] } = {};
  for (const item of schedules) {
    if (!byLine[item.lineId]) {
      byLine[item.lineId] = [];
    }
    byLine[item.lineId].push(item);
  }

  // Periksa urutan kronologis per line
  for (const lineIdStr of Object.keys(byLine)) {
    const lineId = Number(lineIdStr);
    const lineSchedules = byLine[lineId].sort((a, b) => a.startDate.localeCompare(b.startDate));

    for (let i = 0; i < lineSchedules.length - 1; i++) {
      const prev = lineSchedules[i];
      const next = lineSchedules[i + 1];

      // Jika style sebelumnya masih memiliki sisa dan jadwal OT melampaui atau sama dengan start date style baru
      if (prev.needsOT && prev.otDaysNeeded > 0 && prev.otEndDate >= next.startDate) {
        
        // Loop setiap hari overlap dari next.startDate hingga prev.otEndDate
        let currDate = new Date(next.startDate);
        const otEnd = new Date(prev.otEndDate);

        while (currDate <= otEnd) {
          const dateStr = formatDateYMD(currDate);
          
          conflicts.push({
            id: `overlap-${prev.id}-${next.id}-${dateStr}`,
            lineId: prev.lineId,
            lineName: prev.lineName,
            date: dateStr,
            previousStyle: {
              id: prev.id,
              styleName: prev.styleName,
              buyer: prev.buyer,
              remainingQty: prev.remainingQty,
              otHours: prev.otHoursPerDay,
              otPeriod: '17:00 - 19:30 (Jam Lembur)'
            },
            incomingStyle: {
              id: next.id,
              styleName: next.styleName,
              buyer: next.buyer,
              orderQty: next.orderQty,
              dailyTargetQty: next.dailyTargetQty,
              regularPeriod: '08:00 - 17:00 (Shift Reguler)'
            },
            severity: prev.remainingQty > 500 ? 'critical' : 'warning',
            recommendation: `Alokasikan mesin sewing utama untuk ${next.styleName} pada shift reguler (08:00-17:00). Lanjutkan sisa ${prev.remainingQty} pcs ${prev.styleName} di jam lembur (17:00-19:30) dengan tim operator khusus agar tidak terjadi kemacetan setup.`
          });

          // Maju 1 hari
          currDate.setDate(currDate.getDate() + 1);
        }
      }
    }
  }

  return conflicts;
}

// Data Bawaan Jadwal Style Sewing & Overtime
export const INITIAL_STYLE_SCHEDULES: StyleScheduleRecord[] = [];

// Helper penyimpanan lokal
export function loadSavedSchedules(): StyleScheduleRecord[] {
  try {
    const raw = localStorage.getItem(SCHEDULES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(item => calculateScheduleMetrics(item));
      }
    }
  } catch (e) {
    console.error('Failed loading saved schedules:', e);
  }
  return INITIAL_STYLE_SCHEDULES;
}

export function saveSchedules(schedules: StyleScheduleRecord[]) {
  try {
    localStorage.setItem(SCHEDULES_STORAGE_KEY, JSON.stringify(schedules));
  } catch (e) {
    console.error('Failed saving schedules:', e);
  }
}

// Notifikasi Push Storage & Web Notification API
export function loadSavedUrgentNotifications(): UrgentPushNotification[] {
  try {
    const raw = localStorage.getItem(URGENT_NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      const parsed: UrgentPushNotification[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(item => ({
          ...item,
          status: item.status || 'baru',
          followUpDate: item.followUpDate || undefined,
          processDate: item.processDate || undefined,
          completedDate: item.completedDate || undefined
        }));
      }
    }
  } catch (e) {
    console.error('Failed loading urgent notifications:', e);
  }
  
  return [];
}

export function saveUrgentNotifications(notifications: UrgentPushNotification[]) {
  try {
    localStorage.setItem(URGENT_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  } catch (e) {
    console.error('Failed saving urgent notifications:', e);
  }
}

// Web Push Notification Helper
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Browser ini tidak mendukung Push Notification API.');
    return 'denied';
  }
  try {
    return await Notification.requestPermission();
  } catch (e) {
    console.error('Error requesting notification permission:', e);
    return 'denied';
  }
}

export function sendBrowserPushNotification(title: string, body: string, iconUrl?: string) {
  if (!('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body,
        icon: iconUrl || '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [200, 100, 200]
      } as any);
      
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
      return true;
    } catch (e) {
      console.warn('Direct notification error (possibly iframe sandbox constraint):', e);
      return false;
    }
  }
  return false;
}
