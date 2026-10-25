export const profile = {
  name: '冯恒鑫', alias: 'Chess', role: 'AI Product Manager',
  github: 'https://github.com/haidarkhanuk3344-collab',
  intro: '把好奇心，做成可以触碰的东西。',
  bio: '你好，我是冯恒鑫，也可以叫我 Chess。一个喜欢研究、动手和运动的 AI 产品经理。我常常从自己的使用经历出发，发现一个值得琢磨的问题，再和 AI 一起把想法变成原型。',
};
export const projects = [
  {
    id: 'contextflow', title: '境流', english: 'ContextFlow', kind: 'AI 创作工作台', year: '01', color: '#9bb3a4',
    status: '持续开发中的原型', image: '/chess-assets/projects/contextflow.png',
    lead: '如果下一镜头，能听懂「承接上一镜头」。',
    description: '一个从我自己的 AIGC 创作经历出发的无限画布实验。图像、视频与创作素材被放在同一个工作空间里，我想继续探索它们之间如何共享上下文。',
    sections: [
      ['从哪里开始', '创作连续视频时，我经常需要自己截取首尾帧、整理参考，再交给下一个生成节点。节点之间缺少衔接，创作者就要反复替它们搬运信息。'],
      ['我的产品判断', '与其让人不断重复已有信息，我更想在画布层面组织镜头关系，让「承接上一镜头」成为一种自然的创作表达。先界定上下文的范围，再逐步验证它能否帮助创作。'],
      ['目前做到哪里', '已搭建画布原型，并接入图像和视频模型 API。跨镜头的视觉记忆、衔接质量以及是否节省时间和积分，仍需要验证；目前尚未开放给外部用户。'],
      ['我在其中', '从使用体验里发现问题，定义产品边界与功能，与 AI 讨论开发需求、推进原型并持续调整。'],
    ],
    mediaNote: '实际原型界面 · 演示内容使用独立测试数据',
    availability: '本地原型，暂未开放在线体验',
  },
  {
    id: 'brave-journey', title: '勇者旅途', english: 'Brave Journey', kind: '2D 冒险游戏', year: '02', color: '#d8b279',
    status: '可运行的游戏原型', image: '/chess-assets/projects/brave-journey.png', video: '/chess-assets/projects/brave-journey.mp4',
    lead: '在喜欢的冒险里，加入自己的想法。',
    description: '一个围绕探索、战斗和成长制作的横版冒险原型。动手做它，是因为我想把那些玩游戏时冒出的念头，放进真正能运行的游戏里。',
    sections: [
      ['想做什么', '保留横版冒险中直接、轻快的乐趣，围绕角色、战斗与装备系统逐步尝试自己的设计。'],
      ['已经可以玩什么', '原型包含战士、射手和法师，以及城镇、关卡、战斗、装备和本地存档。这里的视频录自独立测试存档中的实际运行。'],
      ['下一步的实验', '希望给 NPC 的对话加入轻量 AI，让交流多一点变化。这是后续目标，目前展示的是已有游戏系统，不包含已落地的 AI NPC。'],
      ['制作说明', '这是基于既有游戏研究与素材持续修改的个人实验。代码与素材来源说明以仓库为准；这里着重展示我自己的产品探索与迭代。'],
    ],
    mediaNote: '真实运行录像 · 原型测试存档 · 无 AI NPC 功能演示',
    repo: 'https://github.com/haidarkhanuk3344-collab/brave-journey',
    availability: '从仓库获取运行说明',
  },
  {
    id: 'world-tree', title: '世界树', english: 'World Tree', kind: '个人提示词库', year: '03', color: '#a7b989',
    status: '个人工具 · 持续生长', image: '/chess-assets/projects/world-tree.png',
    lead: '让积累的提示词，长在一棵树上。',
    description: '把个人提示词库变成一棵可以探索的树：每颗果实都是一个入口，找到、打开，再把需要的提示词带走。',
    sections: [
      ['一个不同的入口', '提示词既是工具，也是长期积累的创作材料。我尝试用树与果实来承载它们，让整理和查找也带一点探索感。'],
      ['当前功能', '支持提示词的查找、编辑、复制、删除与撤销；可以转动树、调整视角。数据保存在本地浏览器中。'],
    ],
    mediaNote: '实际运行截图 · 独立浏览器数据',
    repo: 'https://github.com/haidarkhanuk3344-collab/world-tree',
    availability: '从仓库获取运行说明',
  },
  {
    id: 'hualuobo', title: '花萝卜', english: 'Hualuobo', kind: '桌面上的小生命', year: '04', color: '#cfb9a7',
    status: '桌宠实验 · 测试版本', image: '/chess-assets/projects/cat.png',
    lead: '忙的时候，桌面也有一点小动静。',
    description: '一只黑白桌面猫。用逐帧动作与鼠标互动，让电脑桌面多一点陪伴感，也多一点意料之外的趣味。',
    sections: [
      ['关注的体验', '让一只小猫在桌面里走动、回应鼠标，并探索与桌面图标的互动。它不需要成为一个复杂的助手，有自己的小动作就很好。'],
      ['当前状态', '已有桌宠动作与交互实验，以及 Windows 测试发行版。真实 Windows 环境的安装与完整交互效果仍需进一步验证。'],
    ],
    mediaNote: '项目角色素材 · 非桌面运行截图',
    repo: 'https://github.com/haidarkhanuk3344-collab/hualuobo',
    download: 'https://github.com/haidarkhanuk3344-collab/hualuobo/releases',
    availability: '查看测试版与安装说明',
  },
];
