import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Search, Users, GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ModuleEntry {
  id: string;
  module_name: string;
  module_code: string;
  semester: 1 | 2;
  year: number;
  lecturer_name: string | null;
  group_count: number;
}

function getYear(code: string): number {
  const m = code.match(/Y(\d)/);
  return m ? parseInt(m[1], 10) : 0;
}

const YEAR_LABELS: Record<number, string> = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };

export default function ModulesList() {
  const [yearFilter, setYearFilter] = useState<number | null>(null);
  const [semFilter, setSemFilter] = useState<1 | 2 | null>(null);
  const [search, setSearch] = useState('');

  // Determine current user role
  const { data: myRole } = useQuery({
    queryKey: ['my-role-modules'],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from('teachers').select('role, id').eq('id', u.user.id).maybeSingle();
      return data as { role: string; id: string } | null;
    },
    staleTime: 60_000,
  });

  const isAdmin = myRole?.role === 'admin';

  const { data = [], isLoading } = useQuery({
    queryKey: ['modules-list', isAdmin, myRole?.id],
    enabled: myRole !== undefined,
    queryFn: async (): Promise<ModuleEntry[]> => {
      const uid = myRole?.id;

      // For non-admins, collect only the module IDs they're associated with
      let allowedIds: Set<string> | null = null;
      if (!isAdmin && uid) {
        const [{ data: lecMods }, { data: assignedMgs }] = await Promise.all([
          supabase.from('modules').select('id').eq('lecturer_id', uid),
          supabase.from('module_groups').select('module_id').eq('assigned_teacher_id', uid),
        ]);
        allowedIds = new Set([
          ...(lecMods ?? []).map((m: any) => m.id),
          ...(assignedMgs ?? []).map((mg: any) => mg.module_id),
        ]);
        if (allowedIds.size === 0) return [];
      }

      const modsQuery = allowedIds
        ? supabase.from('modules').select('*').in('id', [...allowedIds]).order('module_code')
        : supabase.from('modules').select('*').order('module_code');

      const [{ data: mods }, { data: teachers }, { data: mgs }] = await Promise.all([
        modsQuery,
        supabase.from('teachers').select('id, full_name'),
        supabase.from('module_groups').select('module_id'),
      ]);

      const lecturerMap = new Map<string, string>(
        (teachers ?? []).map((t: any) => [t.id, t.full_name]),
      );
      const groupCounts = new Map<string, number>();
      for (const mg of (mgs ?? []) as any[]) {
        groupCounts.set(mg.module_id, (groupCounts.get(mg.module_id) ?? 0) + 1);
      }
      return (mods ?? []).map((m: any): ModuleEntry => ({
        id: m.id,
        module_name: m.name ?? m.module_name ?? '',
        module_code: m.module_code ?? '',
        semester: m.semester === 2 ? 2 : 1,
        year: getYear(m.module_code ?? ''),
        lecturer_name: m.lecturer_id ? (lecturerMap.get(m.lecturer_id) ?? null) : null,
        group_count: groupCounts.get(m.id) ?? 0,
      }));
    },
    staleTime: 60_000,
  });

  const years = useMemo(() => {
    const ys = new Set(data.map((m) => m.year).filter((y) => y > 0));
    return Array.from(ys).sort();
  }, [data]);

  const filtered = useMemo(() => {
    return data.filter((m) => {
      if (yearFilter !== null && m.year !== yearFilter) return false;
      if (semFilter !== null && m.semester !== semFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!m.module_name.toLowerCase().includes(q) && !m.module_code.toLowerCase().includes(q))
          return false;
      }
      return true;
    });
  }, [data, yearFilter, semFilter, search]);

  // Group filtered modules by year for display
  const byYear = useMemo(() => {
    const groups = new Map<number, ModuleEntry[]>();
    for (const m of filtered) {
      const ys = groups.get(m.year) ?? [];
      ys.push(m);
      groups.set(m.year, ys);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a - b);
  }, [filtered]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{isAdmin ? 'Curriculum' : 'My Modules'}</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? `All ${data.length} ENSIA modules across 4 years`
              : `${data.length} module${data.length !== 1 ? 's' : ''} assigned to you`}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Year filters */}
          <div className="flex gap-1 flex-wrap">
            <Button
              size="sm"
              variant={yearFilter === null ? 'default' : 'outline'}
              onClick={() => setYearFilter(null)}
            >
              All years
            </Button>
            {years.map((y) => (
              <Button
                key={y}
                size="sm"
                variant={yearFilter === y ? 'default' : 'outline'}
                onClick={() => setYearFilter(yearFilter === y ? null : y)}
              >
                Y{y}
              </Button>
            ))}
          </div>

          {/* Semester filters */}
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={semFilter === 1 ? 'secondary' : 'outline'}
              onClick={() => setSemFilter(semFilter === 1 ? null : 1)}
            >
              S1
            </Button>
            <Button
              size="sm"
              variant={semFilter === 2 ? 'secondary' : 'outline'}
              onClick={() => setSemFilter(semFilter === 2 ? null : 2)}
            >
              S2
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        )}

        {!isLoading && data.length === 0 && !isAdmin && (
          <div className="flex flex-col items-center gap-3 py-14 text-center text-muted-foreground border border-dashed rounded-xl">
            <BookOpen className="w-10 h-10 opacity-30" />
            <p className="font-semibold text-base">No modules assigned yet</p>
            <p className="text-sm">Your administrator will assign modules to you from the Assignments panel.</p>
          </div>
        )}
        {!isLoading && filtered.length === 0 && data.length > 0 && (
          <div className="flex flex-col items-center gap-3 py-14 text-center text-muted-foreground border border-dashed rounded-xl">
            <BookOpen className="w-10 h-10 opacity-30" />
            <p className="font-semibold text-base">No modules match your filters</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setYearFilter(null); setSemFilter(null); setSearch(''); }}
            >
              Clear filters
            </Button>
          </div>
        )}

        {!isLoading && byYear.map(([year, modules]) => (
          <div key={year}>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              {YEAR_LABELS[year] ?? `Year ${year}`}
              <span className="text-xs font-normal normal-case">— {modules.length} modules</span>
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {modules.map((mod) => (
                <Link
                  key={mod.id}
                  to={`/modules/${mod.id}`}
                  className="group block rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {mod.module_code}
                    </span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      S{mod.semester}
                    </Badge>
                  </div>
                  <p className="font-medium text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {mod.module_name}
                  </p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {mod.group_count} {mod.group_count === 1 ? 'group' : 'groups'}
                    </span>
                    {mod.lecturer_name && (
                      <span className="truncate">{mod.lecturer_name}</span>
                    )}
                    {!mod.lecturer_name && (
                      <span className="italic opacity-60">No lecturer</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
