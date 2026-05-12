import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import ScienceIcon from '@mui/icons-material/Science';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppFooter } from '../components/AppFooter';
import { useLogin } from '../hooks/useLogin';
import { loginSchema, LoginFormValues } from '../validation';

export function LoginPage() {
  const { submitLogin, loading } = useLogin();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: 'viewer@test.com', password: 'password123' },
  });

  async function onSubmit(values: LoginFormValues) {
    const errMsg = await submitLogin(values.email, values.password);
    if (errMsg) {
      setError('root', { message: errMsg });
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Card sx={{ width: '100%', maxWidth: 400, boxShadow: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <ScienceIcon color="primary" fontSize="large" />
              <Typography variant="h5" sx={{ fontWeight: 700 }} color="primary">
                SNA Clinical Studies
              </Typography>
            </Box>

            <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                size="small"
                autoComplete="email"
                {...register('email')}
                error={!!errors.email}
                helperText={errors.email?.message}
              />
              <TextField
                label="Password"
                type="password"
                fullWidth
                size="small"
                autoComplete="current-password"
                {...register('password')}
                error={!!errors.password}
                helperText={errors.password?.message}
              />

              {errors.root && (
                <Alert severity="error" sx={{ py: 0.5 }}>
                  {errors.root.message}
                </Alert>
              )}

              <Button type="submit" variant="contained" fullWidth disabled={loading} sx={{ mt: 1, py: 1.2 }} data-testid="login-submit">
                {loading ? 'Signing in…' : 'Sign In'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
      <AppFooter />
    </Box>
  );
}
