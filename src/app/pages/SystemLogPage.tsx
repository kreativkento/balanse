import { useEffect, useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router';
import type { LucideIcon } from 'lucide-react';
import { useDevAuth } from '../context/DevAuthContext';
import { DevSidebar } from '../components/layout/DevSidebar';
import { supabase } from '../../lib/supabase';
import type { LogSystemTableName } from '../../lib/database.types';

export interface SystemLogPageConfig {
  title: string;
  subtitle: string;
  tables: LogSystemTableName[];
  icon: LucideIcon;
  emptyHint: string;
}

interface LogRow {
  id: string;
  occurred_at: string;
  action: string;
  table_name: string;
  actor_email: string | null;
  summary: string;
  detail: string;
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function changedKeys(changed: unknown): string {
  if (!changed || typeof changed !== 'object') return '—';
  const keys = Object.keys(changed as Record<string, unknown>);
  return keys.length ? keys.join(', ') : '—';
}

async function fetchLogs(tables: LogSystemTableName[]): Promise<LogRow[]> {
  if (tables.length === 0) return [];

  const { data, error } = await supabase
    .from('log_system')
    .select('*')
    .in('table_name', tables)
    .order('occurred_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  if (!data) return [];

  return data.map((row) => {
    const actor = row.actor_email ?? 'system';
    const label = row.record_label || row.record_id || row.table_name;
    return {
      id: row.id,
      occurred_at: row.occurred_at,
      action: row.action,
      table_name: row.table_name,
      actor_email: row.actor_email,
      summary: `${row.action} · ${label}`,
      detail: `Table ${row.table_name} · Changed: ${changedKeys(row.changed_fields)} · By ${actor}`,
    };
  });
}

export function SystemLogPage({ config }: { config: SystemLogPageConfig }) {
  const navigate = useNavigate();
  const { devUser } = useDevAuth();
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!devUser) navigate('/development');
  }, [devUser, navigate]);

  useEffect(() => {
    if (!devUser) return;
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchLogs(config.tables);
        if (mounted) setRows(data);
      } catch (err) {
        if (mounted) {
          setRows([]);
          setError(err instanceof Error ? err.message : 'Failed to load logs. Apply migration 900_system_logs.sql first.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [devUser, config.tables.join('|')]);

  if (!devUser) return null;

  const Icon = config.icon;
  const showTableColumn = config.tables.length > 1;

  return (
    <DevSidebar>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 bg-[#1E2A35]/08 border border-[#1E2A35]/15 rounded-full px-3 py-1 mb-3">
            <Icon size={11} className="text-[#c49a3c]" />
            <span className="text-[#1E2A35] text-xs font-bold uppercase tracking-widest">System Logs</span>
          </div>
          <h1
            className="text-[#1E2A35]"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 4vw, 2.8rem)', letterSpacing: '0.04em', lineHeight: 1 }}
          >
            {config.title}
          </h1>
          <p className="text-[#B0A898] text-xs mt-1.5">{config.subtitle}</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#E8E2D2]/80 shadow-sm overflow-hidden">
          {loading ? (
            <div className="px-6 py-16 text-center text-[#8A7E6E] text-sm">Loading logs…</div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#EDE8D8] flex items-center justify-center mx-auto mb-4">
                <Icon size={24} className="text-[#8A7E6E]" />
              </div>
              <p className="text-[#1E2A35] font-semibold mb-1">No entries yet</p>
              <p className="text-[#8A7E6E] text-sm max-w-md mx-auto">{config.emptyHint}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#E8E2D2] bg-[#F8F3E8]/60">
                    <th className="px-4 py-3 text-[0.65rem] uppercase tracking-widest text-[#9A8E7E] font-semibold">When</th>
                    <th className="px-4 py-3 text-[0.65rem] uppercase tracking-widest text-[#9A8E7E] font-semibold">Action</th>
                    {showTableColumn && (
                      <th className="px-4 py-3 text-[0.65rem] uppercase tracking-widest text-[#9A8E7E] font-semibold">Table</th>
                    )}
                    <th className="px-4 py-3 text-[0.65rem] uppercase tracking-widest text-[#9A8E7E] font-semibold">Summary</th>
                    <th className="px-4 py-3 text-[0.65rem] uppercase tracking-widest text-[#9A8E7E] font-semibold">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-[#E8E2D2]/70 last:border-0 hover:bg-[#F8F3E8]/40">
                      <td className="px-4 py-3 text-xs text-[#5A5048] whitespace-nowrap align-top">{formatWhen(row.occurred_at)}</td>
                      <td className="px-4 py-3 align-top">
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-[#1E2A35]/08 text-[#1E2A35] text-[0.65rem] font-bold uppercase tracking-wide">
                          {row.action}
                        </span>
                      </td>
                      {showTableColumn && (
                        <td className="px-4 py-3 text-[0.7rem] text-[#8A7E6E] whitespace-nowrap align-top">{row.table_name}</td>
                      )}
                      <td className="px-4 py-3 text-sm text-[#1E2A35] align-top">{row.summary}</td>
                      <td className="px-4 py-3 text-xs text-[#8A7E6E] align-top">{row.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DevSidebar>
  );
}

export function createSystemLogPage(config: SystemLogPageConfig): ComponentType {
  return function NamedSystemLogPage() {
    return <SystemLogPage config={config} />;
  };
}
