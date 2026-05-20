from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def read(path: str) -> str:
    return (ROOT / path).read_text()

def main():
    api = read('Dockerfile.railway-api')
    web = read('Dockerfile.railway-web')
    index = read('apps/web/index.html')
    client = read('apps/web/src/api/runtimeClient.ts')
    doc = read('docs/railway_two_service_deploy.md')
    installer = read('scripts/install-bob-shell-from-local-tgz.sh')
    checksums = read('bob-download/SHA256SUMS.txt')

    assert 'https://bob.ibm.com/download/bobshell.sh' not in api, 'Railway API must not fetch Bob Shell installer externally'
    assert 'ghcr.io/iamjuanguillermo/bobquest-bob-shell-base' not in api, 'Railway API must build from repo-local installer, not GHCR base'
    assert './scripts/install-bob-shell-from-local-tgz.sh ./bob-download' in api
    assert 'bob-download' in api
    assert 'BOBSHELL_COMMAND=bob' in api
    assert 'BOBSHELL_ANALYZE_ARGS=--auth-method,api-key' in api
    assert 'BOBSHELL_EVALUATE_ARGS=--auth-method,api-key' in api
    assert 'bobquest-runtime-api' in api and 'start' in api
    assert 'pnpm --filter bobquest-runtime-api build' in api
    assert 'BOBSHELL_API_KEY' not in web, 'web image must not require Bob Shell credentials'
    assert 'bobquest-runtime-config.js' in web
    assert 'bobquest-runtime-config.js' in index
    assert 'window.__BOBQUEST_CONFIG__?.runtimeApiUrl' in client
    assert 'Dockerfile.railway-api' in doc
    assert 'Dockerfile.railway-web' in doc
    assert 'local bob-download tarball' in doc
    assert 'sha256sum -c SHA256SUMS.txt' in installer
    assert 'bobshell-1.0.4.tgz' in checksums

if __name__ == '__main__':
    main()
