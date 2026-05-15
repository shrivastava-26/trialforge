import { Box, Card, CardActionArea, CardContent, Typography, Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const modules = [
  { name: 'Identity', route: '/admin/home' },
  { name: 'Site Network', route: '/site/home' },
  { name: 'Patient Registry', route: '/site/home' },
  { name: 'Visit Scheduling', route: '/site/home' },
  { name: 'Form Builder', route: '/data/home' },
  { name: 'EDC', route: '/data/home' },
  { name: 'Query Management', route: '/monitor/home' },
  { name: 'Document Management', route: '/audit/home' },
  { name: 'Reporting', route: '/dashboard' },
];

export function ModulesPage() {
  const navigate = useNavigate();

  return (
    <Box p={3}>
      <Typography variant="h5" mb={3}>
        Modules
      </Typography>
      <Grid container spacing={2}>
        {modules.map((m) => (
          <Grid item xs={12} sm={6} md={4} key={m.name}>
            <Card>
              <CardActionArea onClick={() => navigate(m.route)}>
                <CardContent>
                  <Typography variant="h6">{m.name}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
