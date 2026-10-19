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

  document.querySelectorAll('.resume-trigger').forEach(button => button.addEventListener('click', () => document.getElementById('resume-dialog').showModal()));
  document.getElementById('close-resume').addEventListener('click', () => document.getElementById('resume-dialog').close());
  document.getElementById('resume-dialog').addEventListener('click', event => {
    const d=event.currentTarget, r=d.getBoundingClientRect();
    if(event.target===d&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)) d.close();
  });
  document.addEventListener('keydown', event => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.target.matches('input,textarea,[contenteditable="true"]') || document.querySelector('dialog[open]')) return;
    const theme = event.key.toLowerCase() === 'd' ? 'light' : event.key.toLowerCase() === 'n' ? 'dark' : null;
    if (theme && isDark() !== (theme === 'dark')) themeButton.click();
  });
  document.querySelector('.skip-link').addEventListener('click', event => { event.preventDefault(); document.getElementById('work').focus(); });
  const cases = {
    worldtree: {"title": "世界树提示词库", "intro": "把个人提示词收进一棵三维世界树，让内容的积累变得可见、可探索。", "image": "assets/world-tree-fruits.jpg", "alt": "世界树提示词库的桌面测试界面", "content": "<section class=\"case-section\"><h3>让内容积累，有一种可感知的形式</h3><p>收藏提示词后，如何在下一次需要时重新找到它？这个项目尝试用树与果实建立空间化的入口：新建一条提示词，树上就增加一枚果实；点击果实，打开对应的内容。</p></section><section class=\"case-section\"><h3>在探索和查找之间保留两条路径</h3><p>可以旋转、缩放世界树，悬停或键盘聚焦查看完整标题；也可以进入提示词库全文搜索。正文支持复制、编辑、删除与撤销删除，让视觉探索之外的日常操作同样有明确入口。</p></section><section class=\"case-section\"><h3>体验中的取舍</h3><p>树枝会遮挡后方的果实，需要通过旋转查看；条目较多时使用分组。系统开启减少动态效果后，背景使用静态海报。画面表达、查找效率和动态效果之间，需要持续平衡。</p></section><section class=\"case-section\"><h3>当前状态</h3><p>提供源码与本地运行方式，提示词保存在当前浏览器中。目前没有公开在线体验地址。项目从空库开始，下方当前版本截图不含个人提示词。</p><figure class=\"current-preview\"><img src=\"assets/world-tree-current.jpg\" width=\"533\" height=\"583\" alt=\"当前世界树空库界面\" loading=\"lazy\"><figcaption>仓库 README 使用的当前界面预览</figcaption></figure></section><p class=\"case-note\">首图为仓库中的桌面测试库截图，果实来自测试数据；它用于说明空间化交互。实际新安装从空库开始，不包含示例或个人提示词。</p>", "links": [["查看项目与运行方式", "https://github.com/haidarkhanuk3344-collab/world-tree"]]},
    hualuobo: {"title": "花萝卜", "intro": "一只住在桌面上的黑白猫，用鼠标互动与图标猫爬架，探索轻量的桌面陪伴。", "image": "assets/hualuobo-cat.png", "alt": "花萝卜的黑白猫角色动作素材", "content": "<section class=\"case-section\"><h3>让桌面环境成为互动的一部分</h3><p>猫咪可以自主活动，也会在鼠标靠近时关注、嗅闻或拍爪。文件、文件夹和快捷方式的位置被用作猫爬架，让角色与真实桌面发生联系。</p></section><section class=\"case-section\"><h3>把控制权留给使用者</h3><p>控制面板提供放出、收起、暂停、大小与图标互动开关，也保留托盘和彻底退出入口。图标组件只读取位置，不打开、拖动、重命名用户文件，也不读取文件内容。</p></section><section class=\"case-section\"><h3>当前交付与限制</h3><p>已有 Windows 10 / 11 x64 的 0.6.1 测试版安装包。采用少量完整二维动作帧，步态与动作衔接仍有限制；真实 Windows 安装、启动与图标互动仍待实机验证。</p></section><p class=\"case-note\">0.6.1 为未签名测试版，页面配图为项目角色素材，未模拟已完成实机验证。代码与角色素材暂未指定统一开源许可证。</p>", "links": [["查看 Windows 测试版", "https://github.com/haidarkhanuk3344-collab/hualuobo/releases/tag/v0.6.1"], ["查看项目", "https://github.com/haidarkhanuk3344-collab/hualuobo"]]},
    brave: {"title": "勇者旅途", "intro": "正在开发的单机 2D 横版冒险游戏原型，从职业、战斗与装备循环探索可玩的体验。", "image": "assets/brave-journey.jpg", "alt": "勇者旅途项目游戏封面素材", "content": "<section class=\"case-section\"><h3>围绕冒险构建一条成长路径</h3><p>现有原型包含战士、射手与魔法师三个职业，城镇、四张推进式关卡、精英怪与区域 Boss。装备、强化、重铸、技能点与赏金任务，把战斗和成长连接起来。</p></section><section class=\"case-section\"><h3>从角色外观到动作反馈</h3><p>角色外观、装备预览和战斗反馈仍在迭代。仓库另有三职业的第一批完整动作预览，尚未替换正式角色，也未完成所有性别、发型与装备适配。</p></section><section class=\"case-section\"><h3>如何查看</h3><p>项目使用原生 HTML、CSS、JavaScript 和 Canvas，提供通过本地 HTTP 服务运行的方式。新建角色、读档与删除存档均在浏览器本地完成。目前没有公开在线试玩地址。</p></section><p class=\"case-note\">配图为仓库内的游戏封面素材，不是实际战斗截图。部分视觉素材由 AI 辅助生成；AI NPC 与动态任务尚未实现，当前版本没有运行时 AI 功能。</p>", "links": [["查看项目与操作说明", "https://github.com/haidarkhanuk3344-collab/brave-journey"]]},
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
    image.classList.toggle('character-cover', button.dataset.case === 'hualuobo');
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
