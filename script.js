/* ============================================================
   AI Visual Lab — <image-slot> component + page interactions
   ============================================================ */

/* ------------------------------------------------------------
   <image-slot> — user-fillable image placeholder.

   A drop target / click-to-browse slot. Size and shape come from
   ordinary CSS (width/height inline or from a parent grid). The
   user fills it by dragging an image onto it or clicking to pick
   one; the image is shown with object-fit:cover. Fills live for
   the session (they are not persisted to a backend in this
   static build).

   Attributes:
     id           Identifier (kept for parity with the design).
     shape        'rect' | 'rounded' | 'circle' | 'pill'  (default 'rounded')
     radius       Corner radius in px for 'rounded'.       (default 12)
     fit          object-fit: cover | contain | fill.      (default 'cover')
     position     object-position.                         (default '50% 50%')
     placeholder  Empty-state caption.                     (default 'Drop an image')
     src          Optional initial image URL.
   ------------------------------------------------------------ */
(() => {
  const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif'];

  const stylesheet =
    ':host{display:inline-block;position:relative;vertical-align:top;' +
    '  font:13px/1.3 system-ui,-apple-system,sans-serif;color:rgba(0,0,0,.55);width:240px;height:160px}' +
    '.frame{position:absolute;inset:0;overflow:hidden;background:rgba(0,0,0,.04)}' +
    '.frame img{position:absolute;inset:0;width:100%;height:100%;-webkit-user-drag:none;user-select:none}' +
    '.empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;' +
    '  justify-content:center;gap:6px;text-align:center;padding:12px;box-sizing:border-box;' +
    '  cursor:pointer;user-select:none}' +
    '.empty svg{opacity:.45}' +
    '.empty .cap{max-width:90%;font-weight:500;letter-spacing:.01em}' +
    '.empty .sub{font-size:11px}' +
    '.empty .sub u{text-underline-offset:2px;text-decoration-color:rgba(0,0,0,.25)}' +
    '.empty:hover .sub u{color:rgba(0,0,0,.75);text-decoration-color:currentColor}' +
    ':host([data-over]) .frame{outline:2px solid #7C5CFF;outline-offset:-2px;' +
    '  background:rgba(124,92,255,.10)}' +
    '.ring{position:absolute;inset:0;pointer-events:none;border:1.5px dashed rgba(124,92,255,.45);' +
    '  transition:border-color .12s}' +
    ':host([data-over]) .ring{border-color:#7C5CFF}' +
    ':host([data-filled]) .ring{display:none}' +
    '.ctl{position:absolute;top:100%;left:50%;transform:translateX(-50%);padding-top:8px;' +
    '  display:flex;gap:6px;opacity:0;pointer-events:none;transition:opacity .12s;z-index:2;white-space:nowrap}' +
    ':host([data-filled]:hover) .ctl{opacity:1;pointer-events:auto}' +
    '.ctl button{appearance:none;border:0;border-radius:6px;padding:5px 10px;cursor:pointer;' +
    '  background:rgba(0,0,0,.65);color:#fff;font:11px/1 system-ui,-apple-system,sans-serif}' +
    '.ctl button:hover{background:rgba(0,0,0,.8)}';

  const icon =
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>' +
    '<path d="m21 15-5-5L5 21"/></svg>';

  class ImageSlot extends HTMLElement {
    static get observedAttributes() {
      return ['shape', 'radius', 'fit', 'position', 'placeholder', 'src'];
    }

    constructor() {
      super();
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML =
        '<style>' + stylesheet + '</style>' +
        '<div class="frame" part="frame">' +
        '  <img part="image" alt="" draggable="false" style="display:none">' +
        '  <div class="empty" part="empty">' + icon +
        '    <div class="cap"></div>' +
        '    <div class="sub">or <u>browse files</u></div></div>' +
        '  <div class="ring" part="ring"></div>' +
        '</div>' +
        '<div class="ctl"><button data-act="replace">Replace</button>' +
        '  <button data-act="clear">Remove</button></div>' +
        '<input type="file" accept="' + ACCEPT.join(',') + '" hidden>';
      this._frame = root.querySelector('.frame');
      this._ring = root.querySelector('.ring');
      this._img = root.querySelector('.frame img');
      this._empty = root.querySelector('.empty');
      this._cap = root.querySelector('.cap');
      this._input = root.querySelector('input');
      this._url = null;
      this._depth = 0;

      this._empty.addEventListener('click', () => this._input.click());
      root.addEventListener('click', (e) => {
        const act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
        if (act === 'replace') this._input.click();
        if (act === 'clear') this._set(null);
      });
      this._input.addEventListener('change', () => {
        const f = this._input.files && this._input.files[0];
        if (f) this._ingest(f);
        this._input.value = '';
      });
    }

    connectedCallback() {
      this.addEventListener('dragenter', this);
      this.addEventListener('dragover', this);
      this.addEventListener('dragleave', this);
      this.addEventListener('drop', this);
      this._render();
    }

    disconnectedCallback() {
      this.removeEventListener('dragenter', this);
      this.removeEventListener('dragover', this);
      this.removeEventListener('dragleave', this);
      this.removeEventListener('drop', this);
    }

    attributeChangedCallback() { if (this.shadowRoot) this._render(); }

    handleEvent(e) {
      if (e.type === 'dragenter' || e.type === 'dragover') {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        if (e.type === 'dragenter') this._depth++;
        this.setAttribute('data-over', '');
      } else if (e.type === 'dragleave') {
        if (--this._depth <= 0) { this._depth = 0; this.removeAttribute('data-over'); }
      } else if (e.type === 'drop') {
        e.preventDefault();
        e.stopPropagation();
        this._depth = 0;
        this.removeAttribute('data-over');
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) this._ingest(f);
      }
    }

    _ingest(file) {
      if (!file || ACCEPT.indexOf(file.type) < 0) return;
      const reader = new FileReader();
      reader.onload = () => this._set(reader.result);
      reader.readAsDataURL(file);
    }

    _set(url) {
      this._url = url;
      this._render();
    }

    _render() {
      // Shape / radius.
      const shape = (this.getAttribute('shape') || 'rounded').toLowerCase();
      let radius = '';
      if (shape === 'circle') radius = '50%';
      else if (shape === 'pill') radius = '9999px';
      else if (shape === 'rounded') {
        const n = parseFloat(this.getAttribute('radius'));
        radius = (Number.isFinite(n) ? n : 12) + 'px';
      }
      this._frame.style.borderRadius = radius;
      this._ring.style.borderRadius = radius;

      const fit = this.getAttribute('fit') || 'cover';
      this._img.style.objectFit = fit;
      this._img.style.objectPosition = this.getAttribute('position') || '50% 50%';

      this._cap.textContent = this.getAttribute('placeholder') || 'Drop an image';

      const url = this._url || this.getAttribute('src') || '';
      if (url) {
        if (this._img.getAttribute('src') !== url) this._img.src = url;
        this._img.style.display = 'block';
        this._empty.style.display = 'none';
        this.setAttribute('data-filled', '');
      } else {
        this._img.style.display = 'none';
        this._img.removeAttribute('src');
        this._empty.style.display = 'flex';
        this.removeAttribute('data-filled');
      }
    }
  }

  if (!customElements.get('image-slot')) {
    customElements.define('image-slot', ImageSlot);
  }
})();

