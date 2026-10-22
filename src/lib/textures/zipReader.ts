import { crc32, inflateRawSync } from 'node:zlib';

/**
 * Minimal ZIP reader for Minecraft client jars (stored and deflated entries, no ZIP64, no
 * encryption). Every extracted entry is checked against its size and CRC-32.
 */

export class ZipFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZipFormatError';
  }
}

interface ZipEntry {
  name: string;
  method: number;
  crc: number;
  compressedSize: number;
  size: number;
  localHeaderOffset: number;
}

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;

export class ZipArchive {
  private constructor(
    private readonly data: Buffer,
    private readonly byName: Map<string, ZipEntry>,
  ) {}

  static fromBuffer(data: Buffer): ZipArchive {
    // End of central directory: 22 bytes plus an optional comment of up to 65535 bytes.
    let eocd = -1;
    for (let i = data.length - 22; i >= Math.max(0, data.length - 22 - 0xffff); i--) {
      if (data.readUInt32LE(i) === EOCD_SIGNATURE) {
        eocd = i;
        break;
      }
    }
    if (eocd === -1) throw new ZipFormatError('Keine ZIP-/JAR-Datei (Verzeichnisende fehlt)');
    const total = data.readUInt16LE(eocd + 10);
    const cdOffset = data.readUInt32LE(eocd + 16);
    if (total === 0xffff || cdOffset === 0xffffffff) throw new ZipFormatError('ZIP64-Archive werden nicht unterstützt');

    const byName = new Map<string, ZipEntry>();
    let p = cdOffset;
    for (let n = 0; n < total; n++) {
      if (p + 46 > data.length || data.readUInt32LE(p) !== CENTRAL_SIGNATURE) {
        throw new ZipFormatError(`Beschädigtes ZIP-Verzeichnis (Eintrag ${n})`);
      }
      const nameLength = data.readUInt16LE(p + 28);
      const extraLength = data.readUInt16LE(p + 30);
      const commentLength = data.readUInt16LE(p + 32);
      const name = data.toString('utf8', p + 46, p + 46 + nameLength);
      byName.set(name, {
        name,
        method: data.readUInt16LE(p + 10),
        crc: data.readUInt32LE(p + 16),
        compressedSize: data.readUInt32LE(p + 20),
        size: data.readUInt32LE(p + 24),
        localHeaderOffset: data.readUInt32LE(p + 42),
      });
      p += 46 + nameLength + extraLength + commentLength;
    }
    return new ZipArchive(data, byName);
  }

  names(): string[] {
    return [...this.byName.keys()];
  }

  has(name: string): boolean {
    return this.byName.has(name);
  }

  read(name: string): Buffer | null {
    const entry = this.byName.get(name);
    if (!entry) return null;
    const p = entry.localHeaderOffset;
    if (p + 30 > this.data.length || this.data.readUInt32LE(p) !== LOCAL_SIGNATURE) {
      throw new ZipFormatError(`Beschädigter Eintrag ${name}`);
    }
    const start = p + 30 + this.data.readUInt16LE(p + 26) + this.data.readUInt16LE(p + 28);
    const raw = this.data.subarray(start, start + entry.compressedSize);
    let out: Buffer;
    if (entry.method === 0) out = Buffer.from(raw);
    else if (entry.method === 8) out = inflateRawSync(raw);
    else throw new ZipFormatError(`Kompressionsverfahren ${entry.method} wird nicht unterstützt (${name})`);
    if (out.length !== entry.size || crc32(out) !== entry.crc) throw new ZipFormatError(`Prüfsumme falsch: ${name}`);
    return out;
  }

  readText(name: string): string | null {
    return this.read(name)?.toString('utf8') ?? null;
  }
}
