import { statSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, "prisma", "dev.db");

function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

function logDbSize(): void {
  try {
    const stats = statSync(DB_PATH);
    const sizeInBytes = stats.size;
    const formattedSize = formatFileSize(sizeInBytes);
    console.log(`${formattedSize}`);
  } catch (error) {
    console.error("Error checking database size:", error);
  }
}

const INTERVAL = 3000;
setInterval(logDbSize, INTERVAL);

logDbSize();
