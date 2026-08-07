import { ReactElement, useEffect, useState } from 'react';
import { bitable } from '@lark-base-open/js-sdk';
import { LocaleProvider } from '@douyinfe/semi-ui';
import zh_CN from '@douyinfe/semi-ui/lib/es/locale/source/zh_CN';
import en_US from '@douyinfe/semi-ui/lib/es/locale/source/en_US';
import ja_JP from '@douyinfe/semi-ui/lib/es/locale/source/ja_JP';
import './style.css';

const localeMap: Record<string, any> = {
  zh: zh_CN,
  en: en_US,
  ja: ja_JP,
};

export default function LoadApp(props: { children: ReactElement }): ReactElement {
  const [locale, setLocale] = useState(en_US);

  useEffect(() => {
    bitable.bridge.getLanguage().then((v) => {
      if (v && localeMap[v]) {
        setLocale(localeMap[v]);
      }
    }).catch((e) => {
      console.error(e);
    });
  }, []);

  return (
    <LocaleProvider locale={locale}>
      {props.children}
    </LocaleProvider>
  );
}
