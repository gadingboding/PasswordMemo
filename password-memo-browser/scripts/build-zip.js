import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 获取版本号，优先使用环境变量，否则从package.json读取
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const version = process.env.VERSION || packageJson.version;

// 构建输出目录
const buildDir = path.join(projectRoot, 'dist');
// release目录
const releaseDir = path.join(projectRoot, 'release');
// zip文件名
const zipFileName = `password-memo-browser-${version}.zip`;
const zipFilePath = path.join(releaseDir, zipFileName);


if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true });
}


if (!fs.existsSync(buildDir)) {
  console.error(`Build directory does not exist: ${buildDir}`);
  console.error('Please run pnpm build first');
  process.exit(1);
}

console.log(`Creating zip package: ${zipFileName}`);

const output = fs.createWriteStream(zipFilePath);
const archive = archiver('zip', {
  zlib: { level: 9 }
});

// 监听错误
output.on('close', () => {
  console.log(`Zip package created successfully: ${zipFilePath}`);
  console.log(`File size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
});

archive.on('error', (err) => {
  throw err;
});

// 将输出流连接到文件
archive.pipe(output);

// 添加构建目录中的所有文件到zip
archive.directory(buildDir, false);

// 完成归档
await archive.finalize();
