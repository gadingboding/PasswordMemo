import {type ClassValue, clsx} from "clsx"
import {twMerge} from "tailwind-merge"
import {WebDAVConfig} from "password-memo-core";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getEmptyWebdavConfig(): WebDAVConfig {
  return {
    url: '',
    username: '',
    password: '',
    path: '/PasswordMemo/vault.json',
  }
}