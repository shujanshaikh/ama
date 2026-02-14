import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PATH_SEPARATOR_REGEX = /[\\/]+/;

export function getPathBasename(pathValue?: string): string {
  if (!pathValue) return "";
  const parts = pathValue.split(PATH_SEPARATOR_REGEX).filter(Boolean);
  return parts[parts.length - 1] ?? pathValue;
}

export function getPathDirectory(pathValue: string): string {
  const normalized = pathValue.replace(/\\/g, "/");
  const lastSeparatorIndex = normalized.lastIndexOf("/");
  if (lastSeparatorIndex <= 0) return "";
  return normalized.slice(0, lastSeparatorIndex);
}

export function getPathTail(pathValue: string, segmentCount = 2): string {
  const parts = pathValue.split(PATH_SEPARATOR_REGEX).filter(Boolean);
  if (parts.length === 0) return pathValue;
  return parts.slice(-segmentCount).join("/");
}
