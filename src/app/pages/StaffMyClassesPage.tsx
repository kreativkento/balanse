import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useStaffAuth } from '../context/StaffAuthContext';
import { MyClassesPageContent } from '../components/classes/MyClassesPageContent';
import { STAFF_PAGE_CONTAINER_PADDED } from '../lib/staff-page-meta';
import {
  fetchCoachAssignedClassDisplays,
  fetchStaffAssignedClasses,
  type ClassDisplay,
  type MemberEnrolledClassItem,
} from '../../lib/class-service';
import { fetchDisciplinesForPublic } from '../../lib/discipline-service';

const CLASS_COLOR_FALLBACK: Record<string, string> = {
  Yoga: '#c49a3c',
  Calisthenics: '#3A4A5A',
  'Animal Flow': '#6B8E6B',
  Groundworks: '#8B6F5A',
  'Circuit Training': '#B86A4A',
  'Mat Pilates': '#9A7A8A',
  Kickboxing: '#7A3A4A',
  Capoeira: '#A07050',
  'Personal Coaching': '#a67f2e',
};

/** Same list UX as member `/my-classes`, for classes assigned to the signed-in coach. */
export default function StaffMyClassesPage() {
  const navigate = useNavigate();
  const { staffUser } = useStaffAuth();
  const [classes, setClasses] = useState<MemberEnrolledClassItem[]>([]);
  const [classById, setClassById] = useState<Map<string, ClassDisplay>>(new Map());
  const [disciplineColorById, setDisciplineColorById] = useState<Map<string, string>>(new Map());
  const [disciplineLogoById, setDisciplineLogoById] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!staffUser) navigate('/staff-login');
  }, [staffUser, navigate]);

  useEffect(() => {
    if (!staffUser?.accountId) {
      setClasses([]);
      setClassById(new Map());
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    void (async () => {
      const [listResult, displayResult, disciplinesResult] = await Promise.all([
        fetchStaffAssignedClasses(staffUser.accountId),
        fetchCoachAssignedClassDisplays(staffUser.accountId, { includeAllBlocks: true }),
        fetchDisciplinesForPublic(),
      ]);
      if (cancelled) return;

      const errors = [listResult.error, displayResult.error, disciplinesResult.error].filter(
        Boolean,
      ) as string[];
      if (errors.length > 0) {
        setLoadError(errors[0]);
      }

      setClasses(listResult.data ?? []);
      setClassById(new Map((displayResult.data ?? []).map((row) => [row.id, row])));
      setDisciplineColorById(
        new Map((disciplinesResult.data ?? []).map((d) => [d.id, d.colorHex || '#c49a3c'])),
      );
      setDisciplineLogoById(new Map((disciplinesResult.data ?? []).map((d) => [d.id, d.logoUrl])));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [staffUser?.accountId]);

  const colorForClass = useCallback(
    (row: ClassDisplay) => {
      if (row.disciplineId && disciplineColorById.has(row.disciplineId)) {
        return disciplineColorById.get(row.disciplineId)!;
      }
      return CLASS_COLOR_FALLBACK[row.disciplineName] ?? '#c49a3c';
    },
    [disciplineColorById],
  );

  const staffCoachDetail = useMemo(
    () =>
      staffUser?.accountId
        ? {
            coachAccountId: staffUser.accountId,
            classById,
            colorForClass,
            disciplineLogoById,
          }
        : undefined,
    [classById, colorForClass, disciplineLogoById, staffUser?.accountId],
  );

  if (!staffUser) return null;

  return (
    <div className={STAFF_PAGE_CONTAINER_PADDED}>
      <MyClassesPageContent
        search=""
        classes={classes}
        loading={loading}
        loadError={loadError}
        showPageHeader={false}
        staffCoachDetail={staffCoachDetail}
        disciplineColorById={disciplineColorById}
        emptyAllMessage="You are not assigned to any classes yet."
        emptyBrowseAction={{
          label: 'Browse class schedule',
          onClick: () => navigate('/staff-class-schedule'),
        }}
      />
    </div>
  );
}
