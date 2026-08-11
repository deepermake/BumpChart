import { DashboardState, bitable, dashboard } from '@lark-base-open/js-sdk';
import type { IConfig } from '@lark-base-open/js-sdk';
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
export function useConfig(updateConfig: (data: IConfig) => void) {
  const isCreate = dashboard.state === DashboardState.Create;

  useLayoutEffect(() => {
    const init = async () => {
      if (isCreate) return;
      const res = await dashboard.getConfig();
      if (res) {
        updateConfig(res);
      }
    };
    init();
  }, []);

  useLayoutEffect(() => {
    const offConfigChange = dashboard.onConfigChange((r) => {
      // Pass the full IConfig (dataConditions + customConfig) to the plugin.
      // The plugin stores it as-is and passes it back on save, ensuring
      // the SDK sees no diff between load and save.
      updateConfig(r.data);
    });
    return () => {
      offConfigChange();
    };
  }, []);

  return { isCreate };
}

export { dashboard, bitable, DashboardState };
