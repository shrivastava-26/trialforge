import { useState, useEffect, useRef, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLazyQuery } from '@apollo/client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import ScienceIcon from '@mui/icons-material/Science';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import AppsIcon from '@mui/icons-material/Apps';
import { StatusChip } from '../../components/StatusChip';
import { GLOBAL_SEARCH_QUERY } from '../../services/searchService';

// ── Types ──────────────────────────────────────────────────────────────────
type EntityType = 'All' | 'Study' | 'Site' | 'Examiner';

interface SearchPageProps {
  layout: (children: ReactNode) => ReactNode;
  baseRoute: '/admin' | '/viewer';
}

// ── Constants ──────────────────────────────────────────────────────────────
const STUDY_STATUSES = ['', 'Planned', 'Active', 'Completed'];
const STUDY_PHASES   = ['', 'Phase I', 'Phase II', 'Phase III', 'Phase IV'];
const EXAMINER_ROLES = ['', 'Principal Investigator', 'Sub-Investigator'];

// Minimum keyword length before firing a search
const MIN_KEYWORD_LENGTH = 2;
// Debounce delay in ms — 400ms is the industry standard
const DEBOUNCE_MS = 400;

// ── Result item types ──────────────────────────────────────────────────────
interface StudyResult  { id: string; protocolId: string; title: string; sponsor: string; phase: string; status: string; }
interface SiteResult   { id: string; siteCode: string; name: string; city: string; country: string; status: string; }
interface ExaminerResult { id: string; examinerCode: string; name: string; specialty: string; role: string; status: string; }

