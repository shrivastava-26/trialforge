import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import ScienceIcon from '@mui/icons-material/Science';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import PublicIcon from '@mui/icons-material/Public';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatusChip } from '../../components/StatusChip';
import { DashboardSkeleton } from '../../components/skeletons';
import { useStudies } from '../../hooks/useStudies';
import { useSites } from '../../hooks/useSites';
import { useExaminers } from '../../hooks/useExaminers';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

function StatCard({ label, value, sub, icon, color }: { label: string; value: number; sub: string; icon: React.ReactNode; color: string }) {
  return (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 2, height: '100%' }}>
      <Box sx={{ width: 52, height: 52, borderRadius: 2, bgcolor: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>{icon}</Box>
      <Box>
        <Typography sx={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.1 }} color="text.primary">{value}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }} color="text.primary">{label}</Typography>
        <Typography variant="caption" color="text.secondary">{sub}</Typography>
      </Box>
    </Paper>
  );
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }} color="text.primary">{title}</Typography>
      {count !== undefined && <Chip label={count} size="small" sx={{ bgcolor: '#e2e8f0', fontWeight: 700, fontSize: '0.72rem' }} />}
    </Box>
  );
}

export function AdminDashboardPage() {
  const { studies, loading: studiesLoading } = useStudies(1, 1000);
  const { sites, loading: sitesLoading } = useSites(1, 1000);
  const { examiners, loading: examinersLoading } = useExaminers(1, 1000);

  const isLoading = studiesLoading || sitesLoading || examinersLoading;

  const activeStudies = studies.filter((s) => s.status === 'Active').length;
  const plannedStudies = studies.filter((s) => s.status === 'Planned').length;
  const completedStudies = studies.filter((s) => s.status === 'Completed').length;
  const activeSites = sites.filter((s) => s.status === 'Active').length;
  const activeExaminers = examiners.filter((e) => e.status === 'Active').length;

  const statusCounts = studies.reduce<Record<string, number>>((acc, s) => { acc[s.status] = (acc[s.status] ?? 0) + 1; return acc; }, {});
  const phaseCounts = studies.reduce<Record<string, number>>((acc, s) => { acc[s.phase] = (acc[s.phase] ?? 0) + 1; return acc; }, {});
  const specialtyCounts = examiners.reduce<Record<string, number>>((acc, e) => { acc[e.specialty] = (acc[e.specialty] ?? 0) + 1; return acc; }, {});
  const countryCounts = sites.reduce<Record<string, number>>((acc, s) => { acc[s.country] = (acc[s.country] ?? 0) + 1; return acc; }, {});
  const topCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const recentStudies = [...studies].slice(0, 5);

  const doughnutData = { labels: Object.keys(statusCounts), datasets: [{ data: Object.values(statusCounts), backgroundColor: ['#0f766e', '#d97706', '#64748b', '#dc2626'], borderWidth: 2, borderColor: '#fff' }] };
  const doughnutOptions = { plugins: { legend: { position: 'bottom' as const, labels: { font: { family: 'Poppins', size: 12 }, padding: 12 } } }, cutout: '65%' };
  const barData = { labels: Object.keys(phaseCounts), datasets: [{ label: 'Studies', data: Object.values(phaseCounts), backgroundColor: ['#0f766e', '#14b8a6', '#0369a1', '#7c3aed'], borderRadius: 6 }] };
  const barOptions = { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, font: { family: 'Poppins' } } }, x: { ticks: { font: { family: 'Poppins' } } } } };
  const specialtyBar = { labels: Object.keys(specialtyCounts), datasets: [{ label: 'Examiners', data: Object.values(specialtyCounts), backgroundColor: '#0369a1', borderRadius: 4 }] };
  const specialtyOptions = { indexAxis: 'y' as const, responsive: true, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1, font: { family: 'Poppins' } } }, y: { ticks: { font: { family: 'Poppins', size: 11 } } } } };

  return (
    <AdminLayout>
      {isLoading ? <DashboardSkeleton /> : (
        <Box>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }} color="text.primary">Dashboard</Typography>
            <Typography variant="body2" color="text.secondary">Clinical trial portfolio overview.</Typography>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            <Box sx={{ flex: '1 1 200px' }}><StatCard label="Total Studies" value={studies.length} sub={`${activeStudies} active · ${plannedStudies} planned`} icon={<ScienceIcon />} color="#0f766e" /></Box>
            <Box sx={{ flex: '1 1 200px' }}><StatCard label="Completed Studies" value={completedStudies} sub="Successfully concluded" icon={<AssignmentTurnedInIcon />} color="#16a34a" /></Box>
            <Box sx={{ flex: '1 1 200px' }}><StatCard label="Active Sites" value={activeSites} sub={`of ${sites.length} total`} icon={<LocationOnIcon />} color="#0369a1" /></Box>
            <Box sx={{ flex: '1 1 200px' }}><StatCard label="Active Examiners" value={activeExaminers} sub={`of ${examiners.length} total`} icon={<PersonSearchIcon />} color="#7c3aed" /></Box>
          </Box>

          <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, border: '1px solid #e2e8f0', display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mr: 1 }}>Study Status:</Typography>
            {Object.entries(statusCounts).map(([status, count]) => (
              <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <StatusChip status={status} />
                <Typography variant="body2" sx={{ fontWeight: 700 }} color="text.primary">{count}</Typography>
              </Box>
            ))}
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}><TaskAltIcon sx={{ fontSize: 16, color: '#16a34a' }} /><Typography variant="body2" color="text.secondary">{activeSites} active sites</Typography></Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}><PendingActionsIcon sx={{ fontSize: 16, color: '#d97706' }} /><Typography variant="body2" color="text.secondary">{sites.length - activeSites} closed/planned sites</Typography></Box>
          </Paper>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            <Box sx={{ flex: '1 1 220px', minWidth: 0 }}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <SectionHeader title="Studies by Status" />
                <Box sx={{ position: 'relative', height: 260 }}><Doughnut data={doughnutData} options={{ ...doughnutOptions, maintainAspectRatio: false }} /></Box>
              </Paper>
            </Box>
            <Box sx={{ flex: '1 1 220px', minWidth: 0 }}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <SectionHeader title="Studies by Phase" />
                <Box sx={{ position: 'relative', height: 260 }}><Bar data={barData} options={{ ...barOptions, maintainAspectRatio: false }} /></Box>
              </Paper>
            </Box>
            <Box sx={{ flex: '1 1 220px', minWidth: 0 }}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <SectionHeader title="Examiners by Specialty" />
                <Box sx={{ position: 'relative', height: 260 }}><Bar data={specialtyBar} options={{ ...specialtyOptions, maintainAspectRatio: false }} /></Box>
              </Paper>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flex: '2 1 400px', minWidth: 0 }}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <SectionHeader title="Recent Studies" count={recentStudies.length} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {recentStudies.map((study) => (
                    <Box key={study.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.2, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }} color="text.primary" noWrap>{study.title}</Typography>
                        <Typography variant="caption" color="text.secondary">{study.protocolId} · {study.sponsor} · {study.phase}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2, flexShrink: 0 }}>
                        <Typography variant="caption" color="text.disabled">{study.startDate}</Typography>
                        <StatusChip status={study.status} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Box>
            <Box sx={{ flex: '1 1 240px', minWidth: 0 }}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #e2e8f0', height: '100%' }}>
                <SectionHeader title="Sites by Country" count={topCountries.length} />
                <List dense disablePadding>
                  {topCountries.map(([country, count]) => (
                    <ListItem key={country} disablePadding sx={{ mb: 1 }}>
                      <ListItemAvatar sx={{ minWidth: 40 }}><Avatar sx={{ width: 32, height: 32, bgcolor: '#e0f2f1', color: '#0f766e' }}><PublicIcon sx={{ fontSize: 16 }} /></Avatar></ListItemAvatar>
                      <ListItemText primary={<Typography variant="body2" sx={{ fontWeight: 600 }} color="text.primary">{country}</Typography>} secondary={<Typography variant="caption" color="text.secondary">{count} site{count > 1 ? 's' : ''}</Typography>} />
                      <Box sx={{ minWidth: 28, height: 28, borderRadius: '50%', bgcolor: '#0f766e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>{count}</Box>
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Box>
          </Box>
        </Box>
      )}
    </AdminLayout>
  );
}
