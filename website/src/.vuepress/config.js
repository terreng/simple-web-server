import { description } from '../../package.json'
import { defaultTheme } from '@vuepress/theme-default'
import { backToTopPlugin } from '@vuepress/plugin-back-to-top'
import { mediumZoomPlugin } from '@vuepress/plugin-medium-zoom'
import { searchPlugin } from '@vuepress/plugin-search'

export default {
  title: 'Simple Web Server',
  description: description,
  head: [
    ['meta', { name: 'theme-color', content: '#d09608' }],
    ['meta', { name: 'msapplication-TileColor', content: '#d09608' }],
    ['link', { rel: 'manifest', href: '/site.webmanifest' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }],
    ['link', { rel: 'shortcut icon', href: '/favicon.ico' }],
    ['meta', { name: 'keywords', content: 'Simple Web Server,web server,Web Server for Chrome,local web server,200 ok,server' }],
    ['script', { type: 'module', src: '/ms-store-badge.bundled.js' }]
  ],
  locales: {
    '/': {
      lang: 'en-US',
      title: 'Simple Web Server',
      description: 'Create local web servers in just a few clicks with an easy-to-use interface.'
    },
    '/zh-CN/': {
      lang: 'zh-CN',
      description: '简单易用! 只需几次点击就可以部署本地 Web 服务器。'
    },
    '/ru/': {
      lang: 'ru',
      description: 'Создавайте локальный веб-сервер в несколько кликов с помощью простого интерфейса.'
    },
    '/ja/': {
      lang: 'ja',
      description: '簡単UIでほんの数クリックだけでローカルウェブサーバーを作れます。'
    }
  },
  theme: defaultTheme({
    locales: {
      '/': {
        selectLanguageName: 'English',
        selectText: 'Language',
        navbar: [
          {
            text: 'Download',
            link: '/download.html',
          },
          {
            text: 'Documentation',
            link: '/docs/options.html'
          }
        ],
        sidebar: {
          '/docs/': [
            {
              title: 'Configuration',
              collapsable: false,
              children: [
                'options',
                'settings',
              ]
            },
            {
              title: 'Guides',
              collapsable: false,
              children: [
                'config file',
                'https',
                'logs',
                'build',
                'wsc'
              ]
            },
            {
              title: 'Plugins',
              collapsable: false,
              children: [
                'plugins',
                'plugin manifest file',
                'plugin script'
              ]
            },
            {
              title: 'Advanced Guides',
              collapsable: false,
              children: [
                'swsaccess',
                'custom scripts',
                'custom request handler',
              ]
            }
          ]
        }
      },
      '/zh-CN/': {
        selectLanguageName: '简体中文',
        selectText: '语言',
        navbar: [
          {
            text: '下载',
            link: '/zh-CN/download.html',
          },
          {
            text: '文档',
            link: '/zh-CN/docs/options.html'
          }
        ],
        sidebar: {
          '/zh-CN/docs/': [
            {
              title: '配置',
              collapsable: false,
              children: [
                'options',
                'settings',
              ]
            },
            {
              title: '指南',
              collapsable: false,
              children: [
                'config file',
                'https',
                'logs',
                'build',
                'wsc'
              ]
            },
            {
              title: '插件',
              collapsable: false,
              children: [
                'plugins',
                'plugin manifest file',
                'plugin script'
              ]
            },
            {
              title: '高级指南',
              collapsable: false,
              children: [
                'swsaccess',
                'custom scripts',
                'custom request handler',
              ]
            }
          ],
        }
      },
      '/ru/': {
        selectLanguageName: 'Русский',
        selectText: 'Язык',
        navbar: [
          {
            text: 'Скачать',
            link: '/download.html',
          },
          {
            text: 'Документация',
            link: '/docs/options.html'
          }
        ],
        sidebar: {
          '/docs/': [
            {
              title: 'Configuration',
              collapsable: false,
              children: [
                'options',
                'settings',
              ]
            },
            {
              title: 'Guides',
              collapsable: false,
              children: [
                'config file',
                'https',
                'logs',
                'build',
                'wsc'
              ]
            },
            {
              title: 'Plugins',
              collapsable: false,
              children: [
                'plugins',
                'plugin manifest file',
                'plugin script'
              ]
            },
            {
              title: 'Advanced Guides',
              collapsable: false,
              children: [
                'swsaccess',
                'custom scripts',
                'custom request handler',
              ]
            }
          ]
        }
      },
      '/ja/': {
        selectLanguageName: '日本',
        selectText: '言語',
        navbar: [
          {
            text: 'Download',
            link: '/download.html',
          },
          {
            text: 'Documentation',
            link: '/docs/options.html'
          }
        ],
        sidebar: {
          '/docs/': [
            {
              title: 'Configuration',
              collapsable: false,
              children: [
                'options',
                'settings',
              ]
            },
            {
              title: 'Guides',
              collapsable: false,
              children: [
                'config file',
                'https',
                'logs',
                'build',
                'wsc'
              ]
            },
            {
              title: 'Plugins',
              collapsable: false,
              children: [
                'plugins',
                'plugin manifest file',
                'plugin script'
              ]
            },
            {
              title: 'Advanced Guides',
              collapsable: false,
              children: [
                'swsaccess',
                'custom scripts',
                'custom request handler',
              ]
            }
          ]
        }
      },
    },
    logo: '/favicon.ico',
    accentColor: '#d09608',
    repo: 'https://github.com/terreng/simple-web-server',
    repoLabel: 'GitHub',
    editLink: true,
    smoothScroll: true,
    contributors: false,
    docsDir: 'website/src',
    editLinkText: 'Edit this page on GitHub',
    lastUpdated: false,
  }),
  plugins: [
    backToTopPlugin(),
    mediumZoomPlugin(),
    searchPlugin({
      maxSuggestions: 10,
      isSearchable: (page) => page.path !== '/',
      getExtraFields: (page) => page.frontmatter.tags ?? [],
      locales: {
        '/': {
          placeholder: 'Search',
        }
      }
    })
  ]
}
