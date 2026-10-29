// Crea el certificado https para probar el sistema desde el celular
// (npm run certificado). Es "autofirmado": lo genera esta computadora y NO se
// instala nada en Windows; el navegador avisa "conexión no privada" la primera
// vez y se acepta con "Avanzado > Continuar".
// Incluye localhost y las IP actuales de la PC: si la IP cambia (otra red WiFi),
// vuelve a ejecutar este comando.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { join } from 'node:path';

const carpeta = join(process.cwd(), 'certificados');
mkdirSync(carpeta, { recursive: true });

const ips = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i && i.family === 'IPv4' && !i.internal && !i.address.startsWith('169.254.'))
  .map((i) => i.address);

const nombres = ['DNS:localhost', 'IP:127.0.0.1', ...ips.map((ip) => `IP:${ip}`)];

// OpenSSL viene con Git para Windows; si no esta en el PATH se busca ahi.
const candidatos = [
  'openssl',
  'C:\\Program Files\\Git\\usr\\bin\\openssl.exe',
  'C:\\Program Files\\Git\\mingw64\\bin\\openssl.exe',
];
const openssl = candidatos.find((c) => {
  try {
    execFileSync(c, ['version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
});
if (!openssl) {
  console.error('No se encontró OpenSSL. Instala Git para Windows (trae OpenSSL) y vuelve a intentar.');
  process.exit(1);
}

const config = join(carpeta, 'openssl.cnf');
writeFileSync(
  config,
  [
    '[req]',
    'distinguished_name = dn',
    'x509_extensions = ext',
    'prompt = no',
    '[dn]',
    'CN = Cholets Turistico El Alto (desarrollo)',
    '[ext]',
    `subjectAltName = ${nombres.join(', ')}`,
    'basicConstraints = critical, CA:FALSE',
    'keyUsage = critical, digitalSignature, keyEncipherment',
    'extendedKeyUsage = serverAuth',
  ].join('\n'),
);

execFileSync(openssl, [
  'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-sha256', '-days', '825',
  '-keyout', join(carpeta, 'clave.pem'),
  '-out', join(carpeta, 'certificado.pem'),
  '-config', config,
], { stdio: 'inherit' });
rmSync(config, { force: true });

console.log('\nCertificado creado en certificados/ para:');
console.log('  https://localhost:3443');
for (const ip of ips) console.log(`  https://${ip}:3443`);
console.log('\nAhora ejecuta:  npm run dev:https');
if (!existsSync(join(carpeta, 'clave.pem'))) process.exit(1);
