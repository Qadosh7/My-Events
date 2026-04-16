import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function handleNetworkError(error: any): string {
  const message = error?.message || String(error);
  if (message.includes('fetch') || message.includes('NetworkError')) {
    return 'Erro de conexão: Verifique se o Supabase está configurado corretamente nos segredos.';
  }
  return message;
}
