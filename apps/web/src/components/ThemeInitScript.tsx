export function ThemeInitScript() {
  const script = `(function(){try{var t=localStorage.getItem('se_theme');document.documentElement.setAttribute('data-theme',t||'light');}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
