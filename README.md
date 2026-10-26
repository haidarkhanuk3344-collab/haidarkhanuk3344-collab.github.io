# Chess / 冯恒鑫 · 个人网站

网站：https://haidarkhanuk3344-collab.github.io/

仅维护电脑端。GitHub Pages 从 main 分支根目录发布；无需租用服务器。

## 本地维护

需要 Node.js 与 Python 3，无需安装 npm 依赖。

- `npm start`：启动 http://127.0.0.1:8895/
- 修改 `_source/chess-3d/custom/chess-content.js` 更新项目介绍、状态和链接。
- 修改同目录 `room.js`、`room.css` 更新房间交互和界面。
- 修改 `chess-pc.js` 或 `chess-tv.js` 更新电脑桌面、电视节目。
- `npm run build`：生成网站文件并检查脚本和媒体资源。
- 将源码和构建结果一起提交到 main，Pages 自动更新。

截图与视频放在 `chess-assets/projects/`；`plain.html` 是内容直达和 WebGL 失败兜底。

`_source/felix-replica/site/` 只保留构建需要的参考入口和场景脚本。其余运行资源在根目录 assets、scene-data 等目录中，无需原电脑或本地镜像即可维护。

## 来源

基于 Felix Rieseberg 网站下发的场景实现改编，来源和素材许可见 [credits.html](credits.html)。整体再分发许可尚未核实，不将参考场景宣称为原创。

不要把密钥、登录凭据、个人测试数据提交到仓库。
