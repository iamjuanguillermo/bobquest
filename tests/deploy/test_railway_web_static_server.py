from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def main():
    dockerfile = (ROOT / 'Dockerfile.railway-web').read_text()
    server = (ROOT / 'scripts' / 'serve-spa.mjs').read_text()

    assert 'vite preview' not in dockerfile, 'Railway web must not use Vite preview; it blocks Railway hosts via allowedHosts'
    assert 'node scripts/serve-spa.mjs' in dockerfile, 'Railway web must use the static SPA server'
    assert 'createServer' in server, 'static server must use Node HTTP server'
    assert "apps/web/dist/spa" in server, 'static server must serve Quasar SPA build'
    assert "sendFile(res, join(root, 'index.html'))" in server, 'SPA server must fallback to index.html for history mode routes'

if __name__ == '__main__':
    main()
