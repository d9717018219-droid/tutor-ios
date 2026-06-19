import { TuitionJob } from '@/types';

const JOBS_API   = 'https://doableindia.com/app-sys/api_data.php';
const LEADS_API  = 'https://doableindia.com/app-sys/api_leads.php';

function parseSubjects(raw: string): string[] {
  if (!raw) return ['General'];
  return raw
    .split(/[,|/;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function parseMode(raw: string): TuitionJob['teachingMode'] {
  const v = (raw || '').toLowerCase();
  if (v.includes('online')) return 'Online';
  if (v.includes('group')) return 'Group';
  return 'Classes at Home';
}

function parseGender(raw: string): 'Male' | 'Female' | 'Any' {
  const v = (raw || '').toLowerCase();
  if (v.includes('male') && !v.includes('fe')) return 'Male';
  if (v.includes('female')) return 'Female';
  return 'Any';
}

function mapRow(row: any, idx: number): TuitionJob {
  const id = String(row.order_id || row.id || idx);
  const fee = parseInt(row.fee ?? row.budget ?? '0', 10) || 0;
  const subjectRaw = row.subjects ?? row.subject ?? row.Subjects ?? '';
  const cityRaw = (row.city ?? row.City ?? '').trim();
  const locationRaw = (row.location ?? row.area ?? row.Location ?? cityRaw).trim();
  const boardRaw = (row.board ?? row.Board ?? 'CBSE').trim() || 'CBSE';
  const classRaw = (row.class_group ?? row.class ?? row['Class / Board'] ?? 'General').replace(/\s*\(.*?\)/, '').trim();
  const postedAt = row.created_time ?? row.created_at ?? row.postedAt ?? new Date(Date.now() - idx * 3600000).toISOString();

  return {
    id,
    orderId: `ORD-${id}`,
    studentClass: classRaw || 'General',
    board: boardRaw,
    subjects: parseSubjects(subjectRaw),
    address: locationRaw || cityRaw || 'India',
    city: cityRaw || 'India',
    latitude: parseFloat(row.latitude) || 28.6139,
    longitude: parseFloat(row.longitude) || 77.2090,
    gender: parseGender(row.student_gender ?? row.gender ?? 'Any'),
    monthlyFee: fee,
    schedule: (row.time ?? row.schedule ?? 'Flexible').trim(),
    teachingMode: parseMode(row.teaching_mode ?? row.teachingMode ?? ''),
    genderPreference: parseGender(row.teacher_gender ?? row.tutor_gender ?? 'Any'),
    postedAt,
    requirements: (row.about ?? row.notes ?? row.message ?? '').trim(),
    duration: (row.duration ?? row.Duration ?? row.contract_duration ?? '').trim() || undefined,
    days: (row.days ?? row.Days ?? row.Available_Day_s ?? row.class_days ?? '').trim() || undefined,
    residency: (row.residency ?? row.area_type ?? row.locality_type ?? row.student_residency ?? '').trim() || undefined,
    isSaved: false,
    hasApplied: false,
    leadStatus: (row.status ?? row.lead_status ?? '').trim() || undefined,
  };
}

export async function fetchLatestLeads(limit = 10): Promise<TuitionJob[]> {
  try {
    const resp = await fetch(LEADS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_latest_leads', limit }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const rows: any[] = json?.data ?? [];
    if (!rows.length) return [];
    return rows.map((r, i) => mapRow(r, i));
  } catch (e) {
    console.warn('[jobsService] fetchLatestLeads failed:', e);
    return [];
  }
}

export async function fetchRealJobs(limit = 50): Promise<TuitionJob[]> {
  try {
    const resp = await fetch(`${JOBS_API}?limit=${limit}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const rows: any[] = json?.data ?? json?.results ?? (Array.isArray(json) ? json : []);
    if (!rows.length) return [];
    return rows.map((r, i) => mapRow(r, i));
  } catch (e) {
    console.warn('[jobsService] fetch failed:', e);
    return [];
  }
}
