---
title: "从零开始搭建 Jekyll 博客"
lang: zh-CN
translation_key: getting-started-with-jekyll
permalink: /zh/posts/getting-started-with-jekyll/
date: 2026-03-10
description: "使用 Jekyll 和 GitHub Pages 搭建个人博客的入门指南。"
tags: ["Jekyll", "GitHub Pages"]
section: "指南"
---

![终端截图示例]({{ '/assets/images/posts/placeholder.png' | relative_url }})

## 什么是 Jekyll？

Jekyll 是一个用 Ruby 编写的静态网站生成器。它将 Markdown 文件、HTML 模板
和一些配置转换成完整的静态网站，可以托管在 GitHub Pages 等平台上。

## 为什么选择静态网站？

静态网站有几个特点：

- **速度快**：每个页面都是预先生成的 HTML 文件。
- **托管简单**：没有数据库，不需要维护应用服务器。
- **方便管理版本**：文章和代码一起保存在 Git 中。
- **容易迁移**：最终生成的只是一些文件。

## 快速开始

安装 Jekyll，然后创建一个新网站：

```bash
gem install bundler jekyll
jekyll new my-blog
cd my-blog
bundle exec jekyll serve
```

在浏览器中打开 [http://localhost:4000](http://localhost:4000)，就能看到网站。

## 项目结构

一个典型的 Jekyll 项目大致如下：

```text
my-blog/
├── _config.yml      # 网站配置
├── _layouts/        # HTML 布局模板
├── _includes/       # 可复用的页面片段
├── _posts/          # Markdown 文章
├── _sass/           # Sass 样式文件
├── assets/          # CSS、JavaScript 和图片
└── index.html       # 首页
```

> `_posts` 是存放文章的目录。放入一个名为 `YYYY-MM-DD-title.md` 的 Markdown
> 文件，添加文件开头的配置，Jekyll 就会把它生成一篇博客文章。

## 添加图片

把图片放在 `assets/images/posts/` 中，然后在文章里用标准 Markdown 语法引用：

```markdown
![图片说明]({% raw %}{{ "/assets/images/posts/your-file.png" | relative_url }}{% endraw %})
```

图片会显示在正文中，带有圆角，最大宽度不会超过文章区域：

![文章图片位置示意]({{ '/assets/images/posts/placeholder.svg' | relative_url }})

### 让文字环绕图片

在图片后加上 `{:.float-right}` 或 `{:.float-left}`，即可让文字环绕图片。
这是 kramdown 为元素添加 CSS 类的语法：

```markdown
![图片说明](/assets/images/posts/your-file.png){:.float-right}
```

![侧边图片示例]({{ '/assets/images/posts/side-placeholder.svg' | relative_url }}){:.float-right}

这段文字会环绕右侧的图片。对于比正文栏窄的头像、图示和截图，浮动布局能让同一屏
容纳更多文字。在桌面上，图片最大占正文宽度的一半；在窄屏手机上，它会回到普通的
独立排列方式，避免影响阅读。后续标题和分隔线会自动清除浮动。
把类名改成 `{:.float-left}`，就能让图片显示在左侧。

## 接下来可以做什么？

掌握基础后，可以继续了解内容集合、自定义插件，以及如何用 `git push`
把网站部署到 GitHub Pages。
