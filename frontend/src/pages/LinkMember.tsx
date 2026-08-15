import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../auth/authFetch';
import {
  clearMemberLinkToken,
  getMemberLinkToken,
} from '../auth/memberLinkToken';

type LinkState = 'ready' | 'submitting' | 'success' | 'error';

function LinkMember() {
  const navigate = useNavigate();
  const [token] = useState(getMemberLinkToken);
  const [state, setState] = useState<LinkState>('ready');
  const [message, setMessage] = useState<string | null>(null);

  async function connectAccount() {
    if (!token || state === 'submitting') {
      return;
    }

    setState('submitting');
    setMessage(null);

    try {
      const response = await authFetch('/api/members/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;

        throw new Error(body?.message ?? 'Could not connect the account');
      }

      clearMemberLinkToken();
      setState('success');
      setMessage('Your Keycloak account is now connected to your member.');
    } catch (error) {
      setState('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not connect the account',
      );
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-800 p-8 text-center shadow-2xl">
        <h1 className="text-3xl font-bold text-blue-400">
          Connect member account
        </h1>

        {!token && (
          <p className="mt-5 text-red-300">
            This member link is missing or has already been used in this
            browser.
          </p>
        )}

        {token && state !== 'success' && (
          <>
            <p className="mt-5 text-slate-300">
              Connect the currently logged-in Keycloak account to the member
              associated with this invitation?
            </p>
            <button
              type="button"
              disabled={state === 'submitting'}
              onClick={connectAccount}
              className="mt-8 w-full rounded-2xl bg-blue-600 py-4 text-lg font-bold transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {state === 'submitting' ? 'Connecting…' : 'Connect account'}
            </button>
          </>
        )}

        {message && (
          <p
            className={`mt-5 ${
              state === 'success' ? 'text-green-300' : 'text-red-300'
            }`}
          >
            {message}
          </p>
        )}

        {state === 'success' && (
          <button
            type="button"
            onClick={() => navigate('/profile', { replace: true })}
            className="mt-8 w-full rounded-2xl bg-blue-600 py-4 text-lg font-bold transition hover:bg-blue-700"
          >
            Continue to profile
          </button>
        )}
      </section>
    </main>
  );
}

export default LinkMember;
