export default function Icon({ name, size = 16 }) {
  const s = size;
  const common = {
    width: s, height: s, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round',
  };
  const paths = {
    home:     <><path d="M3 11l9-8 9 8" /><path d="M5 9v12h14V9" /></>,
    book:     <><path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2z" /><path d="M4 17h15" /></>,
    cards:    <><rect x="3" y="5" width="14" height="14" rx="2" /><path d="M7 9h6M7 13h6" /><path d="M21 7v12a2 2 0 0 1-2 2H8" /></>,
    play:     <><polygon points="6 4 20 12 6 20 6 4" /></>,
    spark:    <><path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z" /></>,
    flame:    <><path d="M12 3s4 4 4 8a4 4 0 1 1-8 0c0-2 1-3 1-3s2 1 2 4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4.8a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.4a7 7 0 0 0-2 1.2l-2.4-.8-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-.8a7 7 0 0 0 2 1.2L10 21h4l.5-2.4a7 7 0 0 0 2-1.2l2.4.8 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" /></>,
    plus:     <><path d="M12 5v14M5 12h14" /></>,
    search:   <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
    arrow:    <><path d="M5 12h14M13 5l7 7-7 7" /></>,
    chevR:    <><path d="M9 6l6 6-6 6" /></>,
    chevL:    <><path d="M15 6l-9 6 9 6" /></>,
    check:    <><path d="M5 12l5 5 9-11" /></>,
    x:        <><path d="M6 6l12 12M18 6l-12 12" /></>,
    sound:    <><polygon points="11 5 6 9 3 9 3 15 6 15 11 19 11 5" /><path d="M16 8a5 5 0 0 1 0 8" /></>,
    refresh:  <><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></>,
    info:     <><circle cx="12" cy="12" r="9" /><path d="M12 8v.01M11 12h1v5h1" /></>,
    user:     <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    bookmark: <><path d="M6 3h12v18l-6-4-6 4z" /></>,
    quote:    <><path d="M7 7h4v4H7zM7 11c0 3 0 5 4 6" /><path d="M15 7h4v4h-4zM15 11c0 3 0 5 4 6" /></>,
    flip:     <><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /></>,
    trash:    <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>,
    edit:     <><path d="M4 20h4l11-11-4-4L4 16zM14 5l4 4" /></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
    logout:   <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
  };
  return <svg {...common}>{paths[name] ?? null}</svg>;
}
