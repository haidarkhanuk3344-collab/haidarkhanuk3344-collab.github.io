export const profile = {
  "name": "冯恒鑫",
  "alias": "Chess",
  "role": "AI Product Manager",
  "github": "https://github.com/haidarkhanuk3344-collab",
  "intro": "把好奇心，做成可以触碰的东西。",
  "bio": "你好，我是冯恒鑫，也可以叫我 Chess。一个喜欢研究、动手和运动的 AI 产品经理。我常常从自己的使用经历出发，发现一个值得琢磨的问题，再和 AI 一起把想法变成原型。"
};
export const projects = [
  {
    "id": "contextflow",
    "title": "镜流",
    "english": "ContextFlow",
    "kind": "AI 创作工作台",
    "year": "01",
    "color": "#9bb3a4",
    "status": "开发试用版 · 已开放交互演示",
    "image": "/chess-assets/projects/contextflow.png",
    "lead": "如果下一镜头，能听懂「承接上一镜头」。",
    "description": "一个从我的 AIGC 创作经历出发的创作画布。把图片、视频和素材放在一起，为节点明确选择上下文来源与结果版本，让创作从已有镜头继续。",
    "sections": [
      [
        "从哪里开始",
        "制作连续视频时，我常常要自己截取画面、整理提示词，再交给下一个节点。我想把这部分信息组织工作交给画布，让「承接上一镜头」有明确的上下文。"
      ],
      [
        "现在怎样承接",
        "开启上下文承接后，选择一个同类型的前置节点和它的一版结果。图片视觉分析、视频末段约 1–2 秒的多帧分析会帮助组织提示词；普通参考素材与上下文承接独立控制。"
      ],
      [
        "已经做到哪里",
        "已实现项目与画布、图片与视频节点、结果历史、素材库和跨画布引用，并提供古装真人、现代真人、中式二维、游戏 CG 四类风格预设。试用版接入图像、视觉分析和单首帧图生视频服务。"
      ],
      [
        "关键取舍",
        "先让来源和版本可见、可选，减少隐式记忆带来的不确定性。上下文分析可以辅助提示词，但不保证角色、动作或画面像素级连续；节省多少时间与积分仍需实际验证。"
      ],
      [
        "体验边界",
        "公开演示可编辑画布、上传本地素材、选择承接来源并体验示例结果。演示生成使用浏览器预置图形与动画，不调用真实 AI；数据仅保存在当前浏览器。文生视频、多参考视频和完整费用核算仍待完善。"
      ],
      [
        "我在其中",
        "从创作经历里发现问题，定义产品边界与功能，和 AI 讨论需求、推进开发，再通过可操作的原型验证想法。"
      ]
    ],
    "mediaNote": "新版公开演示实拍 · 预置示例素材 · 非真实 AI 生成",
    "availability": "无需登录即可体验交互演示；真实模型接入与本地运行见仓库说明。",
    "demo": "https://haidarkhanuk3344-collab.github.io/contextflow/",
    "demoLabel": "打开画布交互演示 ↗",
    "repo": "https://github.com/haidarkhanuk3344-collab/contextflow"
  },
  {
    "id": "haixin",
    "title": "海辛",
    "english": "Haixin Agent",
    "kind": "本地个人 Agent",
    "year": "02",
    "color": "#92aaa0",
    "status": "macOS 本地 Alpha",
    "image": "/chess-assets/projects/haixin-chat.png",
    "lead": "聊过的事，可以成为下一次行动的起点。",
    "description": "一个围绕持续对话、个人记忆和待办事项构建的本地 Agent。尝试把「认识你」「记住事情」和「继续推进」连接起来，让对话不只停在一次回答。",
    "sections": [
      [
        "想探索的问题",
        "如果助手能保留交流中的背景、目标和近况，下一次对话就不必从头解释。海辛围绕这种持续关系，探索记忆、事项与主动跟进如何配合。"
      ],
      [
        "当前能力",
        "支持长短期记忆及来源追踪、更正和遗忘；可以管理日历、待办与笔记，读取授权材料并生成、编辑和下载 Markdown 文档。也能把来源变化与待推进的事情联系起来，准备成果并等待继续交流。"
      ],
      [
        "把执行放进产品里",
        "界面之外还有持久任务队列、有限重试、取消和结果待核对状态。定时提醒在到点时不依赖模型调用；聊天内提醒与 macOS 通知，让事情有机会被接住。"
      ],
      [
        "记忆也要可管理",
        "记忆展示来源、版本和时间，并允许更正或忘记。数据在本地保存，但调用模型仍会发送必要上下文；本地存储不代表完全离线。"
      ],
      [
        "技术与边界",
        "React / TypeScript 前端，Python 本地 API 与持久队列，OpenClaw 工具循环和 DeepSeek 模型。目前是 macOS 本地 Alpha，电脑睡眠或关机时不保证提醒送达，尚无云端常驻或移动端服务。"
      ],
      [
        "演示说明",
        "这里展示当前仓库的真实前端，使用独立编写的示例对话、事项与记忆。没有读取私人聊天或调用真实模型；演示用于了解界面与流程，完整运行请查看仓库。"
      ]
    ],
    "mediaNote": "当前前端界面 · 预置示例数据 · 不调用真实模型",
    "demo": "/demos/haixin.html",
    "demoLabel": "查看界面演示 ↗",
    "repo": "https://github.com/haidarkhanuk3344-collab/haixin-agent",
    "availability": "先浏览对话、事项与记忆界面；完整体验需要按仓库说明在本机配置运行。"
  },
  {
    "id": "brave-journey",
    "title": "勇者旅途",
    "english": "Brave Journey",
    "kind": "2D 冒险游戏",
    "year": "03",
    "color": "#d8b279",
    "status": "可运行的游戏原型",
    "image": "/chess-assets/projects/brave-journey.png",
    "video": "/chess-assets/projects/brave-journey.mp4",
    "lead": "在喜欢的冒险里，加入自己的想法。",
    "description": "一个围绕探索、战斗和成长制作的横版冒险原型。动手做它，是因为我想把那些玩游戏时冒出的念头，放进真正能运行的游戏里。",
    "sections": [
      [
        "想做什么",
        "保留横版冒险中直接、轻快的乐趣，围绕角色、战斗与装备系统逐步尝试自己的设计。"
      ],
      [
        "已经可以玩什么",
        "原型包含战士、射手和法师，以及城镇、关卡、战斗、装备和本地存档。这里的视频录自独立测试存档中的实际运行。"
      ],
      [
        "下一步的实验",
        "希望给 NPC 的对话加入轻量 AI，让交流多一点变化。这是后续目标，目前展示的是已有游戏系统，不包含已落地的 AI NPC。"
      ],
      [
        "制作说明",
        "这是基于既有游戏研究与素材持续修改的个人实验。代码与素材来源说明以仓库为准；这里着重展示我自己的产品探索与迭代。"
      ]
    ],
    "mediaNote": "真实运行录像 · 原型测试存档 · 无 AI NPC 功能演示",
    "repo": "https://github.com/haidarkhanuk3344-collab/brave-journey",
    "availability": "从仓库获取运行说明"
  },
  {
    "id": "world-tree",
    "title": "世界树",
    "english": "World Tree",
    "kind": "个人提示词库",
    "year": "04",
    "color": "#a7b989",
    "status": "个人工具 · 持续生长",
    "image": "/chess-assets/projects/world-tree.png",
    "lead": "让积累的提示词，长在一棵树上。",
    "description": "把个人提示词库变成一棵可以探索的树：每颗果实都是一个入口，找到、打开，再把需要的提示词带走。",
    "sections": [
      [
        "一个不同的入口",
        "提示词既是工具，也是长期积累的创作材料。我尝试用树与果实来承载它们，让整理和查找也带一点探索感。"
      ],
      [
        "当前功能",
        "支持提示词的查找、编辑、复制、删除与撤销；可以转动树、调整视角。数据保存在本地浏览器中。"
      ]
    ],
    "mediaNote": "实际运行截图 · 独立浏览器数据",
    "repo": "https://github.com/haidarkhanuk3344-collab/world-tree",
    "availability": "从仓库获取运行说明"
  },
  {
    "id": "hualuobo",
    "title": "花萝卜",
    "english": "Hualuobo",
    "kind": "桌面上的小生命",
    "year": "05",
    "color": "#cfb9a7",
    "status": "桌宠实验 · 测试版本",
    "image": "/chess-assets/projects/cat.png",
    "lead": "忙的时候，桌面也有一点小动静。",
    "description": "一只黑白桌面猫。用逐帧动作与鼠标互动，让电脑桌面多一点陪伴感，也多一点意料之外的趣味。",
    "sections": [
      [
        "关注的体验",
        "让一只小猫在桌面里走动、回应鼠标，并探索与桌面图标的互动。它不需要成为一个复杂的助手，有自己的小动作就很好。"
      ],
      [
        "当前状态",
        "已有桌宠动作与交互实验，以及 Windows 测试发行版。真实 Windows 环境的安装与完整交互效果仍需进一步验证。"
      ]
    ],
    "mediaNote": "项目角色素材 · 非桌面运行截图",
    "repo": "https://github.com/haidarkhanuk3344-collab/hualuobo",
    "download": "https://github.com/haidarkhanuk3344-collab/hualuobo/releases",
    "availability": "查看测试版与安装说明"
  }
];
