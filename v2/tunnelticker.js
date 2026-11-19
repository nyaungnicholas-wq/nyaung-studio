// The tunnel's story: one project at a time in the About panel, in the order they were picked for the homepage.
export default function createTunnelTicker(projects) {
  const list = (projects || []).slice().sort((a, b) => (a.selected || 99) - (b.selected || 99));
  const panel = document.querySelector('#about .panel');
  if (!panel || !list.length) return () => {};
  const el = document.createElement('a');
  el.className = 'tk';
  el.innerHTML = '<span class="tk-k"></span><span class="tk-n"></span><span class="tk-t"></span><span class="tk-bar"><i></i></span>';
  panel.insertBefore(el, panel.querySelector('.more'));
  const [k, nm, t, bar] = el.children;
  let last = -1;
  return (p) => {
    const i = Math.min(list.length - 1, Math.floor(p * list.length));
    bar.firstChild.style.transform = `scaleX(${((i + 1) / list.length).toFixed(3)})`;
    if (i === last) return;
    last = i;
    const pr = list[i], live = /live/i.test(pr.status || '');
    k.textContent = `PROJECT ${String(i + 1).padStart(2, '0')} / ${list.length} · ${(pr.status || '').toUpperCase()}`;
    k.classList.toggle('is-live', live);
    nm.textContent = pr.name;
    t.textContent = pr.tagline || '';
    el.href = `#/work/${pr.slug}`;
    el.classList.remove('is-in'); void el.offsetWidth; el.classList.add('is-in');
  };
}
