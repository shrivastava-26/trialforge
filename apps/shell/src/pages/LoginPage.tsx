import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Button, TextField, Typography, Paper } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useAuth } from '../auth';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Required'),
});
type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const { login } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      enqueueSnackbar(msg, { variant: 'error' });
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <Paper sx={{ p: 4, width: 360 }}>
        <Typography variant="h5" mb={3} textAlign="center">
          TrialForge
        </Typography>
        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField
            label="Email"
            fullWidth
            margin="normal"
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            margin="normal"
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mt: 2 }}
            disabled={isSubmitting}
          >
            Sign In
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
