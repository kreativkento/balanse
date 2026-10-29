import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Bookmark } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MemberPageShell } from '../components/layout/MemberPageShell';
import { MyClassesPageContent } from '../components/classes/MyClassesPageContent';
import {
  fetchMemberEnrolledClasses,
  type MemberEnrolledClassItem,
} from '../../lib/class-service';
import {
  fetchDisciplinesForPublic,
  statusColorFromHue,
} from '../../lib/discipline-service';
import { normalizeDisciplineColorHex } from '../../lib/default-assets';

export default function MemberClasses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [classes, setClasses] = useState<MemberEnrolledClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [disciplineColorById, setDisciplineColorById] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    if (!user) {
      setClasses([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    void (async () => {
      const [classesResult, disciplinesResult] = await Promise.all([
        fetchMemberEnrolledClasses(),
        fetchDisciplinesForPublic(),
      ]);
      if (cancelled) return;
      if (classesResult.error) {
        setLoadError(classesResult.error);
        setClasses([]);
      } else {
        setClasses(classesResult.data);
      }
      if (!disciplinesResult.error) {
        setDisciplineColorById(
          new Map(
            (disciplinesResult.data ?? []).map((d) => [
              d.id,
              normalizeDisciplineColorHex(d.colorHex) || statusColorFromHue(d.status.hue),
            ]),
          ),
        );
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  return (
    <MemberPageShell
      searchPlaceholder="Search my classes…"
      onSearch={setSearch}
    >
      <MyClassesPageContent
        search={search}
        classes={classes}
        loading={loading}
        loadError={loadError}
        showPageHeader={false}
        primaryAction={{
          label: 'Browse schedule',
          icon: <Bookmark size={14} />,
          onClick: () => navigate('/class-schedule'),
        }}
        emptyAllMessage="You are not enrolled in any classes yet."
        emptyBrowseAction={{
          label: 'Browse class schedule',
          onClick: () => navigate('/class-schedule'),
        }}
        disciplineColorById={disciplineColorById}
      />
    </MemberPageShell>
  );
}
