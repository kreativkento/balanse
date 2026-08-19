import { createRoot } from 'react-dom/client';
import './styles/index.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function ConfigError() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        fontFamily: 'system-ui, sans-serif',
        background: '#F8F3E8',
        color: '#1E2A35',
      }}
    >
      <div style={{ maxWidth: '32rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Site configuration required</h1>
        <p style={{ lineHeight: 1.6, marginBottom: '1rem' }}>
          Supabase environment variables were not available when this site was built. Add them in
          Cloudflare Pages, then trigger a new deployment.
        </p>
        <ol style={{ lineHeight: 1.8, paddingLeft: '1.25rem' }}>
          <li>
            Cloudflare → your Pages project → <strong>Settings → Environment variables</strong>
          </li>
          <li>
            Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> for{' '}
            <strong>Production</strong>
          </li>
          <li>
            Go to <strong>Deployments</strong> → <strong>Retry deployment</strong>
          </li>
        </ol>
        <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#8A7E6E' }}>
          Vite bakes these values in at build time — saving variables alone is not enough; you must
          redeploy after adding them.
        </p>
      </div>
    </div>
  );
}

async function bootstrap() {
  const root = document.getElementById('root');
  if (!root) return;

  if (!supabaseUrl || !supabaseAnonKey) {
    createRoot(root).render(<ConfigError />);
    return;
  }

  const { default: App } = await import('./app/App.tsx');
  createRoot(root).render(<App />);
}

void bootstrap();
