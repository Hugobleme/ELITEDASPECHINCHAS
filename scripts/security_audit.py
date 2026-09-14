"""
Script de auditoria de segurança e integridade do código.
Executado localmente e na etapa de CI do GitHub Actions.
Verifica:
1. Ausência de arquivos .env e .env.local
2. Ausência de arquivos de sessão do Telethon (*.session)
3. Ausência de chaves privadas criptográficas (PEM/RSA)
4. Ausência de credenciais administrativas ou senhas expostas (admin123, NEXT_PUBLIC_ADMIN_PASSWORD)
"""
import os
import sys


def run_security_audit():
    print("=== 1. Verificando ausência de arquivos .env e .env.local ===")
    is_ci = os.getenv("CI") == "true"
    for env_file in [".env", ".env.local"]:
        # Se for no CI, não pode existir no runner
        if is_ci and os.path.exists(env_file):
            print(f"[-] FALHA DE SEGURANÇA: Arquivo {env_file} detectado no runner de CI!", file=sys.stderr)
            sys.exit(1)

    # Em qualquer ambiente, não pode estar rastreado no Git
    import subprocess
    tracked = subprocess.check_output(["git", "ls-files", ".env", ".env.local"], text=True).strip()
    if tracked:
        print(f"[-] FALHA DE SEGURANÇA: Arquivo de ambiente rastreado no Git: {tracked}!", file=sys.stderr)
        sys.exit(1)
    print("  [OK] Nenhum arquivo .env ou .env.local rastreado ou indevido")

    print("\n=== 2. Verificando ausência de arquivos de sessão Telethon (.session) ===")
    ignored_dirs = {".git", "node_modules", ".next", ".pytest_cache", ".system_generated"}
    for root, dirs, files in os.walk("."):
        dirs[:] = [d for d in dirs if d not in ignored_dirs]
        for file in files:
            if file.endswith(".session") or file.endswith(".session-journal"):
                print(f"[-] FALHA DE SEGURANÇA: Arquivo de sessão Telethon detectado: {file}", file=sys.stderr)
                sys.exit(1)
    print("  [OK] Nenhum arquivo .session encontrado")

    print("\n=== 3. Verificando ausência de chaves privadas e credenciais proibidas ===")
    forbidden_tokens = ["admin123", "NEXT_PUBLIC_ADMIN_PASSWORD"]
    private_key_pattern = "-----BEGIN"
    private_key_pattern_end = "PRIVATE KEY-----"

    ignored_files = {
        "scripts/security_audit.py",
    }

    for root, dirs, files in os.walk("."):
        dirs[:] = [d for d in dirs if d not in ignored_dirs]
        for file in files:
            filepath = os.path.normpath(os.path.join(root, file)).replace("\\", "/")
            if filepath in ignored_files or filepath.startswith(".github/"):
                continue

            try:
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()

                    if private_key_pattern in content and private_key_pattern_end in content:
                        print(f"[-] FALHA DE SEGURANÇA: Chave privada detectada em {filepath}!", file=sys.stderr)
                        sys.exit(1)

                    for token in forbidden_tokens:
                        if token in content:
                            print(f"[-] FALHA DE SEGURANÇA: Padrão não permitido detectado em {filepath}!", file=sys.stderr)
                            sys.exit(1)
            except Exception:
                pass

    print("  [OK] Nenhuma chave privada ou padrão proibido detectado")
    print("\n[SUCCESS] Auditoria de segurança aprovada: código 100% em conformidade!")


if __name__ == "__main__":
    run_security_audit()
