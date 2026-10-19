# 冯恒鑫的个人空间

一个从「关于我」开始的个人网站。记录 AI 产品与交互探索，给后续的简历和经历留出空间。

[访问网站](https://haidarkhanuk3344-collab.github.io/) · [GitHub](https://github.com/haidarkhanuk3344-collab)

## 浏览方式

参考 tianruian.com 的多栏个人空间组织方式：左侧个人介绍与项目索引，中间项目文字流，右侧作品图像流。桌面三栏比例约为 25% / 25% / 50%，正文 14px。内容可直接滚动浏览，不需要点击菜单切换。

手机端按介绍、文字、图像依次展开，使用整页自然滚动。项目索引和配图都可以打开详情；简历入口保留空状态，后续从 `profile.js` 补充。

支持浅色与深色主题、D / N 快捷键、键盘访问与弹窗焦点返回。项目配图使用真实仓库素材，注明测试截图、角色素材和封面图的区别。无第三方追踪脚本，无构建依赖。

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
- `app.js` — 滚动位置同步、主题、项目详情与简历渲染
- `profile.js` — 可补充的个人信息
- `assets/` — 自托管字体、项目图片与授权文件
- `.nojekyll` — 使用 GitHub Pages 直接发布静态文件

GitHub Pages 从 `main` 分支根目录发布。布局参考 tianruian.com 的三栏个人空间，内容使用本人的项目资料，使用原生 HTML、CSS 和 JavaScript 实现。

## 作品与素材

Page Simplify 配图来自对应的公开项目；爱奇艺交互展示为非官方个人概念作品，界面演示不提供真实播放、会员或支付服务。项目详情保留相应边界说明。字体和项目素材的许可文件位于 `assets/`。
