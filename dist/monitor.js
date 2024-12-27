import { statSync } from "fs";
export function getFileSize(filePath) {
    const stats = statSync(filePath);
    const sizeInBytes = stats.size;
    const units = ["B", "KB", "MB", "GB", "TB"];
    let index = 0;
    let size = sizeInBytes;
    while (size >= 1024 && index < units.length - 1) {
        size /= 1024;
        index++;
    }
    return `${size} ${units[index]}`;
}