/* ------------------------------------------------------------
   Page interactions
   ------------------------------------------------------------ */
(function () {
  'use strict';

  /* ---- Nav background on scroll ---- */
  const nav = document.querySelector('.nav');
  const onScroll = () => {
    if (window.scrollY > 24) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- Scroll reveal ---- */
  const reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  const reveal = (el) => el.classList.add('in');
  const vh = () => window.innerHeight || document.documentElement.clientHeight || 800;
  const inView = (el) => { const r = el.getBoundingClientRect(); return r.top < vh() * 0.92 && r.bottom > -40; };
  const revealVisible = () => reveals.forEach((el) => { if (!el.classList.contains('in') && inView(el)) reveal(el); });

  // 1) reveal whatever is already on screen
  revealVisible();
  window.addEventListener('load', revealVisible);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(revealVisible);

  // 2) reveal the rest as they scroll into view
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); } });
    }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach((el) => io.observe(el));
  }
  window.addEventListener('scroll', revealVisible, { passive: true });

  // 3) hard failsafe: never leave content hidden
  setTimeout(() => reveals.forEach(reveal), 2200);

  /* ---- Marquee: duplicate content for seamless loop ---- */
  document.querySelectorAll('.marquee').forEach((m) => {
    m.innerHTML += m.innerHTML;
  });

  /* ---- FAQ: keep one open at a time (native details) ---- */
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach((item) => {
    item.addEventListener('toggle', () => {
      if (item.open) {
        faqItems.forEach((other) => { if (other !== item) other.open = false; });
      }
    });
  });

  /* ---- CTA form (demo, no backend) ---- */
  document.querySelectorAll('form[data-demo]').forEach((form) => {
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const input = form.querySelector('input');
      const btn = form.querySelector('button');
      if (input && !input.value.trim()) { input.focus(); return; }
      if (btn) { btn.textContent = 'Շնորհակալություն ✓'; btn.disabled = true; }
      if (input) input.value = '';
    });
  });

  /* ---- Smooth anchor offset for fixed nav ---- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (ev) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      ev.preventDefault();
      const y = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });

  /* ---- Carousels (collaborations + testimonials): scroll with arrows, loop at the ends ---- */
  document.querySelectorAll('.carousel-track').forEach((track) => {
    const carousel = track.parentElement;
    const prev = carousel.querySelector('.carousel-arrow.prev');
    const next = carousel.querySelector('.carousel-arrow.next');
    const step = () => Math.max(track.clientWidth * 0.9, 260);
    const maxScroll = () => track.scrollWidth - track.clientWidth;
    if (next) next.addEventListener('click', () => {
      if (track.scrollLeft >= maxScroll() - 5) {
        track.scrollTo({ left: 0, behavior: 'smooth' });            // at the end → loop to start
      } else {
        track.scrollBy({ left: step(), behavior: 'smooth' });
      }
    });
    if (prev) prev.addEventListener('click', () => {
      if (track.scrollLeft <= 5) {
        track.scrollTo({ left: maxScroll(), behavior: 'smooth' });  // at the start → loop to end
      } else {
        track.scrollBy({ left: -step(), behavior: 'smooth' });
      }
    });
  });

  /* collaborations "see all" toggle */
  const cToggle = document.getElementById('collabs-toggle');
  if (cToggle) {
    const collabs = document.querySelector('.collabs');
    cToggle.addEventListener('click', () => {
      const on = collabs.classList.toggle('show-all');
      cToggle.textContent = on ? 'Թաքցնել' : 'Տեսնել բոլորը';
    });
  }

  /* ---- Gallery "see more" expand ---- */
  const gToggle = document.getElementById('gallery-toggle');
  if (gToggle) {
    const gallery = document.querySelector('.gallery');
    gToggle.addEventListener('click', () => {
      const on = gallery.classList.toggle('expanded');
      gToggle.textContent = on ? 'Թաքցնել' : 'Տեսնել ավելին';
    });
  }
})();

