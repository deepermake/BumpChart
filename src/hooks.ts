import { DashboardState, bitable, dashboard } from '@lark-base-open/js-sdk';
import { useLayoutEffect, useState } from 'react';

function updateTheme(theme: string) {
  document.body.setAttribute('theme-mode', theme);
}

/** 跟随 Lark Base 主题变化 */
export function useTheme() {
  const [bgColor, setBgColor] = useState('#ffffff');
  const [theme, setTheme] = useState('light');

  useLayoutEffect(() => {
    dashboard.getTheme().then((res) => {
      setBgColor(res.chartBgColor);
      const mode = res.theme.toLocaleLowerCase();
      setTheme(mode);
      updateTheme(mode);
    });

    dashboard.onThemeChange((res) => {
      setBgColor(res.data.chartBgColor);
      const mode = res.data.theme.toLocaleLowerCase();
      setTheme(mode);
      updateTheme(mode);
    });
  }, []);

  return { bgColor, theme };
}

/** 初始化、更新 config */
export function useConfig<T>(updateConfig: (data: T) => void) {
  const isCreate = dashboard.state === DashboardState.Create;

  useLayoutEffect(() => {
    const init = async () => {
      if (isCreate) return;
      const res = await dashboard.getConfig();
      if (res?.customConfig) {
        updateConfig(res.customConfig as T);
      }
    };
    init();
  }, []);

  useLayoutEffect(() => {
    const offConfigChange = dashboard.onConfigChange((r) => {
      updateConfig(r.data as T);
    });
    return () => {
      offConfigChange();
    };
  }, []);

  return { isCreate };
}

export { dashboard, bitable, DashboardState };
