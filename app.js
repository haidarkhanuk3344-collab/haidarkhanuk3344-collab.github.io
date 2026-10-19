(() => {
  'use strict';
  const root = document.documentElement;
  const profile = window.PORTFOLIO_PROFILE || { name: '冯恒鑫', age: 23 };
  const themeButton = document.querySelector('.theme-toggle');
  const themeMedia = matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : themeMedia.matches;
  const syncThemeButton = () => {
    themeButton.textContent = isDark() ? '浅色' : '深色';
    themeButton.setAttribute('aria-label', isDark() ? '切换浅色主题' : '切换深色主题');
  };
  syncThemeButton();
  themeButton.addEventListener('click', () => {
    root.dataset.theme = isDark() ? 'light' : 'dark';
    try { localStorage.setItem('fhx-theme', root.dataset.theme); } catch (_) { /* Theme works without storage. */ }
    syncThemeButton();
  });
  themeMedia.addEventListener('change', syncThemeButton);

  document.querySelectorAll('[data-profile]').forEach(node => {
    const value = profile[node.dataset.profile];
    if (value !== null && value !== undefined) node.textContent = String(value);
  });
  const safeUrl = (value) => {
    try { const url = new URL(value, location.href); return /^https?:$/.test(url.protocol) ? url.href : null; } catch (_) { return null; }
  };
  if (profile.github && safeUrl(profile.github)) document.querySelectorAll('[data-github]').forEach(a => a.href = safeUrl(profile.github));
  if (profile.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
    const email = document.getElementById('contact-email');
    email.href = `mailto:${profile.email}`; email.textContent = profile.email;
    email.hidden = false;
  }
  if (profile.resumeUrl && safeUrl(profile.resumeUrl)) {
    const download = document.getElementById('resume-download');
    download.href = safeUrl(profile.resumeUrl);
    download.target = '_blank';
    download.rel = 'noopener noreferrer';
    download.hidden = false;
  }
  const resume = document.getElementById('resume-content');
  const resumeGroups = [['教育背景', profile.education], ['实践经历', profile.experience]];
  if (resumeGroups.some(([, entries]) => Array.isArray(entries) && entries.length)) {
    resume.replaceChildren();
    document.querySelector('.resume-title p').textContent = '从经历到作品，记录思考与实践。';
    for (const [title, entries] of resumeGroups) {
      if (!Array.isArray(entries) || !entries.length) continue;
      const heading = document.createElement('h3'); heading.textContent = title; resume.append(heading);
      for (const entry of entries) {
        const article = document.createElement('article'); article.className = 'resume-entry';
        for (const [key, tag] of [['title', 'h4'], ['subtitle', 'p'], ['period', 'time'], ['description', 'p']]) {
          if (!entry[key]) continue;
          const element = document.createElement(tag); element.textContent = String(entry[key]); article.append(element);
        }
        resume.append(article);
      }
    }
  } else if (profile.resumeUrl && safeUrl(profile.resumeUrl)) {
    document.querySelector('.resume-title p').textContent = '教育与实践经历，详见完整简历。';
    resume.querySelector('p').textContent = '完整简历已提供，可以打开查看。';
  }

  const views = [...document.querySelectorAll('[data-view]')];
  const navLinks = [...document.querySelectorAll('#main-nav a')];
  const titles = { about: '关于我', work: '作品', resume: '简历', contact: '联系' };
  const showView = (moveFocus = false) => {
    const key = Object.hasOwn(titles, location.hash.slice(1)) ? location.hash.slice(1) : 'about';
    views.forEach(view => { view.hidden = view.id !== key; });
    navLinks.forEach(link => {
      if (link.hash === `#${key}`) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    document.title = `${titles[key]} · 冯恒鑫`;
    if (moveFocus) {
      document.getElementById(key).querySelector('h1').focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };
  addEventListener('hashchange', () => showView(true));
  showView();
  document.querySelector('.skip-link').addEventListener('click', event => { event.preventDefault(); document.getElementById('main').focus(); });
  const questions = ['这个功能解决了什么问题？', '可以少一步操作吗？', '用户下一步会做什么？', '如何验证这个想法？'];
  let questionIndex = 0;
  document.getElementById('next-question').addEventListener('click', () => {
    questionIndex = (questionIndex + 1) % questions.length;
    document.getElementById('question').textContent = questions[questionIndex];
    document.getElementById('question-number').textContent = `0${questionIndex + 1} / 04`;
  });

  const cases = {
    simplify: {
      title: 'Page Simplify',
      intro: '把界面精简中的判断，整理成一份可复用的中文 Codex Skill。',
      image: 'assets/skill-cover.svg',
      alt: 'Page Simplify 页面精简项目封面',
      content: `<section class="case-section"><h3>从什么问题出发</h3><p>小字、重复模块和装饰容易争抢页面重点；直接删除，又可能损失构图、品牌特征或必要功能。需要一套能解释取舍的判断方式。</p></section>
        <section class="case-section"><h3>关键取舍</h3><ul><li>先判断元素在当前页面的具体作用，再决定保留、合并、减弱或删除。</li><li>有表达价值但过于突出的元素，优先减弱。用途不明的既有设计默认保留。</li><li>保护表单、错误反馈、真实能力说明和可访问性，避免只追求视觉上的干净。</li></ul></section>
        <section class="case-section"><h3>通过一个真实示例说明</h3><p>随 Skill 提供的「纸间」演示保留了纸张插画与暖色主题，整理重复表达、列表对齐和创建路径。两个版本均可操作。</p><div class="compare-images"><figure><figcaption>原始页面</figcaption><img src="assets/page-simplify-before.png" alt="纸间原始页面" loading="lazy"></figure><figure><figcaption>精简后页面</figcaption><img src="assets/page-simplify-desktop.png" alt="纸间精简后页面" loading="lazy"></figure></div></section>
        <section class="case-section"><h3>交付与验证</h3><p>仓库提供核心规则、审查模板、HTML 示例与前后截图。案例记录包含桌面与窄屏布局、键盘操作、弹窗和存储失败检查，可在完整记录中核对范围。</p></section>
        <p class="case-note">这是一份方法与示例作品。现有材料未提供真实访客研究或转化率数据。</p>`,
      links: [['查看仓库', 'https://github.com/haidarkhanuk3344-collab/page-simplify'], ['阅读完整案例', 'https://github.com/haidarkhanuk3344-collab/page-simplify/blob/main/examples/landing-page-before-after.md']]
    },
    iqiyi: {
      title: '把好戏，调到眼前。',
      intro: '爱奇艺主题的非官方交互概念作品，将影视探索做成一段可体验的过程。',
      image: 'assets/iqiyi-cover.svg',
      alt: '爱奇艺互动展示项目电视主题封面',
      content: `<section class="case-section"><h3>设计命题</h3><p>影视展示页可以如何从静态海报走向可操作的体验？这个概念作品选择复古电视作为入口，把「进入页面」转化为「打开电视」，用频道切换连接四部作品。</p></section>
        <section class="case-section"><h3>让形式对应操作</h3><ul><li>电视电源负责进入，旋钮负责换台，形式与行为有明确对应。</li><li>海报、手机界面与放映台联动，切换作品后，内容与主题同步变化。</li><li>动态预览支持暂停，最终观看入口连接到爱奇艺的对应作品页。</li></ul></section>
        <section class="case-section"><h3>可以亲自体验的内容</h3><p>电视开屏、四部作品切换、动态海报、观看功能示意、会员方案选择与模拟充值彩蛋。页面采用原生 HTML、CSS 和 JavaScript，无需安装依赖。</p></section>
        <section class="case-section"><h3>需要继续思考的取舍</h3><p>开场增加了进入内容前的一步，动效也可能分散注意力。作为作品中的交互探索，这些选择有清楚的表达目的；若用于真实业务，还需要结合目标用户、任务完成情况和性能继续验证。</p></section>
        <p class="case-note">个人概念演示，非爱奇艺官方项目。动态预览与 AI 功能均为界面示意，不提供真实影片播放、会员开通或支付服务。相关名称、标识及海报归相应权利人所有。</p>`,
      links: [['在线体验', 'https://haidarkhanuk3344-collab.github.io/iqiyi-interactive-showcase/'], ['查看仓库', 'https://github.com/haidarkhanuk3344-collab/iqiyi-interactive-showcase']]
    }
  };
  const dialog = document.getElementById('case-dialog');
  const caseBody = document.getElementById('case-body');
  let previousFocus = null;
  document.querySelectorAll('[data-case]').forEach(button => button.addEventListener('click', () => {
    const data = cases[button.dataset.case];
    if (!data) return;
    previousFocus = button;
    caseBody.innerHTML = `<h2 id="case-title"></h2><p class="case-intro"></p><img class="case-cover" width="1440" height="520" alt="">${data.content}<div class="case-links"></div>`;
    caseBody.querySelector('h2').textContent = data.title;
    caseBody.querySelector('.case-intro').textContent = data.intro;
    const image = caseBody.querySelector('.case-cover'); image.src = data.image; image.alt = data.alt;
    for (const [label, url] of data.links) {
      const link = document.createElement('a'); link.textContent = `${label} ↗`; link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.className = 'button button-outline'; caseBody.querySelector('.case-links').append(link);
    }
    dialog.showModal(); dialog.scrollTop = 0; document.body.classList.add('dialog-open'); document.getElementById('close-case').focus();
  }));
  document.getElementById('close-case').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => { document.body.classList.remove('dialog-open'); previousFocus?.focus({ preventScroll: true }); });
})();