// ── Component ──────────────────────────────────────────────────────────────
export function SearchPage({ layout, baseRoute }: SearchPageProps) {
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────
  const [keyword, setKeyword]         = useState('');
  const [entityType, setEntityType]   = useState<EntityType>('All');
  const [studyStatus, setStudyStatus] = useState('');
  const [studyPhase, setStudyPhase]   = useState('');
  const [siteCity, setSiteCity]       = useState('');
  const [siteCountry, setSiteCountry] = useState('');
  const [examinerRole, setExaminerRole] = useState('');

  // Track the keyword that was actually searched so results label is accurate
  const [searchedKeyword, setSearchedKeyword] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [runSearch, { data, loading, error, called }] = useLazyQuery(GLOBAL_SEARCH_QUERY, {
    fetchPolicy: 'network-only',
  });

  // ── Derived ────────────────────────────────────────────────────────────
  const results    = data?.globalSearch;
  const studyCount = results?.studies?.length ?? 0;
  const siteCount  = results?.sites?.length ?? 0;
  const examCount  = results?.examiners?.length ?? 0;
  const totalCount = studyCount + siteCount + examCount;

  // Only show results that match the selected entity type
  const showStudies   = entityType === 'All' || entityType === 'Study';
  const showSites     = entityType === 'All' || entityType === 'Site';
  const showExaminers = entityType === 'All' || entityType === 'Examiner';

  // ── Derived: is at least one filter active? ─────────────────────────
  const hasActiveFilter =
    entityType !== 'All' ||
    !!studyStatus || !!studyPhase ||
    !!siteCity || !!siteCountry ||
    !!examinerRole;

  // ── Shared helper: build filters object and fire the query ────────────
  function fireSearch(kw: string) {
    const filters: Record<string, string> = {};
    if (entityType !== 'All') filters.entityType = entityType;
    if (studyStatus)  filters.studyStatus  = studyStatus;
    if (studyPhase)   filters.studyPhase   = studyPhase;
    if (siteCity)     filters.siteCity     = siteCity;
    if (siteCountry)  filters.siteCountry  = siteCountry;
    if (examinerRole) filters.examinerRole = examinerRole;

    // When keyword is empty (filter-only search), send '%%' which satisfies
    // the backend min(2) validation and matches all records via LIKE '%%%%'.
    setSearchedKeyword(kw || '');
    runSearch({
      variables: {
        keyword: kw || '%%',
        filters: Object.keys(filters).length ? filters : undefined,
      },
    });
  }

  // ── Auto-search with debounce ──────────────────────────────────────────
  // Rule 1: keyword typed  → debounce 400ms, require >= 2 chars
  // Rule 2: keyword empty + filter active → fire immediately
  // Rule 3: keyword empty + no filters   → stay idle
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = keyword.trim();

    if (trimmed.length === 0) {
      // Rule 2: filter-only search — fire immediately, no debounce
      if (hasActiveFilter) {
        fireSearch('');
      }
      // Rule 3: nothing to search
      return;
    }

    // Rule 1: keyword present — debounce and require min length
    if (trimmed.length < MIN_KEYWORD_LENGTH) return;

    debounceRef.current = setTimeout(() => {
      fireSearch(trimmed);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [keyword, entityType, studyStatus, studyPhase, siteCity, siteCountry, examinerRole]);

  // ── Reset entity-specific filters when entity type changes ────────────
  function handleEntityTypeChange(_: React.MouseEvent<HTMLElement>, value: EntityType | null) {
    if (!value) return; // ToggleButtonGroup requires at least one selected
    setEntityType(value);
    // Clear filters that don't apply to the new entity type
    if (value === 'Study')    { setSiteCity(''); setSiteCountry(''); setExaminerRole(''); }
    if (value === 'Site')     { setStudyStatus(''); setStudyPhase(''); setExaminerRole(''); }
    if (value === 'Examiner') { setStudyStatus(''); setStudyPhase(''); setSiteCity(''); setSiteCountry(''); }
    if (value === 'All')      { /* keep all filters */ }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return layout(
    <Box>
      {/* Page header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Search</Typography>
        <Typography variant="body2" color="text.secondary">
          Type to search — results update automatically as you type.
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>

        {/* ── Entity type toggle ── */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
            Search in
          </Typography>
          <ToggleButtonGroup
            value={entityType}
            exclusive
            onChange={handleEntityTypeChange}
            size="small"
            sx={{ flexWrap: 'wrap', gap: 0.5 }}
          >
            <ToggleButton value="All" sx={{ gap: 0.5, px: 2, textTransform: 'none', fontWeight: 600 }}>
              <AppsIcon fontSize="small" /> All
            </ToggleButton>
            <ToggleButton value="Study" sx={{ gap: 0.5, px: 2, textTransform: 'none', fontWeight: 600 }}>
              <ScienceIcon fontSize="small" /> Studies
            </ToggleButton>
            <ToggleButton value="Site" sx={{ gap: 0.5, px: 2, textTransform: 'none', fontWeight: 600 }}>
              <LocationOnIcon fontSize="small" /> Sites
            </ToggleButton>
            <ToggleButton value="Examiner" sx={{ gap: 0.5, px: 2, textTransform: 'none', fontWeight: 600 }}>
              <PersonSearchIcon fontSize="small" /> Examiners
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* ── Keyword input ── */}
        <TextField
          fullWidth
          size="small"
          placeholder={`Search ${entityType === 'All' ? 'studies, sites, and examiners' : entityType.toLowerCase() + 's'}…`}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  {loading
                    ? <CircularProgress size={16} />
                    : <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                  }
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: keyword.trim().length > 0 && keyword.trim().length < MIN_KEYWORD_LENGTH ? 0.5 : 2 }}
        />

        {/* Hint when keyword is too short */}
        {keyword.trim().length > 0 && keyword.trim().length < MIN_KEYWORD_LENGTH && (
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 2, pl: 0.5 }}>
            Type at least {MIN_KEYWORD_LENGTH} characters to search…
          </Typography>
        )}

        {/* ── Context-aware filters ── */}
        {(entityType === 'All' || entityType === 'Study') && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: (entityType === 'All') ? 1.5 : 0 }}>
            <TextField select size="small" label="Study Status" value={studyStatus}
              onChange={(e) => setStudyStatus(e.target.value)} sx={{ minWidth: 140 }}>
              {STUDY_STATUSES.map((s) => <MenuItem key={s} value={s}>{s || 'Any status'}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Study Phase" value={studyPhase}
              onChange={(e) => setStudyPhase(e.target.value)} sx={{ minWidth: 140 }}>
              {STUDY_PHASES.map((p) => <MenuItem key={p} value={p}>{p || 'Any phase'}</MenuItem>)}
            </TextField>
          </Box>
        )}

        {(entityType === 'All' || entityType === 'Site') && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: (entityType === 'All') ? 1.5 : 0 }}>
            <TextField size="small" label="Site City" value={siteCity}
              onChange={(e) => setSiteCity(e.target.value)} sx={{ minWidth: 130 }} />
            <TextField size="small" label="Site Country" value={siteCountry}
              onChange={(e) => setSiteCountry(e.target.value)} sx={{ minWidth: 130 }} />
          </Box>
        )}

        {(entityType === 'All' || entityType === 'Examiner') && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            <TextField select size="small" label="Examiner Role" value={examinerRole}
              onChange={(e) => setExaminerRole(e.target.value)} sx={{ minWidth: 200 }}>
              {EXAMINER_ROLES.map((r) => <MenuItem key={r} value={r}>{r || 'Any role'}</MenuItem>)}
            </TextField>
          </Box>
        )}
      </Paper>

      {/* ── Error ── */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>}

      {/* ── Results ── */}
      {called && !loading && results && (
        <Box>
          {/* Summary line */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {totalCount === 0
              ? searchedKeyword
                ? `No results for "${searchedKeyword}"`
                : 'No results match the selected filters'
              : searchedKeyword
                ? `${totalCount} result${totalCount !== 1 ? 's' : ''} for "${searchedKeyword}"`
                : `${totalCount} result${totalCount !== 1 ? 's' : ''} matching the selected filters`
            }
          </Typography>

          {/* Studies section */}
          {showStudies && studyCount > 0 && (
            <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <ScienceIcon fontSize="small" sx={{ color: '#0f766e' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Studies</Typography>
                <Chip label={studyCount} size="small" sx={{ bgcolor: '#e0f2f1', color: '#0f766e', fontWeight: 700 }} />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {results.studies.map((s: StudyResult) => (
                  <Box key={s.id} onClick={() => navigate(`${baseRoute}/studies/${s.id}`)}
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.2, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0', cursor: 'pointer', '&:hover': { bgcolor: '#f0fdfa', borderColor: '#99f6e4' } }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{s.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.protocolId} · {s.sponsor} · {s.phase}</Typography>
                    </Box>
                    <Box sx={{ ml: 2, flexShrink: 0 }}><StatusChip status={s.status} /></Box>
                  </Box>
                ))}
              </Box>
            </Paper>
          )}

          {/* Sites section */}
          {showSites && siteCount > 0 && (
            <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <LocationOnIcon fontSize="small" sx={{ color: '#0f766e' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Sites</Typography>
                <Chip label={siteCount} size="small" sx={{ bgcolor: '#e0f2f1', color: '#0f766e', fontWeight: 700 }} />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {results.sites.map((s: SiteResult) => (
                  <Box key={s.id} onClick={() => navigate(`${baseRoute}/sites/${s.id}`)}
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.2, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0', cursor: 'pointer', '&:hover': { bgcolor: '#f0fdfa', borderColor: '#99f6e4' } }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{s.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.siteCode} · {s.city}, {s.country}</Typography>
                    </Box>
                    <Box sx={{ ml: 2, flexShrink: 0 }}><StatusChip status={s.status} /></Box>
                  </Box>
                ))}
              </Box>
            </Paper>
          )}

          {/* Examiners section */}
          {showExaminers && examCount > 0 && (
            <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <PersonSearchIcon fontSize="small" sx={{ color: '#0f766e' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Examiners</Typography>
                <Chip label={examCount} size="small" sx={{ bgcolor: '#e0f2f1', color: '#0f766e', fontWeight: 700 }} />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {results.examiners.map((e: ExaminerResult) => (
                  <Box key={e.id} onClick={() => navigate(`${baseRoute}/examiners/${e.id}`)}
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.2, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0', cursor: 'pointer', '&:hover': { bgcolor: '#f0fdfa', borderColor: '#99f6e4' } }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{e.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{e.examinerCode} · {e.role} · {e.specialty}</Typography>
                    </Box>
                    <Box sx={{ ml: 2, flexShrink: 0 }}><StatusChip status={e.status} /></Box>
                  </Box>
                ))}
              </Box>
            </Paper>
          )}

          {/* Zero results */}
          {totalCount === 0 && (
            <Alert severity="info" icon={<SearchIcon />}>
              No {entityType === 'All' ? 'results' : entityType.toLowerCase() + 's'} found
              {searchedKeyword ? ` for "${searchedKeyword}"` : ' matching the selected filters'}.
              {entityType !== 'All' ? ' Try switching to "All" to search across all entities.' : ''}
            </Alert>
          )}
        </Box>
      )}

      {/* Idle state — no keyword and no filters active */}
      {!called && !loading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, color: 'text.disabled' }}>
          <SearchIcon sx={{ fontSize: 48, mb: 1.5, opacity: 0.3 }} />
          <Typography variant="body2">
            Type a keyword or select a filter to see results
          </Typography>
        </Box>
      )}
    </Box>
  );
}