/* ------------------------------------------------------------
   Quiz — modal, one question at a time, scored persona result
   ------------------------------------------------------------ */
(function () {
  'use strict';

  const modal = document.getElementById('quiz-modal');
  if (!modal) return;

  const content = document.getElementById('qm-content');
  const bar = document.getElementById('qm-bar');
  const stepEl = document.getElementById('qm-step');
  const dialog = modal.querySelector('.qm-dialog');

  const LETTERS = ['Ա', 'Բ', 'Գ'];

  const QUESTIONS = [
    {
      q: 'Երբ քեզ անհրաժեշտ է լինում յուրահատուկ վիզուալ սոցցանցերի կամ նախագծի համար, ի՞նչ ես անում.',
      a: [
        { t: 'Ժամեր եմ անցկացնում Pinterest-ում փնտրելով մի բան, որը հաստատ արդեն օգտագործվել է շատ։', p: 4 },
        { t: 'Փորձում եմ բացատրել դիզայներին, բայց արդյունքը հաճախ չի համընկնում իմ պատկերացրածի հետ։', p: 3 },
        { t: 'Ստեղծում եմ այն վայրկյանների ընթացքում՝ հենց այնպես, ինչպես պատկերացնում եմ։', p: 0 }
      ]
    },
    {
      q: 'Ինչպե՞ս ես վերաբերվում AI գործիքներին.',
      a: [
        { t: 'Լսել եմ, բայց դեռ չեմ հասկանում՝ ինչպես դրանք կիրառեմ իմ աշխատանքում։', p: 5 },
        { t: 'Փորձել եմ մի երկու prompt գրել, բայց ստացված պատկերները շատ արհեստական ու անորակ էին։', p: 4 },
        { t: 'Արդեն իսկ իմ բոլոր նախագծերի 80%-ը AI-ով եմ անում։', p: 0 }
      ]
    },
    {
      q: 'Որքա՞ն ժամանակ ես ծախսում մեկ էսթետիկ կոնտենտ-պլան կամ վիզուալ հայեցակարգ (visual concept) մշակելու վրա.',
      a: [
        { t: 'Ամբողջ օրվա մեջ։', p: 5 },
        { t: 'Մեկ-երկու ժամ, բայց արդյունքը միշտ «մինիմալիստական» է ստացվում, որովհետև բարդ բաներ ստանալ չեմ կարողանում։', p: 3 },
        { t: 'Մաքսիմում 15 րոպե՝ AI-ի օգնությամբ։', p: 0 }
      ]
    },
    {
      q: 'Որքա՞ն գումար եք ծախսում ամսական կոնտենտի ստեղծման վրա (ֆոտոսեսիաներ, մոդելներ, դիզայներներ, վիդեոգրաֆներ)։',
      a: [
        { t: '0 դրամ, ամեն ինչ ինքս եմ անում (ցածր որակով)։', p: 4 },
        { t: 'Միջինից բարձր բյուջե, բայց արդյունքը միշտ չէ, որ գոհացնում է։', p: 3 },
        { t: 'Ունեմ հաստիքային թիմ/ֆրիլանսերներ, մեծ բյուջե է գնում։', p: 4 }
      ]
    },
    {
      q: 'Երբ տեսնում ես թրենդային, կատարյալ ու էսթետիկ AI-ով ստեղծված նկարներ կամ վիդեոներ, ի՞նչ ես մտածում.',
      a: [
        { t: '«Սա ո՞նց են անում, երանի ես էլ կարողանայի...»', p: 5 },
        { t: '«Սա հաստատ միայն ՏՏ մասնագետների կամ պրոֆեսիոնալ դիզայներների խելքի բանն է»։', p: 4 },
        { t: '«Սովորական prompt է, ես սրանից լավն եմ սարքում»։', p: 0 }
      ]
    },
    {
      q: 'Որքանո՞վ է քեզ համար կարևոր կոնտենտի մրցունակությունը շուկայում.',
      a: [
        { t: 'Շատ կարևոր է, բայց զգում եմ, որ իմ վիզուալները սկսել են կորչել միօրինակ հրապարակումների մեջ։', p: 5 },
        { t: 'Կարևոր է, բայց բյուջես չի ներում ամեն անգամ թանկարժեք ֆոտոսեսիաներ կազմակերպել կամ դիզայներներ վարձել։', p: 4 },
        { t: 'Ես միշտ մեկ քայլ առաջ եմ բոլորից և թելադրում եմ թրենդները։', p: 0 }
      ]
    },
    {
      q: 'Ի՞նչն է քեզ ամենից շատ նյարդայնացնում պատկերներ ստեղծելիս.',
      a: [
        { t: 'Որ չեմ կարողանում գտնել ճիշտ բառերը (prompts) AI-ին բացատրելու համար, թե կոնկրետ ինչ ոճ, լուսավորություն կամ կոմպոզիցիա եմ ուզում։', p: 5 },
        { t: 'Որ նկարների որակը վատն է լինում, ու դրանք հնարավոր չի լինում օգտագործել պրոֆեսիոնալ տեղերում։', p: 4 },
        { t: 'Ինձ ոչինչ չի նյարդայնացնում, ես գիտեմ բոլոր գաղտնիքները։', p: 0 }
      ]
    },
    {
      q: 'Ինչպե՞ս եք ստեղծում ձեր ապրանքի (կամ ծառայության) գովազդային վիզուալները.',
      a: [
        { t: 'Պարզապես հեռախոսով նկարում եմ ու տեղադրում։', p: 4 },
        { t: 'Կազմակերպում եմ բարդ ֆոտոսեսիաներ՝ դիզայներների ներգրավմամբ։', p: 3 },
        { t: 'AI-ի շնորհիվ ցանկացած ապրանք տեղադրում եմ շքեղ (Luxury) միջավայրում՝ վայրկյանների ընթացքում։', p: 0 }
      ]
    },
    {
      q: 'Ի՞նչն է ձեզ խանգարում ստեղծել կինեմատոգրաֆիկ կամ բարձրակարգ (Premium) գովազդային հոլովակներ.',
      a: [
        { t: 'Թանկարժեք տեխնիկայի (խցիկներ, լույսեր) և բարդ ծրագրերի չտիրապետելը։', p: 5 },
        { t: 'Գաղափարների սակավությունը։', p: 3 },
        { t: 'Ոչինչ չի խանգարում, ազատ ստեղծում եմ։', p: 0 }
      ]
    },
    {
      q: 'Եթե քեզ ասեն, որ AI-ի միջոցով կարող ես 1 ժամում ստեղծել 1 ամսվա սոցցանցերի կոնտենտ, ի՞նչ կպատասխանես.',
      a: [
        { t: '«Չեմ հավատում, դա անհնար է առանց դիզայնի խորը գիտելիքների»։', p: 4 },
        { t: '«Շատ եմ ուզում հավատալ ու սովորել, թե ոնց»։', p: 5 },
        { t: '«Ես արդեն այդպես էլ անում եմ»։', p: 0 }
      ]
    },
    {
      q: 'Ինչպե՞ս եք տեսնում ձեր բրենդը կամ կարիերան 6 ամիս անց, երբ շուկայի 80%-ը կիրառելու է Generative AI-ն.',
      a: [
        { t: 'Լինելու եմ առաջատարներից մեկը, քանի որ արդեն ներդնում եմ այդ տեխնոլոգիաները։', p: 0 },
        { t: 'Կարծում եմ՝ դեռ ժամանակ կա, հին մեթոդներն էլ են աշխատում։', p: 4 },
        { t: 'Եթե հիմա չսովորեմ, պարզապես դուրս կմնամ շուկայից։', p: 5 }
      ]
    }
  ];

  const RESULTS = [
    {
      max: 15, klass: 'r-1', tag: 'Քո արդյունքը',
      name: 'AI Ռեժիսոր', sub: 'The Trendsetter',
      desc: 'Դուք արդեն տիրապետում եք AI-ի հիմունքներին և չեք վախենում նորարարություններից։ Շուկայում քչերից եք, ովքեր հասկանում են ապագայի լեզուն։',
      gap: 'Բայց արդյո՞ք օգտագործում եք Generative AI-ի 100% պոտենցիալը ձեր բիզնեսը մասշտաբավորելու և Luxury/Premium սեգմենտի պատվերներ ստանալու համար։ Գովազդային մեծ արշավների համար պարզապես prompt գրելը բավարար չէ. պետք է տիրապետել դեմքերի կայունությանը, կինեմատոգրաֆիկ վիդեոների սինխրոնիզացիային և ձայնի սինթեզին։',
      cta: 'Բացահայտիր Premium AI գործիքների փակ մեթոդները'
    },
    {
      max: 34, klass: 'r-2', tag: 'Քո արդյունքը',
      name: 'Սիրողական Մակարդակ', sub: 'Ժամանակի և Բյուջեի Կորուստ',
      desc: 'Դուք գիտեք AI-ի գոյության մասին, գուցե փորձել եք մի քանի հավելված, բայց այն դեռ չի աշխատում ձեր օգտին որպես իրական բիզնես գործիք։ Դուք դեռ ժամանակ ու մեծ բյուջեներ եք կորցնում ստանդարտ ֆոտոսեսիաների, դիզայներների հետ անվերջ քննարկումների և Pinterest-ում նույնանման գաղափարներ փնտրելու վրա։',
      gap: 'Ձեր գլխավոր խնդիրն է՝ «արհեստական» և ցածրորակ արդյունքը, որը ստացվում է առանց ճիշտ տեխնիկայի։ Ձեզ անհրաժեշտ է պրոֆեսիոնալ համակարգ, որը թույլ կտա ստեղծել ստուդիական որակի գովազդային վիզուալներ և վիդեոներ հենց համակարգչով։',
      cta: 'Սովորիր ստեղծել ստուդիական կոնտենտ AI-ով'
    },
    {
      max: Infinity, klass: 'r-3', tag: 'Քո արդյունքը',
      name: 'Կրիտիկական Գոտի', sub: 'Շուկայից դուրս մնալու ռիսկ',
      desc: 'Ձեր կոնտենտի ստեղծման մեթոդները և վիզուալ ռազմավարությունը հնացել են։ Մինչ դուք ժամեր եք անցկացնում հեռախոսով սովորական նկարներ անելով կամ ստեղծագործական ճգնաժամ ապրելով, ձեր մրցակիցներն արդեն խնայում են հազարավոր դոլարներ և վայրկյաններում ստեղծում են համաշխարհային բրենդների մակարդակի գովազդներ։',
      gap: '6 ամիս անց շուկայի 80%-ը կիրառելու է Generative AI։ Եթե այսօր չսովորեք կառավարել այս տեխնոլոգիան, ձեր բրենդը կամ ձեր՝ որպես մասնագետի ծառայությունները պարզապես կդառնան անտեսանելի և անմրցունակ։',
      cta: 'Փրկիր քո բիզնեսը. Տիրապետիր Generative AI-ին հիմա'
    }
  ];

  let index = 0;
  let score = 0;
  let lastFocus = null;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function setProgress(done, total) {
    bar.style.width = (done / total * 100) + '%';
  }

  function renderQuestion() {
    const item = QUESTIONS[index];
    setProgress(index, QUESTIONS.length);
    stepEl.textContent = 'Հարց ' + (index + 1) + ' / ' + QUESTIONS.length;

    const opts = item.a.map((opt, i) =>
      '<button type="button" class="qm-option" data-points="' + opt.p + '">' +
      '<span class="qm-mark">' + LETTERS[i] + '</span>' +
      '<span class="qm-otext">' + esc(opt.t) + '</span></button>'
    ).join('');

    content.innerHTML =
      '<div class="qm-q">' +
      '<h3 class="qm-q-title">' + esc(item.q) + '</h3>' +
      '<div class="qm-options">' + opts + '</div></div>';

    dialog.scrollTop = 0;
    const first = content.querySelector('.qm-option');
    if (first) first.focus();
  }

  function pick(btn) {
    btn.classList.add('is-picked');
    score += parseInt(btn.getAttribute('data-points'), 10) || 0;
    // brief highlight, then advance
    setTimeout(() => {
      index++;
      if (index < QUESTIONS.length) renderQuestion();
      else renderResult();
    }, 220);
  }

  function renderResult() {
    setProgress(QUESTIONS.length, QUESTIONS.length);
    stepEl.textContent = 'Արդյունք';
    const r = RESULTS.find((x) => score <= x.max);

    content.innerHTML =
      '<div class="qm-result ' + r.klass + '">' +
      '<span class="qm-result-eyebrow"><span class="dot"></span>' + esc(r.tag) + '</span>' +
      '<div class="qm-persona">' + esc(r.name) + '</div>' +
      '<div class="qm-persona-sub">' + esc(r.sub) + '</div>' +
      '<p class="qm-desc">' + esc(r.desc) + '</p>' +
      '<div class="qm-gap">' +
      '<span class="qm-gap-label">⚡ Բացթողում</span>' +
      '<p>' + esc(r.gap) + '</p></div>' +
      '<a class="btn btn-primary btn-lg qm-cta" href="#pricing" data-quiz-cta>' + esc(r.cta) + ' →</a>' +
      '<button type="button" class="qm-restart" data-quiz-restart>Անցնել թեստը նորից</button>' +
      '</div>';
    dialog.scrollTop = 0;
  }

  function openQuiz() {
    lastFocus = document.activeElement;
    index = 0;
    score = 0;
    modal.hidden = false;
    document.body.classList.add('qm-open');
    renderQuestion();
  }

  function closeQuiz() {
    modal.hidden = true;
    document.body.classList.remove('qm-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // Open triggers
  document.querySelectorAll('[data-quiz-open]').forEach((el) => {
    el.addEventListener('click', (e) => { e.preventDefault(); openQuiz(); });
  });

  // Delegated clicks inside the modal
  modal.addEventListener('click', (e) => {
    const target = e.target;
    if (target.closest('[data-quiz-close]')) { closeQuiz(); return; }
    if (target.closest('[data-quiz-restart]')) { index = 0; score = 0; renderQuestion(); return; }
    if (target.closest('[data-quiz-cta]')) {
      // close, then smooth-scroll to pricing
      closeQuiz();
      const pricing = document.getElementById('pricing');
      if (pricing) {
        e.preventDefault();
        const y = pricing.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
      return;
    }
    const opt = target.closest('.qm-option');
    if (opt && !opt.classList.contains('is-picked')) pick(opt);
  });

  // Escape to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeQuiz();
  });
})();
