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

    assert 'https://bob.ibm.com/download/bobshell.sh' in api
    assert 'bobquest-runtime-api' in api and 'start' in api
    assert 'pnpm --filter bobquest-runtime-api build' in api
    assert 'BOBSHELL_API_KEY' not in web, 'web image must not require Bob Shell credentials'
    assert 'bobquest-runtime-config.js' in web
    assert 'bobquest-runtime-config.js' in index
    assert 'window.__BOBQUEST_CONFIG__?.runtimeApiUrl' in client
    assert 'Dockerfile.railway-api' in doc
    assert 'Dockerfile.railway-web' in doc

if __name__ == '__main__':
    main()
