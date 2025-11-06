// Simple theme state with localStorage persistence and <html> class toggle
import { ref } from 'vue';

const STORAGE_KEY = 'theme'; // 'light' | 'dark'
const isDark = ref(false);

function applyTheme(dark: boolean) {
  const root = document.documentElement;
  if (dark) root.classList.add('dark');
  else root.classList.remove('dark');
}

function detectDefaultDark(): boolean {
  try {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

export function useTheme() {
  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const dark = saved === 'dark' ? true : saved === 'light' ? false : detectDefaultDark();
    isDark.value = dark;
    applyTheme(dark);
  }

  function setDark(dark: boolean) {
    isDark.value = dark;
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
    applyTheme(dark);
  }

  function toggle() {
    setDark(!isDark.value);
  }

  return { isDark, init, setDark, toggle };
}


