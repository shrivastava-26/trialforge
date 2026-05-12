import { useMutation, useApolloClient } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { LOGIN_MUTATION, ME_QUERY } from '../services/authService';
import { parseGqlError } from '../utils/gqlErrors';
import type { ApolloError } from '@apollo/client';

export function useLogin() {
  const [loginMutation, { loading }] = useMutation(LOGIN_MUTATION);
  const client = useApolloClient();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  async function submitLogin(email: string, password: string): Promise<string | null> {
    try {
      const { data } = await loginMutation({ variables: { email, password } });
      await client.refetchQueries({ include: [ME_QUERY] });
      const role = data?.login?.user?.role;
      enqueueSnackbar('Signed in successfully.', { variant: 'success' });
      navigate(role === 'ADMIN' ? '/admin/dashboard' : '/viewer/dashboard');
      return null;
    } catch (err: unknown) {
      // 429 arrives as a networkError, not a graphQLError — handle it explicitly
      const networkStatus = ((err as ApolloError)?.networkError as { statusCode?: number } | null)?.statusCode;
      if (networkStatus === 429) {
        return 'Too many sign-in attempts for this account. Please wait 15 minutes and try again.';
      }
      const { message } = parseGqlError(err);
      return message;
    }
  }

  return { submitLogin, loading };
}
