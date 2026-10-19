# 冯恒鑫的个人空间

一个从「关于我」开始的个人网站。记录 AI 产品与交互探索，给后续的简历和经历留出空间。

[访问网站](https://haidarkhanuk3344-collab.github.io/) · [GitHub](https://github.com/haidarkhanuk3344-collab)

## 浏览方式

- **关于我** — 姓名、年龄、关注方向，以及一张可以切换问题的小卡片。
- **作品** — 两项实际作品；详情中说明问题、取舍、实现与验证边界。
- **简历** — 等待补充教育与实践经历，提供资料后可以直接更新。
- **联系** — GitHub 入口；配置邮箱后自动显示。

支持浅色与深色主题、手机布局、键盘导航、浏览器前进后退和栏目直达链接。无第三方追踪脚本，无构建依赖。

## 本地预览

GitHub Pages 仓库中的文件直接位于根目录：

```sh
python3 -m http.server 8086
```

打开 `http://localhost:8086`。本地设计工作区的可发布文件位于 `dist/`，在工作区预览时加上 `--directory dist`。

## 补充简历

编辑 `profile.js` 中的 `window.PORTFOLIO_PROFILE`。姓名、年龄、GitHub、邮箱、简历地址、教育背景和实践经历均从这里读取。没有提供的经历保持空数组；页面不生成虚构内容。

```js
education: [
  {
    title: '学校 / 专业',
    subtitle: '学位或补充说明',
    period: '起止时间',
    description: '真实的学习经历'
  }
]
```

`experience` 使用相同结构。简历 PDF 可放在 `assets/` 中，再将 `resumeUrl` 设为相对路径，例如 `assets/resume.pdf`。`email` 配置为真实邮箱后显示联系入口。发布前请自行核对准备公开的信息。

## 文件与部署

- `index.html` — 页面结构与内容
- `styles.css` — 响应式布局、主题与动画
- `app.js` — 栏目切换、主题、项目详情与简历渲染
- `profile.js` — 可补充的个人信息
- `assets/` — 自托管字体、项目图片与授权文件
- `.nojekyll` — 使用 GitHub Pages 直接发布静态文件

GitHub Pages 从 `main` 分支根目录发布。设计借鉴个人空间式的信息组织，使用原生 HTML、CSS 和 JavaScript 实现。

## 作品与素材

Page Simplify 配图来自对应的公开项目；爱奇艺交互展示为非官方个人概念作品，界面演示不提供真实播放、会员或支付服务。项目详情保留相应边界说明。字体和项目素材的许可文件位于 `assets/`。
